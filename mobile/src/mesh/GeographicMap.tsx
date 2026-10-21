import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import type { Coordinate, MeshState } from "./types";
import {
  geographicConnections,
  initialRegion,
  locatedPortals,
} from "./geography.mjs";
import { Button, palette, styles } from "./ui";
export function GeographicMap({
  state,
  position,
  onSelect,
  onLocate,
}: {
  state: MeshState;
  position: Coordinate | null;
  onSelect: (id: string) => void;
  onLocate: () => void;
}) {
  const [enabled, setEnabled] = useState(false),
    [ready, setReady] = useState(false);
  const map = useRef<MapView>(null);
  const portals = useMemo(() => locatedPortals(state), [state]),
    lines = useMemo(() => geographicConnections(state), [state]);
  useEffect(() => {
    if (ready && position)
      map.current?.animateToRegion(
        { ...position, latitudeDelta: 0.035, longitudeDelta: 0.035 },
        500,
      );
  }, [position, ready]);
  if (!enabled)
    return (
      <View style={styles.card}>
        <Text style={styles.h3}>See the mycelium on a real map.</Text>
        <Text style={styles.body}>
          {Platform.OS === "ios" ? "Apple Maps" : "Google Maps"} supplies the
          basemap and can receive the area you view. Only portals with
          deliberately supplied coordinates appear. Network view remains
          available offline.
        </Text>
        <Button label="Load geographic map" onPress={() => setEnabled(true)} />
      </View>
    );
  if (Platform.OS === "android" && !process.env.EXPO_PUBLIC_GOOGLE_MAPS_ENABLED)
    return (
      <View style={styles.card}>
        <Text style={styles.body}>
          This Android build has no configured Google Maps key. Network view and
          portal coordinates still work. iPhone uses Apple Maps.
        </Text>
      </View>
    );
  return (
    <View style={{ marginBottom: 16 }}>
      <View
        style={{
          height: 360,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: palette.mint,
        }}
      >
        <MapView
          ref={map}
          style={{ flex: 1 }}
          initialRegion={initialRegion(portals, position)}
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          onMapReady={() => setReady(true)}
          accessibilityLabel="Geographic portal map. Lines are relationships, not routes."
        >
          {portals.map((p) => (
            <Marker
              key={p.id}
              coordinate={p.location}
              title={p.name}
              description={
                p.received
                  ? "Received information; verify with the steward"
                  : p.description
              }
              pinColor={palette.green}
              onPress={() => onSelect(p.id)}
            />
          ))}
          {lines.map((l) => (
            <Polyline
              key={l.id}
              coordinates={l.coordinates}
              strokeColor={palette.green}
              strokeWidth={3}
              geodesic
            />
          ))}
          {position && (
            <Marker
              coordinate={position}
              title="Your approximate area"
              pinColor="#4b7892"
            />
          )}
        </MapView>
      </View>
      <Text style={styles.small}>
        {portals.length} located portals · {lines.length} mapped connections.
        Lines are not walking routes or evidence of safe access.
      </Text>
      {!ready && (
        <Text style={styles.small}>
          Loading the basemap. If it stays blank, check connectivity or return
          to Network.
        </Text>
      )}
      {!portals.length && (
        <Text style={styles.body}>
          No real portal locations yet. Add coordinates to a portal you know;
          fictional samples stay off the geographic map.
        </Text>
      )}
      <View style={styles.row}>
        <Button secondary label="Use my area" onPress={onLocate} />
        <Button
          secondary
          label="Fit portals"
          disabled={!portals.length || !ready}
          onPress={() =>
            map.current?.fitToCoordinates(
              portals.map((p) => p.location),
              {
                edgePadding: { top: 50, right: 40, bottom: 50, left: 40 },
                animated: true,
              },
            )
          }
        />
      </View>
    </View>
  );
}
