import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";

import { HelloWave } from "@/components/hello-wave";
import { useAuth } from "@/context/AuthContext";

// Use localhost for web; change to your LAN IP if testing on device.
const API_BASE_URL = "http://127.0.0.1:8000";

export default function HomeScreen() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [expiringCount, setExpiringCount] = useState<number | null>(null);
  const [expiringLoading, setExpiringLoading] = useState(false);
  const [expiringError, setExpiringError] = useState<string | null>(null);

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
    const fetchExpiring = async () => {
      if (!token) {
        setExpiringCount(null);
        return;
      }
      try {
        setExpiringLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/get_expiring_items`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(`Failed (${res.status})`);
        }
        const data = await res.json();
        // data expected to be { "1 week": [...], "2 days": [...] }
        const count = Object.values(data || {}).reduce(
          (sum: number, arr: any) => {
            if (Array.isArray(arr)) return sum + arr.length;
            return sum;
          },
          0
        );
        setExpiringCount(count);
      } catch (e: any) {
        setExpiringError(e.message || "Error loading expiring items");
      } finally {
        setExpiringLoading(false);
      }
    };

    fetchExpiring();
  }, [token]);

  function pluralize(count: number, singular: string, plural: string) {
    return count === 1 ? singular : plural;
  }

  return (
    <>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Link to notifications showing a compact nutrient summary */}
          <View style={styles.stepContainer}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Welcome!</Text>
              <HelloWave />
            </View>
            <Pressable
              onPress={() => router.push("/notifications")}
              style={({ pressed }) => [
                styles.notificationsRow,
                pressed && { opacity: 0.85 },
              ]}
            >
              {expiringLoading ? (
                <ActivityIndicator color="#2BA84A" />
              ) : expiringError ? (
                <Text style={styles.itemName}>View notifications</Text>
              ) : expiringCount && expiringCount > 0 ? (
                <View style={styles.notificationsContent}>
                  <Text style={styles.itemName}>
                    You have {expiringCount} expired{" "}
                    {pluralize(expiringCount, "item", "items")}{" "}
                  </Text>
                  <Text style={styles.subtle}>Tap to view details. Don&apos;t worry, these won&apos;t be used to curate recipes. Please remove these items from the inventory or add in a new item with an updated expiration date.</Text>
                </View>
              ) : (
                <View style={styles.notificationsContent}>
                  <Text style={styles.itemName}>You have no expired items</Text>
                </View>
              )}
            </Pressable>
          </View>
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Nutrient Breakdown</Text>

            {!token ? (
              <Text>Login to view your nutrient statistics.</Text>
            ) : statsLoading ? (
              <ActivityIndicator
                size="large"
                color="#2BA84A"
                style={{ marginTop: 40 }}
              />
            ) : statsError ? (
              <Text>{statsError}</Text>
            ) : !stats || Object.keys(stats).length === 0 ? (
              <Text>
                No nutrition data available for today. Generate a recipe to get
                some!
              </Text>
            ) : (
              <View style={styles.statsContainer}>
                {Object.entries(stats).map(([key, value]) => (
                  <View style={styles.statRow} key={key}>
                    <Text style={styles.itemName}>{key}</Text>
                    {value < 1 ? (
                      <Text style={styles.subtle}>
                        {Math.round(value * 100)}%
                      </Text>
                    ) : (
                      <Text style={styles.subtle}>{value}g</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
          {/* Floating action button to snap a photo/receipt */}
          <View>
            <Pressable
              onPress={() => router.push("/snap-photo")}
              style={({ pressed }) => [
                styles.fabHidden,
                pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
              ]}
            >
              <Text style={styles.fabText}>+</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
      <View>
        <Pressable
          onPress={() => router.push("/snap-photo")}
          style={({ pressed }) => [
            styles.fab,
            pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
          ]}
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  subtle: {
    fontSize: 14,
    color: "#64748B",
  },
  container: {
    backgroundColor: "#F8FAFC",
    color: "#0F172A",
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
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
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 6,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  notificationsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFE0",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 6,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  reactLogo: {
    height: 250,
    width: 200,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  fabHidden: {
    opacity: 0,
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
  fab: {
    position: "absolute",
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
    fontSize: 36,
  },
  notificationsContent: {
    gap: 6,
  },
});
