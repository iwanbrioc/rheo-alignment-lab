import * as Location from 'expo-location';

export type DecisionLocation = {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  capturedAt: string;
  areaLabel: string | null;
  precision: 'neighbourhood';
};

const roundNeighbourhood = (value: number) => Math.round(value * 1000) / 1000;

async function withTimeout<T>(operation: Promise<T>, milliseconds: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), milliseconds);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function getDecisionLocation(signal?: AbortSignal): Promise<DecisionLocation> {
  const checkActive = () => {
    if (signal?.aborted) throw Object.assign(new Error('Location search stopped.'), { name: 'AbortError' });
  };
  checkActive();
  const permission = await Location.requestForegroundPermissionsAsync();
  checkActive();
  if (permission.status !== 'granted') {
    throw new Error('Location permission was not granted. Rheo can still work without local context.');
  }

  if (!await Location.hasServicesEnabledAsync()) {
    throw new Error('Location services are off. Turn them on or continue without local context.');
  }
  checkActive();

  const current = await withTimeout(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    20_000,
    'Your location was not available in time. Try again or continue without local context.',
  );
  checkActive();
  const latitude = roundNeighbourhood(current.coords.latitude);
  const longitude = roundNeighbourhood(current.coords.longitude);

  let areaLabel: string | null = null;
  try {
    const addresses = await withTimeout(
      Location.reverseGeocodeAsync({ latitude, longitude }),
      5_000,
      'Area name lookup timed out.',
    );
    const a = addresses[0];
    if (a) {
      areaLabel = [a.district, a.city, a.region, a.country].filter(Boolean).join(', ') || null;
    }
  } catch {
    // Reverse geocoding is useful UI context but not required for nearby search.
  }
  checkActive();

  return {
    // Deliberately reduce precision before coordinates leave the device.
    latitude,
    longitude,
    accuracyM: current.coords.accuracy,
    capturedAt: new Date(current.timestamp).toISOString(),
    areaLabel,
    precision: 'neighbourhood',
  };
}
