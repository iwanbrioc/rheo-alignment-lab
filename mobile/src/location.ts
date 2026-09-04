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

export async function getDecisionLocation(): Promise<DecisionLocation> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Location permission was not granted. Rheo can still work without local context.');
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  let areaLabel: string | null = null;
  try {
    const addresses = await Location.reverseGeocodeAsync({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    });
    const a = addresses[0];
    if (a) {
      areaLabel = [a.district, a.city, a.region, a.country].filter(Boolean).join(', ') || null;
    }
  } catch {
    // Reverse geocoding is useful UI context but not required for nearby search.
  }

  return {
    // Deliberately reduce precision before coordinates leave the device.
    latitude: roundNeighbourhood(current.coords.latitude),
    longitude: roundNeighbourhood(current.coords.longitude),
    accuracyM: current.coords.accuracy,
    capturedAt: new Date(current.timestamp).toISOString(),
    areaLabel,
    precision: 'neighbourhood',
  };
}
