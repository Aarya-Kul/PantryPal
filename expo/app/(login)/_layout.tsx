// app/(auth)/_layout.tsx (your ProtectedLayout)
import { Redirect, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

type PrefStatus = "idle" | "checking" | "needsOnboarding" | "ready";

export default function ProtectedLayout() {
  const { token, loading } = useAuth();
  const [prefStatus, setPrefStatus] = useState<PrefStatus>("idle");

  // Whenever we get a token, check preferences once
  useEffect(() => {
    if (!token) {
      setPrefStatus("idle");
      return;
    }

    const checkPrefs = async () => {
      setPrefStatus("checking");
      try {
        const res = await fetch("http://127.0.0.1:8000/api/get_preferences", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          // If the endpoint fails, just treat it as "ready" and go to tabs
          setPrefStatus("ready");
          return;
        }

        const prefs = await res.json();

        const macroLen = prefs.macronutrient_preferences?.length ?? 0;
        const cuisineLen = prefs.cuisine_preferences?.length ?? 0;
        const dietaryLen = prefs.dietary_restrictions?.length ?? 0;

        const hasNoPrefs =
          macroLen === 0 && cuisineLen === 0 && dietaryLen === 0;

        setPrefStatus(hasNoPrefs ? "needsOnboarding" : "ready");
      } catch (e) {
        // On network error, don't block user; go to tabs
        setPrefStatus("ready");
      }
    };

    checkPrefs();
  }, [token]);

  // 1) Still restoring token from storage? Show global loading.
  if (loading || (token && (prefStatus === "idle" || prefStatus === "checking"))) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 2) Not logged in -> show auth stack (login, signup, etc.)
  if (!token) {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  // 3) Logged in and **needs onboarding**
  if (prefStatus === "needsOnboarding") {
    return <Redirect href="/onboarding/preferences" />;
  }

  // 4) Logged in and prefs are ready -> go to main app tabs
  return <Redirect href="/(tabs)" />;
}