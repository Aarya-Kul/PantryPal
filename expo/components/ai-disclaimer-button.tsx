// components/ai-disclaimer-button.tsx
import React, { useState } from "react";
import {
    Platform,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from "react-native";
import AiTransparencyModal from "./AiTransparencyModal";
import { headerButtonBase } from "./logout-button";

const AiTooltip: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.tooltip}>
    <Text style={styles.tooltipText}>{text}</Text>
  </View>
);

/**
 * Small "AI" button in the header that always lets the user
 * re-open the AI Transparency & Safety notice, even after
 * they already accepted it on login.
 */
export const AiDisclaimerButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);

  return (
    <View style={{ position: "relative" }}>
      {hover && Platform.OS === "web" && <AiTooltip text="AI transparency" />}

      <Pressable
        onPress={() => setOpen(true)}
        onHoverIn={() => setHover(true)}
        onHoverOut={() => setHover(false)}
        style={[
          headerButtonBase as StyleProp<ViewStyle>,
          Platform.OS === "web" ? { cursor: "pointer" } : {},
        ]}
      >
        <Text style={styles.iconText}>AI</Text>
      </Pressable>

      {/* Modal lives here; opens on demand, closes on accept */}
      <AiTransparencyModal
        visible={open}
        onAccept={() => setOpen(false)}
      />
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
  iconText: {
    color: "#e5e7eb",
    fontSize: 11,
    fontWeight: "700",
  },
});