import React, { useState } from "react";
import { Switch, Text, View } from "react-native";
import type { Coordinate, Portal, PortalInput } from "./types";
import { categories } from "./types";
import { Button, Choice, Field, styles } from "./ui";
export function PortalForm({
  onSave,
  onLocate,
  busy,
  initial,
}: {
  initial?: Portal | null;
  onSave: (input: PortalInput) => Promise<void>;
  onLocate: () => Promise<Coordinate | null>;
  busy: boolean;
}) {
  const [name, setName] = useState(initial?.name || ""),
    [description, setDescription] = useState(initial?.description || ""),
    [category, setCategory] = useState<PortalInput["category"]>(
      initial?.category || "Essentials",
    ),
    [kind, setKind] = useState<PortalInput["kind"]>(initial?.kind || "Resource"),
    [steward, setSteward] = useState(initial?.steward || ""),
    [lat, setLat] = useState(
      initial?.location ? String(initial.location.latitude) : "",
    ),
    [lon, setLon] = useState(
      initial?.location ? String(initial.location.longitude) : "",
    ),
    [shareable, setShareable] = useState(false),
    [error, setError] = useState(""),
    [advanced, setAdvanced] = useState(false);
  async function submit() {
    setError("");
    try {
      const hasLat = lat.trim() !== "",
        hasLon = lon.trim() !== "";
      if (hasLat !== hasLon)
        throw new Error(
          "Supply both latitude and longitude, or leave both blank.",
        );
      const location = hasLat
        ? { latitude: Number(lat), longitude: Number(lon) }
        : null;
      if (
        location &&
        (!Number.isFinite(location.latitude) ||
          Math.abs(location.latitude) > 90 ||
          !Number.isFinite(location.longitude) ||
          Math.abs(location.longitude) > 180)
      )
        throw new Error("Enter valid geographic coordinates.");
      await onSave({
        name: name.trim(),
        description: description.trim(),
        category,
        kind,
        steward: steward.trim(),
        shareable,
        location,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this portal.");
    }
  }
  const categoryLabels = {
    Essentials: "Everyday needs",
    Belonging: "Care & company",
    Learning: "Skills & tools",
    Creativity: "Arts & music",
    Nature: "Gardens & nature",
    Purpose: "Projects & purpose",
  };
  return (
    <>
      <Text style={styles.title}>
        {initial ? "Edit resource" : "Share a resource"}
      </Text>
      <Text style={styles.body}>
        A place, something useful, a skill or an invitation.
      </Text>
      <Field
        label="What can you offer?"
        placeholder="A warm room, shared tools, a caring circle…"
        value={name}
        onChangeText={setName}
        maxLength={70}
      />
      <Field
        label="How can someone access it?"
        placeholder="What is offered, when, any limits, and how to get in touch."
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={400}
      />
      <Text style={styles.label}>What does it support?</Text>
      <View style={styles.row}>
        {categories.map((c) => (
          <Choice
            key={c}
            label={categoryLabels[c]}
            selected={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </View>
      <Field
        label="Host or contact · optional"
        placeholder="A name, phone number or email you may share"
        value={steward}
        onChangeText={setSteward}
        maxLength={70}
      />
      <Text style={styles.h3}>Location · optional</Text>
      <Button
        secondary
        label="Use my approximate location"
        onPress={() => {
          void onLocate()
            .then((p) => {
              if (p) {
                setLat(String(p.latitude));
                setLon(String(p.longitude));
              }
            })
            .catch((e) => setError(String(e)));
        }}
      />
      <Text style={styles.small}>
        {lat && lon
          ? `${lat}, ${lon} · approximately 100 m when captured on this phone`
          : "No location attached. Add only a place you have permission to locate."}
      </Text>
      {lat && lon && (
        <Button
          secondary
          label="Remove location"
          onPress={() => {
            setLat("");
            setLon("");
          }}
        />
      )}
      <Button
        secondary
        label={
          advanced
            ? "Hide extra options"
            : "Extra options · exact location & type"
        }
        onPress={() => setAdvanced(!advanced)}
      />
      {advanced && (
        <>
          <Text style={styles.label}>Resource type</Text>
          <View style={styles.row}>
            {(
              ["Place", "People", "Resource", "Activity", "Skill"] as const
            ).map((k) => (
              <Choice
                key={k}
                label={k}
                selected={kind === k}
                onPress={() => setKind(k)}
              />
            ))}
          </View>
          <Field
            label="Latitude"
            value={lat}
            onChangeText={setLat}
            keyboardType="numbers-and-punctuation"
          />
          <Field
            label="Longitude"
            value={lon}
            onChangeText={setLon}
            keyboardType="numbers-and-punctuation"
          />
        </>
      )}
      <View style={[styles.row, { marginTop: 16 }]}>
        <Switch
          accessibilityLabel="Allow nearby sharing including location and contact"
          value={shareable}
          onValueChange={setShareable}
        />
        <Text style={[styles.body, { flex: 1 }]}>Allow nearby sharing</Text>
      </View>
      <Text style={styles.small}>
        {shareable
          ? "Location, contact and access details can be carried to other phones when you join nearby sharing. Distributed copies cannot be recalled."
          : "Saved only on this phone until you allow sharing. Editing also starts private."}
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        disabled={busy}
        label={
          busy ? "Saving…" : shareable ? "Save for sharing" : "Save privately"
        }
        onPress={() => {
          void submit();
        }}
      />
    </>
  );
}
