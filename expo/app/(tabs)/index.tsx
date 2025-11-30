import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/context/AuthContext";

// Use localhost for web; change to your LAN IP if testing on device.
const API_BASE_URL = "http://127.0.0.1:8000";

export default function HomeScreen() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) {
        setStats(null);
        return;
      }
      try {
        setStatsLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/get_nutrient_statistics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed to load (${res.status})`);
        }
        const data = await res.json();
        setStats(data || {});
      } catch (e: any) {
        setStatsError(e.message || "Error loading nutrient statistics");
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#2BA84A", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Nutrient Breakdown</ThemedText>

        {!token ? (
          <ThemedText>Login to view your nutrient statistics.</ThemedText>
        ) : statsLoading ? (
          <ActivityIndicator
            size="large"
            color="#2BA84A"
            style={{ marginTop: 40 }}
          />
        ) : statsError ? (
          <ThemedText>{statsError}</ThemedText>
        ) : !stats || Object.keys(stats).length === 0 ? (
          <ThemedText>
            No nutrition data available for today. Generate a recipe to get
            some!
          </ThemedText>
        ) : (
          <View style={styles.statsContainer}>
            {Object.entries(stats).map(([key, value]) => (
              <View style={styles.statRow} key={key}>
                <ThemedText style={styles.statLabel}>{key}</ThemedText>
                <ThemedText style={styles.statValue}>
                  {Math.round((value || 0) * 100)}%
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </ThemedView>
      {/* Floating action button to snap a photo/receipt */}
      <View>
        <Pressable
          onPress={() => router.push("/snap-photo")}
          style={({ pressed }) => [
            styles.fab,
            pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
          ]}
        >
          <ThemedText type="title" style={styles.fabText}>
            +
          </ThemedText>
        </Pressable>
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  statsContainer: {
    marginTop: 6,
    gap: 8,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#F1F9F8",
    marginBottom: 6,
  },
  statLabel: {
    fontWeight: "600",
  },
  statValue: {
    color: "#0F172A",
    fontWeight: "700",
  },
  reactLogo: {
    height: 250,
    width: 200,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  fab: {
    position: "fixed",
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2BA84A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2BA84A",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: {
    color: "#fff",
    fontWeight: "900",
  },
});
