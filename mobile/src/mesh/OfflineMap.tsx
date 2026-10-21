import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import type { MeshState, Coordinate } from './types';
import { locatedPortals, sampleOverlay, initialRegion } from './geography.mjs';
import { styles, palette } from './ui';

export function OfflineMap({ state, position, onSelect }: { state: MeshState; position: Coordinate | null; onSelect: (id: string) => void }) {
  const pins = [...locatedPortals(state), ...sampleOverlay(state, position)];
  const area = initialRegion(pins, position);
  const longitudeOffset = (longitude: number) => ((longitude - area.longitude + 540) % 360) - 180;
  const xy = (point: Coordinate) => ({
    x: 470 + longitudeOffset(point.longitude) / area.longitudeDelta * 780,
    y: 280 - (point.latitude - area.latitude) / area.latitudeDelta * 450,
  });
  const byId = new Map(pins.map(p => [p.id, p]));
  return <View style={styles.card}>
    <Text style={styles.h3}>Offline geographic mesh</Text>
    <Text style={styles.small}>North ↑ · saved positions and relationships · no street tiles needed</Text>
    <Svg viewBox="0 0 940 560" width="100%" height={280} accessibilityLabel="Offline geographic map of saved portals. North is up; lines are relationships, not travel routes.">
      {[0, 1, 2, 3, 4].map(i => <React.Fragment key={i}>
        <Line x1={80 + i * 195} x2={80 + i * 195} y1={40} y2={510} stroke="#d5dfce" />
        <Line x1={80} x2={860} y1={55 + i * 112} y2={55 + i * 112} stroke="#d5dfce" />
      </React.Fragment>)}
      {state.links.map(l => {
        const a = byId.get(l.from), b = byId.get(l.to);
        if (!a || !b) return null;
        const start = xy(a.location), end = xy(b.location);
        return <Line key={l.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y}
          stroke={a.demo || b.demo ? '#9562a8' : palette.green} strokeWidth={3}
          strokeDasharray={a.demo || b.demo ? '6 6' : undefined} />;
      })}
      {pins.map((p, i) => {
        const point = xy(p.location);
        return <React.Fragment key={p.id}>
          <Circle cx={point.x} cy={point.y} r={20} fill={p.demo ? '#9562a8' : palette.green}
            onPress={() => onSelect(p.id)} accessibilityLabel={`${p.demo ? 'Illustrative: ' : ''}${p.name}`} />
          <SvgText x={point.x} y={point.y + 5} fill="white" textAnchor="middle" fontSize={15} onPress={() => onSelect(p.id)}>{i + 1}</SvgText>
        </React.Fragment>;
      })}
    </Svg>
    {!pins.length && <Text style={styles.body}>Saved geographic portals will appear here even without an internet connection. No locations have been supplied yet.</Text>}
    <Text style={styles.small}>Centre {area.latitude.toFixed(3)}, {area.longitude.toFixed(3)} · geographic schematic; axes are scaled to fit. Lines do not show safe access or walking routes. Purple pins are fictional examples.</Text>
    {pins.map((p, i) => <Text key={p.id} style={styles.small} onPress={() => onSelect(p.id)} accessibilityRole="button">{i + 1}. {p.demo ? 'Illustrative · ' : ''}{p.name}</Text>)}
  </View>;
}
