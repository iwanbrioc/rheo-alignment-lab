import React, { useState } from "react";
import * as Calendar from "expo-calendar/legacy";
import { calendarEvent, localDay } from "./calendarEvent.mjs";
import { ScrollView, Text, View } from "react-native";
import type { MeshState } from "./types";
import { myPathSessions, pathHasOverlap } from "./model.mjs";
import { Button, Card, Field, palette, styles } from "./ui";
export function Matrix({
  state,
  onToggle,
  onPropose,
}: {
  state: MeshState;
  onToggle: (id: string) => void;
  onPropose: () => void;
}) {
  const [day, setDay] = useState(() => localDay());
  const [calendarMessage, setCalendarMessage] = useState("");
  const [adding, setAdding] = useState(false);
  async function addToCalendar(session: MeshState["sessions"][number]) {
    if (adding) return;
    setAdding(true);
    setCalendarMessage("");
    try {
      const event = calendarEvent(session, day);
      await Calendar.createEventInCalendarAsync(event);
      setCalendarMessage(
        "Calendar editor closed. Only events you saved there are added. Changes in Rheo do not update saved calendar events.",
      );
    } catch (error) {
      setCalendarMessage(
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setAdding(false);
    }
  }
  const spaces = [...new Set(state.sessions.map((s) => s.space))];
  const toSlot = (t: string) =>
    Number(t.slice(0, 2)) * 2 + Number(t.slice(3)) / 30;
  const first = Math.min(16, ...state.sessions.map((s) => toSlot(s.start))),
    last = Math.max(36, ...state.sessions.map((s) => toSlot(s.end)));
  const times = Array.from({ length: last - first }, (_, i) => {
    const slot = first + i;
    return `${String(Math.floor(slot / 2)).padStart(2, "0")}:${slot % 2 ? "30" : "00"}`;
  });
  return (
    <>
      <Text style={styles.eyebrow}>ACTIVITIES · YOUR CHOICE</Text>
      <Text style={styles.title}>Your day.</Text>
      <Text style={styles.body}>
        Choose activities for your day. Add them to your calendar when ready. A
        saved activity is not a confirmed booking.
      </Text>
      <Button label="＋ Propose an activity" onPress={onPropose} />
      {state.sessions.length > 0 ? (
        <ScrollView horizontal style={{ marginVertical: 16 }}>
          <View>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: 140, padding: 10, color: palette.ink }}>
                Time / Space
              </Text>
              {times.map((t) => (
                <Text
                  key={t}
                  style={{ width: 100, padding: 10, color: palette.ink }}
                >
                  {t}
                </Text>
              ))}
            </View>
            {spaces.map((space) => (
              <View
                key={space}
                style={{
                  flexDirection: "row",
                  borderTopWidth: 1,
                  borderColor: palette.line,
                }}
              >
                <Text style={{ width: 140, padding: 10, color: palette.ink }}>
                  {space}
                </Text>
                {times.map((time) => {
                  const sessions = state.sessions.filter(
                    (s) => s.space === space && s.start <= time && time < s.end,
                  );
                  return (
                    <View
                      key={time}
                      style={{
                        width: 100,
                        minHeight: 80,
                        padding: 4,
                        borderLeftWidth: 1,
                        borderColor: palette.line,
                      }}
                    >
                      {sessions.map((s) => (
                        <Button
                          key={s.id}
                          secondary
                          label={`${state.myPath.includes(s.id) ? "✓ " : ""}${s.title}`}
                          onPress={() => onToggle(s.id)}
                        />
                      ))}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <Card>
          <Text style={styles.body}>
            No activities yet. Propose one when you have a portal and a place to
            gather.
          </Text>
        </Card>
      )}
      <Text style={styles.h2}>My Path</Text>
      <Field
        label="Calendar date (YYYY-MM-DD)"
        value={day}
        onChangeText={setDay}
        maxLength={10}
      />
      <Text style={styles.small}>
        Choose the date for these programme times. Add an activity through your
        phone’s calendar editor; review the date, local time and calendar before
        saving. Your existing appointments stay private. Saving again can create
        a duplicate; removing an activity here does not delete it from your
        calendar.
      </Text>
      {calendarMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          {calendarMessage}
        </Text>
      ) : null}
      {pathHasOverlap(state) && (
        <View style={styles.notice}>
          <Text style={styles.body}>
            Some chosen activities overlap. You decide whether to leave early,
            change plans or keep both possibilities open.
          </Text>
        </View>
      )}
      {myPathSessions(state).map((s) => (
        <Card key={s.id}>
          <Text style={styles.h3}>{s.title}</Text>
          <Text style={styles.body}>
            {s.start}–{s.end} · {s.space}
            {s.demo ? " · Illustrative" : ""}
          </Text>
          <Button
            secondary
            disabled={adding}
            label={s.demo ? "Preview sample in calendar" : "Add to calendar"}
            onPress={() => {
              void addToCalendar(s);
            }}
          />
          <Button
            secondary
            label="Remove from My Path"
            onPress={() => onToggle(s.id)}
          />
        </Card>
      ))}
      {!state.myPath.length && (
        <Text style={styles.body}>
          Select an activity to shape your day. My Path stays private when you
          share the mesh.
        </Text>
      )}
    </>
  );
}
