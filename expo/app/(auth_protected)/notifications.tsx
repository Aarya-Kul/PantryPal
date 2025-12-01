import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import { API_BASE_URL } from "../../config/api";

type ExpiringItem = {
  item_id: number;
  quantity_value: number;
  quantity_unit: string;
  expiry_date: string;
  items?: { item_name: string };
};

type NotificationResponse = {
  [key: string]: ExpiringItem[];
};

const filters = [
  { label: "Today", key: "today" },
  { label: "This week", key: "week" },
  { label: "This month", key: "month" },
];

export default function NotificationsScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<NotificationResponse>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("week");

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/get_expiring_items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const json = await res.json();
      setData(json || {});
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not load notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const grouped = useMemo(() => {
    const twoDay = data["2 days"] || [];
    const oneWeek = data["1 week"] || [];
    return [
      { title: "Expires within 2 days", items: twoDay, tag: "Urgent" },
      { title: "Expires within a week", items: oneWeek, tag: "Upcoming" },
    ];
  }, [data]);

  const filteredGroups = useMemo(() => {
    if (activeFilter === "today") {
      return grouped.map((g) => ({ ...g, items: [] }));
    }
    if (activeFilter === "month") {
      return grouped;
    }
    return grouped;
  }, [activeFilter, grouped]);

  if (!token) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedText}>You must login to view notifications.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.backRow}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.push("/")}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
          <Text style={styles.backText}>Home</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <Pressable
          onPress={() => fetchNotifications()}
          style={({ pressed }) => [styles.refresh, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="refresh" size={18} color="#0F172A" />
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => {
          const active = activeFilter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              style={[
                styles.filterPill,
                active && { backgroundColor: "#E6F4EA", borderColor: "#2BA84A" },
              ]}
            >
              <Text style={[styles.filterText, active && { color: "#146C2F" }]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchNotifications();
            }}
          />
        }
      >
        {loading && (
          <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#2BA84A" />
        )}

        {!loading &&
          filteredGroups.map((group) => (
            <View key={group.title} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{group.title}</Text>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{group.tag}</Text>
                </View>
              </View>

              {group.items.length === 0 && (
                <Text style={styles.empty}>No items in this window.</Text>
              )}

              {group.items.map((item) => (
                <View
                  key={`${group.title}-${item.item_id}-${item.expiry_date}`}
                  style={styles.card}
                >
                  <View style={styles.cardRow}>
                    <Text style={styles.itemName}>
                      {item.items?.item_name || "Unnamed"}
                    </Text>
                    <Text style={styles.badge}>Expires soon</Text>
                  </View>
                  <Text style={styles.meta}>
                    Qty: {item.quantity_value} {item.quantity_unit}
                  </Text>
                  <Text style={styles.meta}>Expiry: {item.expiry_date}</Text>
                </View>
              ))}
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 40 },

  backRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  title: { fontSize: 24, fontWeight: "700", color: "#0F172A" },
  refresh: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#fff",
  },
  refreshText: { color: "#0F172A", fontWeight: "600" },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 4,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#fff",
  },
  filterText: { color: "#334155", fontWeight: "600", fontSize: 13 },
  section: { marginTop: 12 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  tag: {
    backgroundColor: "#F5F3FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { color: "#6B21A8", fontWeight: "700", fontSize: 12 },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  itemName: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  badge: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    overflow: "hidden",
  },
  meta: { color: "#475569", fontSize: 13, marginBottom: 4 },
  empty: { paddingHorizontal: 16, color: "#94A3B8", fontSize: 13 },
  lockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  lockedText: { color: "#0F172A", fontSize: 16 },
});
