import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../../context/AuthContext";

type PreferenceItem = { id: number; name: string };
type PreferenceCategory = "macronutrients" | "cuisines" | "dietary_restrictions";
type PreferenceOptions = Record<PreferenceCategory, PreferenceItem[]>;
type SelectedPrefs = Record<PreferenceCategory, string[]>;

export default function PreferencesScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<PreferenceOptions | null>(null);
  const [selected, setSelected] = useState<SelectedPrefs>({
    macronutrients: [],
    cuisines: [],
    dietary_restrictions: [],
  });

  // Map category + name → id for API calls
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
        // fetch options
        const resOptions = await fetch("http://127.0.0.1:8000/api/preference_options", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dataOptions: PreferenceOptions = await resOptions.json();
        setOptions(dataOptions);

        // create name → id mapping
        const map: typeof nameToId = {
          macronutrients: {},
          cuisines: {},
          dietary_restrictions: {},
        };
        (Object.entries(dataOptions) as [PreferenceCategory, PreferenceItem[]][]).forEach(
          ([category, items]) => {
            items.forEach((item) => (map[category][item.name] = item.id));
          }
        );
        setNameToId(map);

        // fetch existing user preferences
        const resExisting = await fetch("http://127.0.0.1:8000/api/get_preferences", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resExisting.ok) {
          const existingPrefs = await resExisting.json();
          setSelected({
            macronutrients: existingPrefs.macronutrient_preferences || [],
            cuisines: existingPrefs.cuisine_preferences || [],
            dietary_restrictions: existingPrefs.dietary_restrictions || [],
          });
        }
      } catch (err) {
        console.error("Failed to load preferences", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const toggle = (category: PreferenceCategory, name: string) => {
    setSelected((prev) => {
      const arr = prev[category];
      return arr.includes(name)
        ? { ...prev, [category]: arr.filter((x) => x !== name) }
        : { ...prev, [category]: [...arr, name] };
    });
  };

  const save = async () => {
    try {
      // Convert selected names → ids for API
      const selectedIds: Record<PreferenceCategory, number[]> = {
        macronutrients: selected.macronutrients.map((name) => nameToId.macronutrients[name]),
        cuisines: selected.cuisines.map((name) => nameToId.cuisines[name]),
        dietary_restrictions: selected.dietary_restrictions.map((name) => nameToId.dietary_restrictions[name]),
      };

      const response = await fetch("http://127.0.0.1:8000/api/set_preferences", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedIds),
      });

      const data = await response.json();
      console.log("Selected (names):", selected);
      console.log("Selected (ids sent to API):", selectedIds);
      console.log("Response:", data);

      if (!lastPage || lastPage === "/login") router.replace("/");
      else router.replace(lastPage as any);
    } catch (err) {
      console.error("Failed to save preferences", err);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#fff" />;
  if (!options) return <Text style={{ color: "#fff" }}>No options available.</Text>;

  return (
    <ScrollView style={styles.container}>
      {(Object.entries(options) as [PreferenceCategory, PreferenceItem[]][]).map(
        ([category, items]) => (
          <View key={category}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <View style={styles.chipContainer}>
              {items.map((item) => {
                const active = selected[category]?.includes(item.name);
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggle(category, item.name)}
                  >
                    <Text style={styles.chipText}>{item.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )
      )}

      <Pressable style={styles.saveButton} onPress={save}>
        <Text style={styles.saveText}>Save and Continue</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#050510", flex: 1 },
  categoryTitle: { color: "#a5b4fc", marginTop: 16, marginBottom: 6, fontSize: 16 },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: "#374151" },
  chipActive: { backgroundColor: "#4f46e5" },
  chipText: { color: "#fff" },
  saveButton: { backgroundColor: "#4f46e5", paddingVertical: 12, borderRadius: 10, marginTop: 20, alignItems: "center" },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
