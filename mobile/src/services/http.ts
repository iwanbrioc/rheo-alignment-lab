export async function postJson<T>(baseUrl: string, path: string, body: unknown): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = (
      data
      && typeof data === 'object'
      && 'error' in data
      && typeof data.error === 'string'
    )
      ? data.error
      : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}
