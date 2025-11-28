// components/header-buttons.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useAuth } from "../context/AuthContext";

// Shared button style
export const headerButtonBase: StyleProp<ViewStyle> = {
  width: 34,
  height: 34,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "#9ca3af",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 12,
};

const Tooltip: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.tooltip}>
    <Text style={styles.tooltipText}>{text}</Text>
  </View>
);

export const PreferencesButton: React.FC = () => {
  const [hover, setHover] = useState(false);

  return (
    <View style={{ position: "relative" }}>
      {hover && Platform.OS === "web" && <Tooltip text="Preferences" />}
      <Pressable
        onPress={() => router.push("/onboarding/preferences")}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        style={[headerButtonBase, Platform.OS === "web" ? { cursor: "pointer" } : {}]}
      >
        <Ionicons name="settings-outline" size={16} color="#e5e7eb" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  tooltip: {
    position: "absolute",
    top: 38, // button height (34) + small margin
    left: "50%",
    transform: [{ translateX: -17 }], // half of button width
    backgroundColor: "#111",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    zIndex: 50,
  },
  tooltipText: {
    color: "#fff",
    fontSize: 10,
  },
  logoutText: {
    color: "#e5e7eb",
    fontSize: 14,
    fontWeight: "600",
  },
});
