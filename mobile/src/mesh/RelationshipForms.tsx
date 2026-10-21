import React, { useState } from "react";
import { Text, View } from "react-native";
import type { MeshState, SessionInput } from "./types";
import { Button, Choice, Field, styles } from "./ui";
export function ConnectionForm({
  state,
  onSave,
  busy,
}: {
  state: MeshState;
  onSave: (from: string, to: string, relation: string) => Promise<void>;
  busy: boolean;
}) {
  const [from, setFrom] = useState(state.portals[0]?.id || ""),
    [to, setTo] = useState(state.portals[1]?.id || ""),
    [relation, setRelation] = useState(""),
    [error, setError] = useState("");
  return (
    <>
      <Text style={styles.h2}>Grow a connection</Text>
      <Text style={styles.body}>
        Describe a relationship you know about. A line is not a trust
        endorsement or a travel route.
      </Text>
      <Text style={styles.label}>From portal</Text>
      <View style={styles.row}>
        {state.portals.map((p) => (
          <Choice
            key={p.id}
            label={p.name}
            selected={from === p.id}
            onPress={() => setFrom(p.id)}
          />
        ))}
      </View>
      <Text style={styles.label}>To portal</Text>
      <View style={styles.row}>
        {state.portals
          .filter((p) => p.id !== from)
          .map((p) => (
            <Choice
              key={p.id}
              label={p.name}
              selected={to === p.id}
              onPress={() => setTo(p.id)}
            />
          ))}
      </View>
      <Field
        label="What flows between them?"
        value={relation}
        onChangeText={setRelation}
        maxLength={110}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        disabled={busy || state.portals.length < 2}
        label="Save connection"
        onPress={() => {
          void onSave(from, to, relation.trim()).catch((e) =>
            setError(e instanceof Error ? e.message : String(e)),
          );
        }}
      />
    </>
  );
}
export function SessionForm({
  state,
  onSave,
  busy,
}: {
  state: MeshState;
  onSave: (input: SessionInput) => Promise<void>;
  busy: boolean;
}) {
  const [portalId, setPortalId] = useState(state.portals[0]?.id || ""),
    [title, setTitle] = useState(""),
    [start, setStart] = useState("10:00"),
    [end, setEnd] = useState("11:00"),
    [space, setSpace] = useState(""),
    [description, setDescription] = useState(""),
    [error, setError] = useState("");
  return (
    <>
      <Text style={styles.h2}>Propose an activity</Text>
      <Text style={styles.label}>At which portal?</Text>
      <View style={styles.row}>
        {state.portals.map((p) => (
          <Choice
            key={p.id}
            label={p.name}
            selected={portalId === p.id}
            onPress={() => setPortalId(p.id)}
          />
        ))}
      </View>
      <Field
        label="Activity title"
        value={title}
        onChangeText={setTitle}
        maxLength={100}
      />
      <Field
        label="Start (24-hour HH:00 or HH:30)"
        value={start}
        onChangeText={setStart}
        maxLength={5}
      />
      <Field
        label="End (24-hour HH:00 or HH:30)"
        value={end}
        onChangeText={setEnd}
        maxLength={5}
      />
      <Field
        label="Space / host location"
        value={space}
        onChangeText={setSpace}
        maxLength={70}
      />
      <Field
        label="Invitation (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={250}
      />
      <Text style={styles.small}>
        This records an invitation on your local programme. It does not reserve
        a venue, notify anyone or confirm access.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        disabled={busy || !state.portals.length}
        label="Add to the matrix"
        onPress={() => {
          void onSave({
            portalId,
            title: title.trim(),
            start,
            end,
            space: space.trim(),
            description: description.trim(),
          }).catch((e) => setError(e instanceof Error ? e.message : String(e)));
        }}
      />
    </>
  );
}
