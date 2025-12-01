import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { API_BASE_URL } from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";

type PreferenceItem = { id: number; name: string };
type PreferenceCategory = "macronutrients" | "cuisines" | "dietary_restrictions";
type PreferenceOptions = Record<PreferenceCategory, PreferenceItem[]>;

type SelectedPrefs = {
  macronutrients: string[];
  cuisines: string[];
  dietary_restrictions: string[];
};

export default function PreferencesScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [options, setOptions] = useState<PreferenceOptions | null>(null);
  const [selected, setSelected] = useState<SelectedPrefs>({
    macronutrients: [],
    cuisines: [],
    dietary_restrictions: [],
  });

  const [goals, setGoals] = useState<Record<string, string>>({});
  const [nameToId, setNameToId] = useState<Record<PreferenceCategory, Record<string, number>>>({
    macronutrients: {},
    cuisines: {},
    dietary_restrictions: {},
  });

  const params = useLocalSearchParams<{ from?: string }>();
  const lastPage = params.from;

  useEffect(() => {
    (async () => {
      try {
        const resOptions = await fetch(`${API_BASE_URL}/api/preference_options`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dataOptions = await resOptions.json();
        setOptions(dataOptions);

        const map: typeof nameToId = { macronutrients: {}, cuisines: {}, dietary_restrictions: {} };
        (Object.entries(dataOptions) as [PreferenceCategory, PreferenceItem[]][])
          .forEach(([category, items]) => items.forEach(item => (map[category][item.name] = item.id)));
        setNameToId(map);

        const resExisting = await fetch(`${API_BASE_URL}/api/get_preferences`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resExisting.ok) {
          const existing = await resExisting.json();
          setSelected({
            macronutrients: existing.macronutrient_preferences?.map((m: any) => m.name) || [],
            cuisines: existing.cuisine_preferences || [],
            dietary_restrictions: existing.dietary_restrictions || [],
          });
          const goalInit: Record<string, string> = {};
          (existing.macronutrient_preferences || []).forEach((m: any) => {
            goalInit[m.name] = String(m.goal ?? 0);
          });
          setGoals(goalInit);
        }
      } catch (err) {
        console.error("Failed to load preferences", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const toggle = (category: PreferenceCategory, name: string) => {
    setSelected(prev => {
      const arr = prev[category];
      if (arr.includes(name)) {
        if (category === "macronutrients") {
          const newGoals = { ...goals };
          delete newGoals[name];
          setGoals(newGoals);
        }
        return { ...prev, [category]: arr.filter(x => x !== name) };
      }
      if (category === "macronutrients") setGoals(g => ({ ...g, [name]: "0" }));
      return { ...prev, [category]: [...arr, name] };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const macronutrientPayload = selected.macronutrients.map(name => ({
        id: nameToId.macronutrients[name],
        goal: Number(goals[name] ?? "0"),
      }));
      const payload = {
        macronutrients: macronutrientPayload,
        cuisines: selected.cuisines.map(n => nameToId.cuisines[n]),
        dietary_restrictions: selected.dietary_restrictions.map(n => nameToId.dietary_restrictions[n]),
      };
      const res = await fetch(`${API_BASE_URL}/api/set_preferences`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await res.json();
      if (!lastPage || lastPage === "/login") router.replace("/");
      else router.replace(lastPage as any);
    } catch (err) {
      console.error("Failed to save preferences", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#fff" style={{ marginTop: 50 }} />;
  if (!options) return <Text style={{ color: "#fff" }}>No options available.</Text>;

  return (
    <ScrollView style={styles.container}>
      {(Object.entries(options) as [PreferenceCategory, PreferenceItem[]][]).map(([category, items]) => (
        <View key={category} style={styles.card}>
          <Text style={styles.categoryTitle}>{category}</Text>

          {category === "macronutrients" ? (
            items.map(item => {
              const active = selected.macronutrients.includes(item.name);
              return (
                <View key={item.id} style={styles.macroRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && { transform: [{ scale: 0.95 }] },
                    ]}
                    onPress={() => toggle(category, item.name)}
                  >
                    <Text style={styles.chipText}>{item.name}</Text>
                  </Pressable>

                  {active && (
                    <View style={styles.goalContainer}>
                      <Text style={styles.goalLabel}>Enter your daily goal (in grams):</Text>
                      <TextInput
                        style={styles.goalInput}
                        placeholder="0"
                        placeholderTextColor="#aaa"
                        keyboardType="numeric"
                        value={goals[item.name]}
                        onChangeText={text => setGoals(g => ({ ...g, [item.name]: text }))}
                      />
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.chipContainer}>
              {items.map(item => {
                const active = selected[category]?.includes(item.name);
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && { transform: [{ scale: 0.95 }] },
                    ]}
                    onPress={() => toggle(category, item.name)}
                  >
                    <Text style={styles.chipText}>{item.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ))}

      <Pressable
        style={[styles.saveButton, saving && { opacity: 0.6 }]}
        onPress={save}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save and Continue</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#050510", flex: 1 },
  card: { marginBottom: 16, padding: 12, backgroundColor: "#111122", borderRadius: 12 },
  categoryTitle: { color: "#a5b4fc", marginBottom: 12, fontSize: 16, fontWeight: "600" },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  macroRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 12 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
    height: 40,
  },
  chipActive: { backgroundColor: "#4f46e5" },
  chipText: { color: "#fff", textAlign: "center" },
  goalContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
  goalLabel: { color: "#fff", fontSize: 14, flexShrink: 1 },
  goalInput: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4f46e5",
    color: "white",
    width: 80,
    textAlign: "center",
  },
  saveButton: { backgroundColor: "#4f46e5", paddingVertical: 12, borderRadius: 10, marginTop: 20, alignItems: "center" },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
