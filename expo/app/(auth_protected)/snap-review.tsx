import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import RNPickerSelect from "react-native-picker-select";

import { useAuth } from "@/context/AuthContext";

type ItemDraft = {
  item_name: string;
  quantity_value: string;
  quantity_unit: string;
  expiry_date: string;
};

const API_BASE_URL = "http://127.0.0.1:8000";
const ALLOWED_UNITS = [
  "grams",
  "kilograms",
  "milligrams",
  "ounces",
  "pounds",
  "milliliters",
  "liters",
  "teaspoons",
  "tablespoons",
  "fluid_ounces",
  "cups",
  "pints",
  "quarts",
  "gallons",
  "units",
];

export default function SnapReviewScreen() {
  const { photo } = useLocalSearchParams<{ photo?: string }>();
  const { token } = useAuth();
  const [items, setItems] = useState<ItemDraft[]>([
    { item_name: "", quantity_value: "", quantity_unit: "", expiry_date: "" },
  ]);
  const [saving, setSaving] = useState(false);
   const [extracting, setExtracting] = useState(false);

  const updateItem = (index: number, field: keyof ItemDraft, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // Upload the photo to backend OCR and prefill items
  useEffect(() => {
    const extract = async () => {
      if (!photo) return;
      try {
        setExtracting(true);

        const rawName = photo.split("/").pop() || "receipt";
        const fileName = rawName.match(/\.(jpg|jpeg|png)$/i)
          ? rawName
          : `${rawName}.jpg`;
        const form = new FormData();

        if (Platform.OS === "web") {
          const response = await fetch(photo);
          const blob = await response.blob();
          const contentType =
            blob.type && blob.type !== "application/octet-stream"
              ? blob.type
              : "image/jpeg";
          const typedBlob = blob.type === contentType ? blob : new Blob([blob], { type: contentType });
          form.append("data", typedBlob, fileName);
        } else {
          form.append("data", {
            uri: photo,
            name: fileName,
            type: "image/jpeg",
          } as any);
        }

        const res = await fetch(`${API_BASE_URL}/api/upload_receipt`, {
          method: "POST",
          headers: {
            // no explicit content-type; let fetch set multipart boundary
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: form,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed (${res.status})`);
        }

        const data = await res.json();
        // Expecting { pantry: [...], fridge: [...] } with item fields
        const merged = [...(data.pantry || []), ...(data.fridge || [])].map(
          (it: any) => ({
            item_name: it.name || it.item_name || "",
            quantity_value: String(it.quantity_value ?? ""),
            quantity_unit: it.quantity_unit || "",
            expiry_date: it.expiry_date || "",
          })
        );

        if (merged.length) setItems(merged);
      } catch (err: any) {
        console.warn("Receipt OCR failed", err);
        // Keep manual entry as fallback
      } finally {
        setExtracting(false);
      }
    };

    extract();
  }, [photo, token]);

  const handleSave = async () => {
    if (!token) {
      Alert.alert("Login required", "Please login to save inventory.");
      return;
    }

    for (const item of items) {
      if (!item.item_name || !item.quantity_value || !item.quantity_unit || !item.expiry_date) {
        Alert.alert("Missing info", "Fill all fields before saving.");
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        items: items.map((item) => ({
          item_name: item.item_name.trim(),
          quantity_value: Number(item.quantity_value),
          quantity_unit: item.quantity_unit.trim(),
          expiry_date: item.expiry_date.trim(),
        })),
      };

      const res = await fetch(`${API_BASE_URL}/api/add_inventory_item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed (${res.status})`);
      }

      setItems([]);
      router.push("/(tabs)/inventory");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not save items.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </Pressable>
          <Text style={styles.title}>Review items</Text>
          <View style={{ width: 30 }} />
        </View>

        {photo && (
          <View style={styles.preview}>
            <Image source={{ uri: photo }} style={styles.previewImage} />
          </View>
        )}

        <Text style={styles.sectionLabel}>Items detected</Text>
        {extracting && (
          <View style={styles.banner}>
            <ActivityIndicator color="#0F172A" />
            <Text style={styles.bannerText}>Scanning receipt...</Text>
          </View>
        )}

        {items.map((item, idx) => (
          <View key={idx} style={styles.card}>
            <Text style={styles.cardTitle}>Item {idx + 1}</Text>
            <TextInput
              style={styles.input}
              placeholder="Item name"
              value={item.item_name}
              onChangeText={(v) => updateItem(idx, "item_name", v)}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.half]}
                placeholder="Quantity"
                keyboardType="numeric"
                value={item.quantity_value}
                onChangeText={(v) => updateItem(idx, "quantity_value", v)}
              />
              <View style={[styles.input, styles.half, { paddingVertical: 0 }]}>
                <RNPickerSelect
                  onValueChange={(value) => updateItem(idx, "quantity_unit", value || "")}
                  placeholder={{ label: "Select unit", value: null }}
                  value={item.quantity_unit}
                  items={ALLOWED_UNITS.map((u) => ({ label: u, value: u }))}
                  style={{
                    inputIOS: styles.pickerInput,
                    inputAndroid: styles.pickerInput,
                  }}
                />
              </View>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Expiry date (YYYY-MM-DD)"
              value={item.expiry_date}
              onChangeText={(v) => updateItem(idx, "expiry_date", v)}
            />
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
            (!items.length || saving) && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={!items.length || saving}
        >
          <Text style={styles.saveText}>
            {saving ? "Saving..." : items.length ? "Save all to inventory" : "No items to save"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

  const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 20, paddingBottom: 32 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  iconButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
  preview: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    marginBottom: 16,
    height: 220,
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 8 },
  row: { flexDirection: "row", gap: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 14,
    backgroundColor: "#F8FAFC",
  },
  half: { flex: 1 },
  saveButton: {
    backgroundColor: "#2BA84A",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#2BA84A",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    marginBottom: 10,
  },
  bannerText: { color: "#0F172A", fontWeight: "600" },
  pickerInput: {
    fontSize: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    color: "#0F172A",
  },
});
