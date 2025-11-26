import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

type PreferenceItem = {
  id: number;
  name: string;
};

type PreferenceCategory = "macronutrients" | "cuisines" | "dietary_restrictions";

type PreferenceOptions = Record<PreferenceCategory, PreferenceItem[]>;
type SelectedPrefs = Record<PreferenceCategory, number[]>;


export default function PreferencesScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<PreferenceOptions | null>(null);
  const [selected, setSelected] = useState<SelectedPrefs>({
    macronutrients: [],
    cuisines: [],
    dietary_restrictions: [],
  });


  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/preference_options", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data: PreferenceOptions = await res.json();
        console.log("pref options: ", data)
        setOptions(data);
      } catch (err) {
        console.error("Failed to load preference options", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);


  const toggle = (category: PreferenceCategory, id: number) => {
    setSelected((prev) => {
      const arr = prev[category];
      return arr.includes(id)
        ? { ...prev, [category]: arr.filter((x) => x !== id) }
        : { ...prev, [category]: [...arr, id] };
    });
  };


  const save = async () => {
    try {
        console.log(JSON.stringify(selected));
        await fetch("http://127.0.0.1:8000/api/add_preferences", {
            method: "POST",
            headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            },
            body: JSON.stringify(selected),
        });
      router.replace("/");
    } catch (err) {
      console.error("Failed to save preferences", err);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#fff" />;

  if (!options) return <Text style={{ color: "#fff" }}>No options available.</Text>;

  // ----------------------
  // Render
  // ----------------------
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Select Your Preferences</Text>

      {(Object.entries(options) as [PreferenceCategory, PreferenceItem[]][]).map(
        ([category, items]) => (
          <View key={category}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <View style={styles.chipContainer}>
              {items.map((item) => {
                const active = selected[category].includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggle(category, item.id)}
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

// ----------------------
// Styles
// ----------------------
const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#050510", flex: 1 },
  title: { fontSize: 24, color: "#fff", fontWeight: "700", marginBottom: 20 },
  categoryTitle: { color: "#a5b4fc", marginTop: 16, marginBottom: 6, fontSize: 16 },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#374151",
  },
  chipActive: { backgroundColor: "#4f46e5" },
  chipText: { color: "#fff" },
  saveButton: {
    backgroundColor: "#4f46e5",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
