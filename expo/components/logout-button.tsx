// components/logout-button.tsx
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useAuth } from "../context/AuthContext";

export const LogoutButton: React.FC = () => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    // Once token is cleared, your RootNavigator will show login.
    // This makes sure the UI jumps there immediately.
    router.replace("/login");
  };

  return (
    <Pressable style={styles.button} onPress={handleLogout}>
      <Text style={styles.text}>Log out</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    marginRight: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#9ca3af",
  },
  text: {
    color: "#e5e7eb",
    fontSize: 12,
    fontWeight: "500",
  },
});