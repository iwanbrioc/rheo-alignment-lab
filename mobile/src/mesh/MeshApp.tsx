import "./runtime";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import type { Coordinate, MeshState, Portal } from "./types";
import { categories } from "./types";
import {
  connect,
  editPortal,
  newPortal,
  portalConnections,
  proposeSession,
  togglePath,
} from "./model.mjs";
import { mergeMesh, sharedMesh } from "./exchange.mjs";
import {
  makePortalToken,
  parsePortalToken,
  mergeReceivedPortal,
} from "./bitchat-carrier.mjs";
import { emptyMesh, loadMesh, sampleState, saveMesh } from "./storage";
import { pickMesh, shareMesh } from "./fileExchange";
import { Button, Card, Choice, Field, palette, styles } from "./ui";
import { Mycelium } from "./Mycelium";
import { GeographicMap } from "./GeographicMap";
import { Matrix } from "./Matrix";
import { PortalForm } from "./PortalForm";
import { ConnectionForm, SessionForm } from "./RelationshipForms";

type Tab = "mycelium" | "portals" | "matrix" | "exchange";
type Form = "portal" | "connection" | "session" | null;
export default function MeshApp() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <Contents />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
function Contents() {
  const [state, setState] = useState<MeshState | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState<Tab>("mycelium"),
    [form, setForm] = useState<Form>(null),
    [editing, setEditing] = useState<Portal | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [mode, setMode] = useState<"network" | "map">("network"),
    [position, setPosition] = useState<Coordinate | null>(null),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState<string>("All"),
    [tokenInput, setTokenInput] = useState("");
  const current = useRef<MeshState | null>(null),
    locked = useRef(false),
    locating = useRef(false);
  const load = useCallback(async () => {
    setError("");
    try {
      const next = await loadMesh();
      current.current = next;
      setState(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  function notify(e: unknown) {
    setMessage(e instanceof Error ? e.message : String(e));
  }
  async function commit(update: (current: MeshState) => MeshState) {
    if (locked.current) throw new Error("Please wait for the current save.");
    if (!current.current) throw new Error("The saved map is not available.");
    locked.current = true;
    setBusy(true);
    try {
      const next = update(current.current);
      await saveMesh(next);
      current.current = next;
      setState(next);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function locate(): Promise<Coordinate | null> {
    if (locating.current) return null;
    locating.current = true;
    setMessage("Requesting foreground location…");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        throw new Error(
          "Location permission was not granted. You can continue without it or enter a portal’s coordinates yourself.",
        );
      const result = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(
                  "No location fix arrived. Try again or enter coordinates manually.",
                ),
              ),
            15000,
          );
        }),
      ]);
      const p = {
        latitude: Math.round(result.coords.latitude * 1000) / 1000,
        longitude: Math.round(result.coords.longitude * 1000) / 1000,
      };
      setPosition(p);
      setMessage(
        "Your approximate location is on this device only. It is not attached to a portal unless you save it there.",
      );
      return p;
    } catch (e) {
      notify(e);
      return null;
    } finally {
      if (timer) clearTimeout(timer);
      locating.current = false;
    }
  }
  async function replaceWithSample() {
    await commit(() => sampleState());
    setMessage(
      "Illustrative sample loaded. All starting portals and activities are fictional.",
    );
  }
  function sample() {
    if (state?.portals.length)
      Alert.alert(
        "Replace this local mesh with the sample?",
        "Your current portals and My Path would be replaced. Make a private backup first if you need them. Older Rheo decision notes are unaffected.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Load sample",
            onPress: () => {
              void replaceWithSample().catch(notify);
            },
          },
        ],
      );
    else void replaceWithSample().catch(notify);
  }
  async function importFile() {
    if (busy) return;
    setBusy(true);
    try {
      const incoming = await pickMesh();
      if (!incoming) return;
      setBusy(false);
      await commit((s) => mergeMesh(s, incoming));
      setMessage(
        "Map merged. Received claims and locations are unverified; check with the steward before relying on them. My Path was kept private.",
      );
    } catch (e) {
      notify(e);
    } finally {
      setBusy(false);
    }
  }
  async function restoreBackup() {
    try {
      const backup = await pickMesh();
      if (!backup) return;
      Alert.alert(
        "Restore your private mesh?",
        `This replaces the current mesh with ${backup.portals.length} portals and ${backup.myPath.length} chosen activities. Restore only your own trusted backup. Earlier Rheo notes are unaffected.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore backup",
            onPress: () => {
              void commit(() => backup)
                .then(() => {
                  setSelected(null);
                  setMessage("Private backup restored.");
                })
                .catch(notify);
            },
          },
        ],
      );
    } catch (e) {
      notify(e);
    }
  }
  function privateBackup() {
    Alert.alert(
      "Back up private information?",
      "This file includes private portals, exact coordinates you entered, and My Path. Share or store it only somewhere you trust.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create private backup",
          onPress: () => {
            if (state) void shareMesh(state, true).catch(notify);
          },
        },
      ],
    );
  }
  async function shareToken(portal: Portal) {
    try {
      const token = makePortalToken(portal);
      await Share.share({ message: token.text, title: "Rheo portal token" });
    } catch (e) {
      notify(e);
    }
  }
  async function receiveToken() {
    try {
      const portal = parsePortalToken(tokenInput);
      await commit((s) => mergeReceivedPortal(s, portal).state);
      setTokenInput("");
      setMessage(
        "Portal token imported as an unverified, private claim. It contains no geographic coordinates.",
      );
    } catch (e) {
      notify(e);
    }
  }
  function removePortal(portal: Portal) {
    Alert.alert(
      "Remove this portal?",
      "Its connections and activities will also be removed from this local mesh. Distributed copies cannot be erased remotely.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void commit((s) => {
              const sessions = s.sessions.filter(
                  (v) => v.portalId !== portal.id,
                ),
                ids = new Set(sessions.map((v) => v.id));
              return {
                ...s,
                portals: s.portals.filter((p) => p.id !== portal.id),
                links: s.links.filter(
                  (l) => l.from !== portal.id && l.to !== portal.id,
                ),
                sessions,
                myPath: s.myPath.filter((id) => ids.has(id)),
              };
            })
              .then(() => setSelected(null))
              .catch(notify);
          },
        },
      ],
    );
  }
  if (!state)
    return (
      <View style={styles.content}>
        {error ? (
          <>
            <Text style={styles.h2}>Your saved map needs attention</Text>
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
            <Button
              label="Try reading again"
              onPress={() => {
                void load();
              }}
            />
            <Text style={styles.small}>
              Existing data is left untouched. Older Rheo notes use a separate
              storage key.
            </Text>
          </>
        ) : (
          <>
            <ActivityIndicator color={palette.green} />
            <Text style={styles.body}>Opening your local mesh…</Text>
          </>
        )}
      </View>
    );
  const selectedPortal = state.portals.find((p) => p.id === selected);
  const visible = state.portals.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      `${p.name} ${p.description} ${p.steward}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const portalNumbers = new Map(state.portals.map((p, i) => [p.id, i + 1]));
  function portalCard(p: Portal, index: number) {
    return (
      <Pressable
        key={p.id}
        accessibilityRole="button"
        accessibilityLabel={"Inspect " + p.name}
        onPress={() => {
          setSelected(p.id);
          setTab("mycelium");
        }}
      >
        <Card
          style={selected === p.id ? { borderColor: palette.green } : undefined}
        >
          <Text style={styles.eyebrow}>
            {portalNumbers.get(p.id)} / {p.category.toUpperCase()} ·{" "}
            {p.kind.toUpperCase()}
          </Text>
          <Text style={styles.h3}>{p.name}</Text>
          <Text style={styles.body}>{p.description}</Text>
          <Text style={styles.small}>
            {p.demo
              ? "Illustrative · not a real service"
              : p.received
                ? "Received claim · unverified"
                : "Locally recorded"}{" "}
            · {p.location ? "Located" : "No geographic position"} ·{" "}
            {p.shareable ? "Shareable" : "Private"}
          </Text>
        </Card>
      </Pressable>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 13,
          borderBottomWidth: 1,
          borderColor: palette.line,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Image
          source={require("../../assets/brand/icon.png")}
          style={{ width: 36, height: 36, borderRadius: 8 }}
          accessible={false}
        />
        <Text
          style={{ fontFamily: "Georgia", fontSize: 32, color: palette.ink }}
        >
          rheo{" "}
          <Text style={{ fontFamily: "System", fontSize: 11 }}>
            MESH / V0.4
          </Text>
        </Text>
        <Text style={styles.small}>Local first · No AI</Text>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <Text style={styles.eyebrow}>A LIVING COMMONS</Text>
        <Text style={styles.title}>Possibility lives{"\n"}between us.</Text>
        <Text style={styles.body}>
          Discover portals. Grow relationships. Shape a day of learning, care
          and contribution.
        </Text>
        <View style={styles.row}>
          <Button
            label="＋ Create a portal"
            disabled={busy}
            onPress={() => {
              setEditing(null);
              setForm("portal");
            }}
          />
          <Button
            secondary
            label="Grow a connection"
            disabled={busy || state.portals.length < 2}
            onPress={() => setForm("connection")}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginVertical: 14 }}
        >
          <View style={styles.row}>
            {(
              [
                ["mycelium", "Mycelium"],
                ["portals", "Portals"],
                ["matrix", "Time / Space"],
                ["exchange", "Mesh & data"],
              ] as const
            ).map(([id, label]) => (
              <Choice
                key={id}
                label={label}
                selected={tab === id}
                onPress={() => setTab(id)}
              />
            ))}
          </View>
        </ScrollView>
        {message ? (
          <View style={styles.notice}>
            <Text accessibilityLiveRegion="polite" style={styles.body}>
              {message}
            </Text>
            <Button secondary label="Dismiss" onPress={() => setMessage("")} />
          </View>
        ) : null}
        {tab === "mycelium" && (
          <>
            <View style={[styles.row, { marginBottom: 12 }]}>
              <Choice
                label="Network"
                selected={mode === "network"}
                onPress={() => setMode("network")}
              />
              <Choice
                label="Geographic map"
                selected={mode === "map"}
                onPress={() => setMode("map")}
              />
            </View>
            {mode === "network" ? (
              <Mycelium
                state={state}
                selected={selected}
                onSelect={setSelected}
              />
            ) : (
              <GeographicMap
                state={state}
                position={position}
                onSelect={setSelected}
                onLocate={() => {
                  void locate();
                }}
              />
            )}
            {selectedPortal && (
              <Card>
                <Text style={styles.eyebrow}>
                  {selectedPortal.category} ·{" "}
                  {selectedPortal.demo ? "ILLUSTRATIVE" : "PORTAL"}
                </Text>
                <Text style={styles.h2}>{selectedPortal.name}</Text>
                <Text style={styles.body}>{selectedPortal.description}</Text>
                <Text style={styles.small}>
                  Steward: {selectedPortal.steward || "Not supplied"}
                  {selectedPortal.location
                    ? `\n${selectedPortal.location.latitude}, ${selectedPortal.location.longitude}`
                    : "\nNo geographic position supplied."}
                </Text>
                {selectedPortal.received && (
                  <Text style={styles.small}>
                    Received information does not prove source, consent,
                    accuracy or availability.
                  </Text>
                )}
                <Text style={styles.h3}>What flows here</Text>
                {portalConnections(state, selectedPortal.id).map((l) => (
                  <Text key={l.id} style={styles.body}>
                    ↔ {l.relation}
                  </Text>
                ))}
                {!portalConnections(state, selectedPortal.id).length && (
                  <Text style={styles.body}>No connections recorded yet.</Text>
                )}
                <Button
                  secondary
                  disabled={busy}
                  label={
                    selectedPortal.shareable
                      ? "Make this portal private"
                      : "Allow sharing this portal and its location"
                  }
                  onPress={() => {
                    const next = !selectedPortal.shareable;
                    const save = () => {
                      void commit((s) => ({
                        ...s,
                        portals: s.portals.map((p) =>
                          p.id === selectedPortal.id
                            ? { ...p, shareable: next }
                            : p,
                        ),
                      })).catch(notify);
                    };
                    if (next)
                      Alert.alert(
                        "Allow this portal to be shared?",
                        "The shared record includes any coordinates and steward label. Only share details you have permission to distribute.",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Allow sharing", onPress: save },
                        ],
                      );
                    else save();
                  }}
                />
                <Button
                  secondary
                  disabled={busy || !selectedPortal.shareable}
                  label="Share a Bitchat text token"
                  onPress={() => {
                    void shareToken(selectedPortal);
                  }}
                />
                <Text style={styles.small}>
                  The token omits GPS and the steward label. Choose Bitchat or
                  Copy in the share sheet if available; Rheo does not control
                  Bitchat or its Bluetooth radio.
                </Text>
                {!selectedPortal.demo && (
                  <Button
                    secondary
                    disabled={busy}
                    label="Edit portal / map position"
                    onPress={() => {
                      setEditing(selectedPortal);
                      setForm("portal");
                    }}
                  />
                )}
                <Button
                  secondary
                  disabled={busy}
                  label="Remove portal"
                  onPress={() => removePortal(selectedPortal)}
                />
                <Button
                  secondary
                  label="Close details"
                  onPress={() => setSelected(null)}
                />
              </Card>
            )}
            <Text style={styles.h2}>Within the mycelium</Text>
            {visible.slice(0, 12).map(portalCard)}
            {visible.length > 12 && (
              <Button
                secondary
                label={`View all ${visible.length} portals`}
                onPress={() => setTab("portals")}
              />
            )}
          </>
        )}
        {tab === "portals" && (
          <>
            <Text style={styles.h2}>A portal is an invitation.</Text>
            <Field
              label="Search portals"
              value={query}
              onChangeText={setQuery}
            />
            <ScrollView horizontal>
              <View style={styles.row}>
                {["All", ...categories].map((c) => (
                  <Choice
                    key={c}
                    label={c}
                    selected={category === c}
                    onPress={() => setCategory(c)}
                  />
                ))}
              </View>
            </ScrollView>
            {visible.map(portalCard)}
            {!visible.length && (
              <Text style={styles.body}>No portals match this view.</Text>
            )}
          </>
        )}
        {tab === "matrix" && (
          <Matrix
            state={state}
            onToggle={(id) => {
              void commit((s) => togglePath(s, id)).catch(notify);
            }}
            onPropose={() => setForm("session")}
          />
        )}
        {tab === "exchange" && (
          <>
            <Text style={styles.h2}>Your map travels with you.</Text>
            <Card>
              <Text style={styles.h3}>Exchange a shared mesh</Text>
              <Text style={styles.body}>
                {sharedMesh(state).portals.length} portals are marked shareable.
                Export excludes private portals, links to them, their
                activities, and your My Path.
              </Text>
              <Button
                disabled={busy}
                label="Share a map file"
                onPress={() => {
                  void shareMesh(state).catch(notify);
                }}
              />
              <Button
                disabled={busy}
                secondary
                label="Import and merge a map"
                onPress={() => {
                  void importFile();
                }}
              />
              <Text style={styles.small}>
                Use Files, AirDrop or another channel you choose. Imports never
                silently overwrite conflicting records. Received information
                remains unverified. This version does not run a background
                Bluetooth relay.
              </Text>
            </Card>
            <Card>
              <Text style={styles.h3}>Receive a text token</Text>
              <Field
                label="Paste a RHEO4 portal token"
                value={tokenInput}
                onChangeText={setTokenInput}
                multiline
                maxLength={850}
              />
              <Button
                secondary
                disabled={busy || !tokenInput.trim()}
                label="Import portal token"
                onPress={() => {
                  void receiveToken();
                }}
              />
              <Text style={styles.small}>
                A token carries a short portal description, not proof of
                identity, consent or trust. Existing conflicting records are not
                overwritten.
              </Text>
            </Card>
            <Card>
              <Text style={styles.h3}>Private notes stay yours</Text>
              <Text style={styles.body}>
                Mesh records are stored in this app’s local, unencrypted
                storage. Your earlier Rheo decision history and invitation
                access are not read or changed.
              </Text>
              <Button
                secondary
                disabled={busy}
                label="Back up my private mesh"
                onPress={privateBackup}
              />
              <Button
                secondary
                disabled={busy}
                label="Restore my private backup"
                onPress={() => {
                  void restoreBackup();
                }}
              />
              <Button
                secondary
                label="Forget my current map position"
                onPress={() => {
                  setPosition(null);
                  setMessage(
                    "Your transient map position has been removed. Coordinates deliberately saved in portals are unchanged.",
                  );
                }}
              />
            </Card>
          </>
        )}
        {!state.portals.length && (
          <Card>
            <Text style={styles.h3}>Begin where you are.</Text>
            <Text style={styles.body}>
              Add a real possibility you know, or explore a clearly fictional
              network and its time/space matrix.
            </Text>
            <Button
              secondary
              label="Explore the illustrative sample"
              onPress={sample}
            />
          </Card>
        )}
        <Text style={styles.small}>
          Trust grows through relationships and experience, not a score.
          Participation and essential help do not require a coin balance.
        </Text>
        <View style={styles.row}>
          <Button
            secondary
            disabled={busy}
            label="Load illustrative sample"
            onPress={sample}
          />
          <Button
            secondary
            disabled={busy}
            label="Erase local mesh"
            onPress={() =>
              Alert.alert(
                "Erase this local mesh?",
                "This deletes this mesh and My Path from this device. Your earlier Rheo decisions and keychain are unaffected. Back up first if needed.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Erase mesh",
                    style: "destructive",
                    onPress: () => {
                      void commit(() => emptyMesh())
                        .then(() => setSelected(null))
                        .catch(notify);
                    },
                  },
                ],
              )
            }
          />
        </View>
      </ScrollView>
      <Modal
        visible={form !== null}
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setForm(null);
        }}
      >
        <SafeAreaView style={styles.screen}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.content}
            >
              <Button
                secondary
                disabled={busy}
                label="Close"
                onPress={() => setForm(null)}
              />
              {form === "portal" && (
                <PortalForm
                  initial={editing}
                  busy={busy}
                  onLocate={locate}
                  onSave={async (input) => {
                    await commit((s) =>
                      editing
                        ? editPortal(s, editing.id, input)
                        : newPortal(s, input),
                    );
                    setForm(null);
                    setEditing(null);
                    setMessage("Portal saved on this device.");
                  }}
                />
              )}
              {form === "connection" && (
                <ConnectionForm
                  state={state}
                  busy={busy}
                  onSave={async (from, to, relation) => {
                    await commit((s) => connect(s, from, to, relation));
                    setForm(null);
                    setMessage("Connection recorded.");
                  }}
                />
              )}
              {form === "session" && (
                <SessionForm
                  state={state}
                  busy={busy}
                  onSave={async (input) => {
                    await commit((s) => proposeSession(s, input));
                    setForm(null);
                    setMessage("Activity added to the local matrix.");
                  }}
                />
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
