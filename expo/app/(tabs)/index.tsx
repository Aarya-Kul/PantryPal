import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { HelloWave } from "@/components/hello-wave";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "../../config/api";

// Use localhost for web; change to your LAN IP if testing on device.

export default function HomeScreen() {
  const { token } = useAuth();

  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [expiringCount, setExpiringCount] = useState<number | null>(null);
  const [expiringLoading, setExpiringLoading] = useState(false);
  const [expiringError, setExpiringError] = useState<string | null>(null);

  const [expiredCount, setExpiredCount] = useState<number | null>(null);
  const [expiredLoading, setExpiredLoading] = useState(false);
  const [expiredError, setExpiredError] = useState<string | null>(null);

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

    const fetchExpiredFromInventory = async () => {
      if (!token) {
        setExpiredCount(null);
        return;
      }
      try {
        setExpiredLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/get_user_inventory`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(`Failed (${res.status})`);
        }
        const data = await res.json();
        const inventory = (data && data.inventory) || [];
        const todayStr = new Date().toISOString().slice(0, 10);

        const count = inventory.reduce((sum: number, item: any) => {
          const expiry = item?.expiry_date as string | undefined;
          if (expiry && expiry < todayStr) {
            return sum + 1;
          }
          return sum;
        }, 0);

        setExpiredCount(count);
      } catch (e: any) {
        setExpiredError(e.message || "Error loading expired items");
      } finally {
        setExpiredLoading(false);
      }
    };

    fetchStats();
    fetchExpiring();
    fetchExpiredFromInventory();
  }, [token]);

  function pluralize(count: number, singular: string, plural: string) {
    return count === 1 ? singular : plural;
  }

  return (
    <>
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

            {/* NEW: Expired items card (links to inventory) */}
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
                        These items are past their expiry date. Do not eat
                        them. Tap to open your inventory, safely discard them,
                        and try generating recipes earlier next time to use
                        similar items before they expire.
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              )}

            {/* EXISTING: Soon-to-expire card (unchanged, links to notifications) */}
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
                    {pluralize(expiringCount, "item", "items")}{" "}
                  </Text>
                  <Text style={styles.subtle}>
                    Tap to view details. Don&apos;t worry, these won&apos;t be
                    used to curate recipes. Please remove these items from the
                    inventory or add in a new item with an updated expiration
                    date.
                  </Text>
                </View>
              ) : (
                <View style={styles.notificationsContent}>
                  <Text style={styles.itemName}>You have no expired items</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Nutrient breakdown section */}
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

          {/* Hidden FAB spacer so scroll area feels natural */}
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

      {/* Real floating action button */}
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
    flex: 1, // important so ScrollView gets full height and can scroll
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 16,
    paddingBottom: 160, // extra space so last stat row isn't under the FAB
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
  expiredNotificationsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FEF2F2", // matches inventory expiredCard background
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5", // matches inventory expiredCard border
    padding: 14,
    marginBottom: 6,
    shadowColor: "#B91C1C",
    shadowOpacity: 0.06,
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