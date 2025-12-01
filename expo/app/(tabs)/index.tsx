import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { HelloWave } from "@/components/hello-wave";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "../../config/api";

// Use localhost for web; change to your LAN IP if testing on device.

export default function HomeScreen() {
  const { token } = useAuth();

  // --- State ---
  const [stats, setStats] = useState<Record<string, { value: number; goal: number | null }> | null>(null);
  const [expiredCount, setExpiredCount] = useState<number | null>(null);
  const [expiringCount, setExpiringCount] = useState<number | null>(null);
  const [expiredLoading, setExpiredLoading] = useState(false);
  const [expiredError, setExpiredError] = useState(false);
  const [expiringLoading, setExpiringLoading] = useState(false);
  const [expiringError, setExpiringError] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  function pluralize(count: number, singular: string, plural: string) {
    return count === 1 ? singular : plural;
  }

  // --- Fetch stats ---
  const refreshStats = useCallback(async () => {
    if (!token) return;

    setStatsLoading(true);
    setExpiredLoading(true);
    setExpiringLoading(true);

    try {
      const resStats = await fetch(`${API_BASE_URL}/api/get_nutrient_statistics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resStats.ok) throw new Error("Failed to fetch stats");
      const statsData = await resStats.json();
      setStats(statsData);

      const resInv = await fetch(`${API_BASE_URL}/api/get_user_inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resInv.ok) throw new Error("Failed to fetch inventory");
      const inv = (await resInv.json())?.inventory || [];
      const todayStr = new Date().toISOString().slice(0, 10);
      setExpiredCount(inv.filter((i: any) => i.expiry_date < todayStr).length);

      const resExp = await fetch(`${API_BASE_URL}/api/get_expiring_items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resExp.ok) throw new Error("Failed to fetch expiring items");
      const data = await resExp.json();
      const count = Object.values(data).reduce(
        (sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0),
        0
      );
      setExpiringCount(count);
    } catch (err) {
      console.error(err);
      setStatsError("Failed to load stats");
      setExpiredError(true);
      setExpiringError(true);
    } finally {
      setStatsLoading(false);
      setExpiredLoading(false);
      setExpiringLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      refreshStats();
    }, [refreshStats])
  );

  // --- Render ---
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Top section: welcome + notifications */}
        <View style={styles.stepContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              Welcome!
            </Text>
            <HelloWave />
          </View>

          {/* Expired items card */}
          {token &&
            (expiredLoading ||
              expiredError ||
              (expiredCount !== null && expiredCount > 0)) && (
              <Pressable
                onPress={() => router.push("/inventory")}
                style={({ pressed }) => [
                  styles.expiredNotificationsRow,
                  pressed && { opacity: 0.85 },
                ]}
              >
                {expiredLoading ? (
                  <ActivityIndicator color="#B91C1C" />
                ) : expiredError ? (
                  <Text style={styles.itemName}>
                    View expired items in your inventory
                  </Text>
                ) : expiredCount !== null && expiredCount > 0 ? (
                  <View style={styles.notificationsContent}>
                    <Text style={styles.itemName}>
                      You have {expiredCount} expired{" "}
                      {pluralize(expiredCount, "item", "items")}
                    </Text>
                    <Text style={styles.subtle}>
                      These items are past their expiry date. Do not eat them. Tap
                      to open your inventory, safely discard them, and try generating
                      recipes earlier next time.
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            )}

          {/* Soon-to-expire card */}
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
                  You have {expiringCount} soon expiring{" "}
                  {pluralize(expiringCount, "item", "items")}
                </Text>
                <Text style={styles.subtle}>
                  Tap to view details. Please remove or update these items in the inventory.
                </Text>
              </View>
            ) : (
              <View style={styles.notificationsContent}>
                <Text style={styles.itemName}>You have no expired items</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Nutrient breakdown */}
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Nutrient Breakdown</Text>
          {!token ? (
            <Text>Login to view your nutrient statistics.</Text>
          ) : statsLoading ? (
            <ActivityIndicator size="large" color="#2BA84A" style={{ marginTop: 40 }} />
          ) : statsError ? (
            <Text>{statsError}</Text>
          ) : !stats || Object.keys(stats).length === 0 ? (
            <Text>No nutrition data available for today. Generate a recipe to get some!</Text>
          ) : (
            <View style={styles.statsContainer}>
              {Object.entries(stats || {}).map(([key, data]) => {
                const goal = data.goal;
                const value = data.value;

                const displayText =
                  goal == null
                    ? `Your accumulated total is ${value} grams.`
                    : `You are at ${Math.round((value) * 100)}% of your daily goal of ${goal} grams.`;

                return (
                  <View style={styles.statRow} key={key}>
                    <Text style={styles.itemName}>{key}</Text>
                    <Text style={styles.subtle}>{displayText}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Hidden FAB spacer */}
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

      {/* FAB */}
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
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700", color: "#0F172A" },
  itemName: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
  subtle: { fontSize: 14, color: "#64748B" },
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 160 },
  titleContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepContainer: { gap: 8, marginBottom: 8 },
  statsContainer: { marginTop: 6, gap: 8 },
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
  expiredNotificationsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: 14,
    marginBottom: 6,
    shadowColor: "#B91C1C",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  notificationsContent: { gap: 6 },
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
    bottom: 30,
  },
  fabText: { color: "#fff", fontSize: 36 },
});
