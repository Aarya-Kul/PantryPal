import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

export default function PreferencesLayout() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const lastPage = params.from;

  const handleBack = () => {
    if (!lastPage || lastPage === "/login") router.replace("/");
    else router.replace(lastPage as any);
  };

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#050510" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
        headerLeft: () => (
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        ),
        headerTitle: "Preferences",
      }}
    />
  );
}

const styles = StyleSheet.create({
  backButton: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
