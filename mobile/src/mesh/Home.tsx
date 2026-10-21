import React, { useState, useRef } from "react";
import { Text, View, Pressable, TextInput } from "react-native";
import type { MeshState, Coordinate } from "./types";
import { findPortals, needTopics } from "./discovery.mjs";
import { Button, Choice, Field, styles, palette } from "./ui";
export function Home({
  state,
  position,
  onLocate,
  onOffer,
  onSelect,
  onNearby,
}: {
  state: MeshState;
  position: Coordinate | null;
  onLocate: () => void;
  onOffer: () => void;
  onSelect: (id: string) => void;
  onNearby: () => void;
}) {
  const search = useRef<TextInput>(null);
  const [query, setQuery] = useState(""),
    [topic, setTopic] = useState<string | null>(null);
  const results = findPortals(state, { query, topic, position });
  return (
    <>
      <Text style={styles.title}>What do you need?</Text>
      <View style={[styles.row, { marginBottom: 16 }]}>
        <View style={{ flex: 1 }}>
          <Button
            label="Find what I need"
            onPress={() => search.current?.focus()}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button secondary label="Share a resource" onPress={onOffer} />
        </View>
      </View>
      <Field
        ref={search}
        label="Search resources"
        value={query}
        onChangeText={setQuery}
        placeholder="Food, a warm place, an open mic…"
        returnKeyType="search"
        maxLength={120}
      />
      <Text style={styles.label}>Essentials</Text>
      <View style={styles.row}>
        {needTopics.slice(0, 5).map((t) => (
          <Choice
            key={t.id}
            label={t.label}
            selected={topic === t.id}
            onPress={() => setTopic(topic === t.id ? null : t.id)}
          />
        ))}
      </View>
      <Text style={[styles.label, { marginTop: 14 }]}>
        Connect, create, grow
      </Text>
      <View style={styles.row}>
        {needTopics.slice(5).map((t) => (
          <Choice
            key={t.id}
            label={t.label}
            selected={topic === t.id}
            onPress={() => setTopic(topic === t.id ? null : t.id)}
          />
        ))}
      </View>
      <View style={[styles.row, { marginTop: 12 }]}>
        <Button
          secondary
          label={position ? "Update my area" : "Use my area · optional"}
          onPress={onLocate}
        />
        {(topic || query) && (
          <Button
            secondary
            label="Clear filters"
            onPress={() => {
              setTopic(null);
              setQuery("");
            }}
          />
        )}
      </View>
      <Text style={[styles.h3, { marginTop: 20 }]}>
        {results.length}{" "}
        {results.length === 1 ? "possibility" : "possibilities"} recorded
      </Text>
      <Text style={styles.small}>
        Availability and safe access are not confirmed.{" "}
        {position
          ? "Matching records show straight-line distance, not a travel route."
          : "Location is optional; your saved mesh works offline."}
      </Text>
      {results.map(({ portal: p, distance }) => (
        <Pressable
          key={p.id}
          accessibilityRole="button"
          accessibilityLabel={`Open ${p.name}${distance !== null ? `, approximately ${distance.toFixed(1)} kilometres away` : ""}`}
          onPress={() => onSelect(p.id)}
          style={[styles.card, { padding: 18 }]}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text style={[styles.h3, { flex: 1 }]}>{p.name}</Text>
            <Text
              style={{ fontSize: 24, color: palette.green }}
              accessible={false}
            >
              ›
            </Text>
          </View>
          <Text numberOfLines={2} style={styles.body}>
            {p.description}
          </Text>
          <Text style={styles.small}>
            {distance !== null
              ? `≈ ${distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`} · `
              : ""}
            {p.received
              ? "Received · unverified"
              : "Locally recorded · check with host"}
            {!p.location ? " · Location not supplied" : ""}
          </Text>
        </Pressable>
      ))}
      {!results.length && (
        <View style={styles.card}>
          <Text style={styles.h3}>
            {state.portals.some((p) => !p.demo)
              ? "No matching records yet."
              : "Start with what you know."}
          </Text>
          <Text style={styles.body}>
            No matching resources saved on this phone. Try another term, connect
            with nearby phones, or share something you know.
          </Text>
          <Button label="Connect with nearby phones" onPress={onNearby} />
          <Button secondary label="Share a resource" onPress={onOffer} />
        </View>
      )}
    </>
  );
}
