import { fetch as expoFetch } from 'expo/fetch';
import * as SecureStore from 'expo-secure-store';

export const privateBeta = process.env.EXPO_PUBLIC_RHEO_PRIVATE_BETA === 'true';
const baseUrl = process.env.EXPO_PUBLIC_RHEO_API_URL || '';
const helperUrl = process.env.EXPO_PUBLIC_LOCAL_CONTEXT_API_URL || '';
const key = 'rheo.private-beta.access.v1';
const storageOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const codePattern = /^rb1_[A-Za-z0-9_-]{43}$/;

function checkDestination(url: string) {
  const target = new URL(url);
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash
    || base.pathname !== '/' || new URL(helperUrl).origin !== base.origin
    || target.origin !== base.origin || target.username || target.password || target.hash
    || !target.pathname.startsWith('/api/')) throw new Error('The private test connection is not configured correctly.');
}

export async function hasBetaAccess(): Promise<boolean> {
  return codePattern.test(await SecureStore.getItemAsync(key, storageOptions) || '');
}

export async function removeBetaAccess(): Promise<void> {
  await SecureStore.deleteItemAsync(key, storageOptions);
}

export async function saveBetaAccess(raw: string, signal: AbortSignal): Promise<void> {
  const code = raw.trim();
  if (!codePattern.test(code)) throw new Error('Enter the full test access code you were given.');
  checkDestination(`${baseUrl}/api/beta/access`);
  const response = await expoFetch(`${baseUrl}/api/beta/access`, {
    headers: { Authorization: `Bearer ${code}` }, signal, redirect: 'error',
  });
  if (signal.aborted) throw new Error('Connection cancelled.');
  if (response.status === 401) throw new Error('This code has expired or is not valid. Ask for a new code.');
  if (!response.ok) throw new Error('Rheo could not check access. Please try again.');
  const result = await response.json();
  if (result.ok !== true || result.privateBeta !== true) throw new Error('This is not the private Rheo service.');
  if (signal.aborted) throw new Error('Connection cancelled.');
  await SecureStore.setItemAsync(key, code, storageOptions);
}

export async function authenticatedFetch(url: string, options: Parameters<typeof expoFetch>[1] = {}) {
  if (!privateBeta) return expoFetch(url, options);
  checkDestination(url);
  const code = await SecureStore.getItemAsync(key, storageOptions);
  if (options?.signal?.aborted) throw Object.assign(new Error('Request stopped.'), { name: 'AbortError' });
  if (!code || !codePattern.test(code)) throw new Error('Open Private test access to enter your access code. Your saved notes are still here.');
  const headers = new Headers(options?.headers);
  headers.set('Authorization', `Bearer ${code}`);
  const response = await expoFetch(url, { ...options, headers, redirect: 'error' });
  if (response.status === 401) throw new Error('Your test access has expired or is not valid. Open Private test access to enter a new code.');
  return response;
}
