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
    [kind, setKind] = useState<PortalInput["kind"]>(initial?.kind || "Place"),
    [steward, setSteward] = useState(initial?.steward || ""),
    [lat, setLat] = useState(
      initial?.location ? String(initial.location.latitude) : "",
    ),
    [lon, setLon] = useState(
      initial?.location ? String(initial.location.longitude) : "",
    ),
    [shareable, setShareable] = useState(false),
    [error, setError] = useState("");
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
  return (
    <>
      <Text style={styles.h2}>
        {initial ? "Edit your portal" : "Create a portal"}
      </Text>
      <Field
        label="What becomes possible?"
        value={name}
        onChangeText={setName}
        maxLength={70}
      />
      <Field
        label="Invitation, access conditions and sustaining care"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={400}
      />
      <Text style={styles.label}>Pathway</Text>
      <View style={styles.row}>
        {categories.map((c) => (
          <Choice
            key={c}
            label={c}
            selected={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </View>
      <Text style={styles.label}>Kind of portal</Text>
      <View style={styles.row}>
        {(["Place", "People", "Resource", "Activity", "Skill"] as const).map(
          (k) => (
            <Choice
              key={k}
              label={k}
              selected={kind === k}
              onPress={() => setKind(k)}
            />
          ),
        )}
      </View>
      <Field
        label="Steward / contact label (optional)"
        value={steward}
        onChangeText={setSteward}
        maxLength={70}
      />
      <Text style={styles.h3}>A real location, if appropriate</Text>
      <Text style={styles.small}>
        Leave coordinates blank for a conceptual portal. Add only a place you
        have permission to locate. Opening the geographic map shares the viewed
        area with the map provider.
      </Text>
      <Field
        label="Latitude (optional)"
        value={lat}
        onChangeText={setLat}
        keyboardType="numbers-and-punctuation"
      />
      <Field
        label="Longitude (optional)"
        value={lon}
        onChangeText={setLon}
        keyboardType="numbers-and-punctuation"
      />
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
        Device capture is rounded to about 100 metres. Enter coordinates
        manually if the portal needs a more exact position.
      </Text>
      <View style={styles.row}>
        <Switch
          accessibilityLabel="Allow sharing this portal including its location"
          value={shareable}
          onValueChange={setShareable}
        />
        <Text style={[styles.body, { flex: 1 }]}>
          Allow sharing this portal, including its location.
        </Text>
      </View>
      <Text style={styles.small}>
        New and edited portals are private by default. Distributed copies cannot
        be erased remotely.
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Button
        disabled={busy}
        label={busy ? "Saving…" : "Save portal"}
        onPress={() => {
          void submit();
        }}
      />
    </>
  );
}
