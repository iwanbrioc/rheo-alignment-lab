import React from "react";
import { Alert, Text } from "react-native";
import { Button, Card, styles } from "../ui";
import type { useMeshSync } from "./useMeshSync";
export function SyncPanel({
  sync,
  onError,
}: {
  sync: ReturnType<typeof useMeshSync>;
  onError: (error: unknown) => void;
}) {
  return (
    <Card>
      <Text style={styles.h3}>Share with nearby phones</Text>
      <Text style={styles.body}>
        When enabled, nearby Rheo phones exchange public places, resources,
        connections and activities directly. They keep copies and can carry them
        to others later. No internet service or separate Bitchat app is needed.
      </Text>
      <Text accessibilityLiveRegion="polite" style={styles.body}>
        {sync.message}
      </Text>
      <Text style={styles.small}>
        {sync.status.active ? "Radio active" : "Radio paused"} ·{" "}
        {sync.status.bluetoothLinks} Bluetooth links · {sync.status.wifiPeers}{" "}
        local network peers · {sync.records.length} stored updates
      </Text>
      {!sync.available && (
        <Text style={styles.body}>
          This build has no embedded iPhone radio module. Install the new native
          iPhone build; Android radio support is not included yet.
        </Text>
      )}
      <Button
        disabled={!sync.available || !sync.ready}
        label={sync.enabled ? "Stop nearby sharing" : "Join nearby mesh"}
        onPress={() => {
          if (sync.enabled) {
            void sync.stop().catch(onError);
            return;
          }
          Alert.alert(
            "Join the nearby data mesh?",
            "Records marked shareable, including their coordinates and steward labels, become readable by nearby peers and may be carried onwards. Private portals, My Path and your current GPS position stay on this phone. Received records remain unverified. Keep Rheo open for exchanges; iOS can pause it in the background.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Join mesh",
                onPress: () => {
                  void sync.start().catch(onError);
                },
              },
            ],
          );
        }}
      />
      <Button
        secondary
        label="Stop and clear retained relay records"
        onPress={() =>
          Alert.alert(
            "Clear this phone’s relay copies?",
            "Your map stays on this phone. Copies already passed to other phones cannot be recalled.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Clear relay copies",
                style: "destructive",
                onPress: () => {
                  void sync.clear().catch(onError);
                },
              },
            ],
          )
        }
      />
      <Text style={styles.small}>
        Keep Rheo open on nearby phones. Public updates may be carried onward
        for up to seven days. Receiving a record does not verify it.
      </Text>
      {sync.records.some((r) => r.status === "held") && (
        <Button
          secondary
          label="Retry held records"
          onPress={() => {
            void sync.retryHeld().catch(onError);
          }}
        />
      )}
      {sync.records
        .filter((r) => r.status === "held")
        .map((record) => (
          <React.Fragment key={record.id}>
            <Text style={styles.h3}>Received revision held</Text>
            <Text selectable style={styles.small}>
              Publisher {record.publisher} ·{" "}
              {new Date(record.createdAt).toLocaleString()}
            </Text>
            <Text style={styles.body}>{record.reason}</Text>
            <Text selectable style={styles.small}>
              {record.payload}
            </Text>
          </React.Fragment>
        ))}
    </Card>
  );
}
