import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import type { Coordinate, MeshState } from "./types";
import {
  geographicConnections,
  initialRegion,
  locatedPortals,
  sampleOverlay,
} from "./geography.mjs";
import { OfflineMap } from "./OfflineMap";
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
  const samples = useMemo(() => sampleOverlay(state, position), [state, position]);
  const sampleById = new Map(samples.map(p => [p.id, p]));
  const sampleLinks = state.links.filter(l => sampleById.has(l.from) && sampleById.has(l.to));
  useEffect(() => {
    if (ready && position)
      map.current?.animateToRegion(
        { ...position, latitudeDelta: 0.035, longitudeDelta: 0.035 },
        500,
      );
  }, [position, ready]);
  if (!enabled)
    return (
      <>
      <OfflineMap state={state} position={position} onSelect={onSelect} />
      <View style={styles.card}>
        <Text style={styles.h3}>See the mycelium on a real map.</Text>
        <Text style={styles.body}>
          {Platform.OS === "ios" ? "Apple Maps" : "Google Maps"} supplies the
          basemap and can receive the area you view. Real portals use deliberately supplied coordinates. With your permission,
          fictional sample pins can be overlaid around your approximate area. Network view remains
          available offline.
        </Text>
        <Button secondary label="Use my area" onPress={onLocate} />
        <Button label="Load detailed online map" onPress={() => setEnabled(true)} />
      </View>
      </>
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
      <Button secondary label="Use offline geographic map" onPress={() => setEnabled(false)} />
      <OfflineMap state={state} position={position} onSelect={onSelect} />
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
          {samples.map(p => (
            <Marker key={p.id} coordinate={p.location}
              title={`ILLUSTRATIVE · ${p.name}`}
              description="Fictional example placed near you. No real place or access is implied."
              pinColor="#9562a8" onPress={() => onSelect(p.id)} />
          ))}
          {sampleLinks.map(l => (
            <Polyline key={`sample-${l.id}`}
              coordinates={[sampleById.get(l.from)!.location, sampleById.get(l.to)!.location]}
              strokeColor="#9562a8" strokeWidth={2} lineDashPattern={[6, 6]} />
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
      {samples.length > 0 && (
        <Text style={styles.body}>
          ILLUSTRATIVE OVERLAY · {samples.length} fictional examples around your approximate area.
          Purple pins and dashed connections are imagined possibilities, not real places or routes.
          These generated positions are not saved or shared.
        </Text>
      )}
      {!portals.length && !samples.length && (
        <Text style={styles.body}>
          No real portal locations yet. Add coordinates to a portal you know;
          use “Use my area” to preview fictional samples around you.
        </Text>
      )}
      <View style={styles.row}>
        <Button secondary label="Use my area" onPress={onLocate} />
        <Button
          secondary
          label="Fit portals"
          disabled={!(portals.length + samples.length) || !ready}
          onPress={() =>
            map.current?.fitToCoordinates(
              [...portals, ...samples].map((p) => p.location),
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
