import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function SnapPhotoScreen() {
  const [launching, setLaunching] = useState(false);

  const handleSnap = async () => {
    if (launching) return;
    setLaunching(true);
    try {
      // On web, use the file picker since the browser camera flow is limited.
      if (Platform.OS === "web") {
        const res = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: false,
          quality: 0.7,
        });
        if (res.canceled) return;
        const uri = res.assets?.[0]?.uri;
        if (!uri) return;
        router.push({ pathname: "/snap-review", params: { photo: uri } });
        return;
      }

      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Camera access needed", "Enable camera permission to snap a photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.7,
      });

      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      router.push({
        pathname: "/snap-review",
        params: { photo: uri },
      });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not open camera.");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </Pressable>
        <Text style={styles.title}>Snap a photo</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.preview}>
        <Ionicons name="camera-outline" size={48} color="#0F172A" />
        <Text style={styles.previewText}>Scan your receipt or item</Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.snapButton,
          pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        ]}
        onPress={handleSnap}
      >
        <Ionicons name="camera" size={22} color="#fff" />
        <Text style={styles.snapText}>Snap photo</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
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
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  preview: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  previewText: {
    marginTop: 10,
    color: "#475569",
    fontSize: 14,
  },
  snapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#2BA84A",
    borderRadius: 999,
    paddingVertical: 14,
    marginBottom: 24,
    shadowColor: "#2BA84A",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  snapText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
