import React from "react";
import { View, Text } from "react-native";
import Svg, { Line, Circle, Text as SvgText } from "react-native-svg";
import type { MeshState } from "./types";
import { palette, styles } from "./ui";
export function Mycelium({
  state,
  onSelect,
  selected,
}: {
  state: MeshState;
  onSelect: (id: string) => void;
  selected: string | null;
}) {
  const byId = new Map(state.portals.map((p) => [p.id, p]));
  return (
    <View
      style={{
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#e4eddb",
        marginBottom: 16,
      }}
    >
      <Svg
        viewBox="0 0 940 620"
        width="100%"
        height={290}
        accessibilityLabel="Conceptual mycelium of portals and explicitly recorded relationships"
      >
        {state.links.map((l) => {
          const a = byId.get(l.from),
            b = byId.get(l.to);
          return a && b ? (
            <Line
              key={l.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#6b997a"
              strokeWidth={3}
              opacity={0.65}
            />
          ) : null;
        })}
        {state.portals.map((p, i) => (
          <React.Fragment key={p.id}>
            <Circle
              cx={p.x}
              cy={p.y}
              r={selected === p.id ? 27 : 20}
              fill={selected === p.id ? palette.gold : palette.green}
              stroke="white"
              strokeWidth={3}
              onPress={() => onSelect(p.id)}
              accessibilityLabel={p.name}
            />
            <SvgText
              x={p.x}
              y={p.y + 5}
              fill="white"
              fontSize={15}
              textAnchor="middle"
              onPress={() => onSelect(p.id)}
            >
              {i + 1}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
      {!state.portals.length && (
        <Text style={[styles.body, { padding: 22, textAlign: "center" }]}>
          Your first portal can open a pathway. Add a place, skill, resource or
          invitation.
        </Text>
      )}
      <Text style={[styles.small, { paddingHorizontal: 16 }]}>
        Conceptual network · connections are recorded relationships, not
        distance or trust scores.
      </Text>
    </View>
  );
}
