// components/notifications-button.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Platform,
    Pressable, StyleSheet,
    Text,
    View
} from "react-native";
import { headerButtonBase } from "./logout-button";


const Tooltip: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.tooltip}>
    <Text style={styles.tooltipText}>{text}</Text>
  </View>
);

export const NotificationsButton: React.FC = () => {
  const [hover, setHover] = useState(false);

  return (
    <View style={{ position: "relative" }}>
      {hover && Platform.OS === "web" && <Tooltip text="Notifications" />}
      <Pressable
        onPress={() => router.push("/notifications")}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        style={[
          headerButtonBase,
          Platform.OS === "web" ? { cursor: "pointer" } : {},
        ]}
      >
        <Ionicons name="notifications-outline" size={16} color="#e5e7eb" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  tooltip: {
    position: "absolute",
    top: 38,
    left: "50%",
    transform: [{ translateX: -30 }],
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
});
