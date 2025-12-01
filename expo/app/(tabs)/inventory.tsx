import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import RNPickerSelect from "react-native-picker-select";

import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "../../config/api";

const ALLOWED_UNITS = [
  "grams", "kilograms", "milligrams", "ounces", "pounds",
  "milliliters", "liters", "teaspoons", "tablespoons", "fluid_ounces",
  "cups", "pints", "quarts", "gallons", "units"
];

type InventoryItem = {
  item_id: number;
  quantity_value: number;
  quantity_unit: string;
  expiry_date: string;
  items?: { item_name: string };
  item_name?: string;
  is_leftover: boolean;
};

type FormState = {
  item_name: string;
  quantity_value: string;
  quantity_unit: string;
  expiry_date: string;
};

const emptyForm: FormState = {
  item_name: "",
  quantity_value: "",
  quantity_unit: "",
  expiry_date: "",
};

export default function InventoryScreen() {
  const { token } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLeftover, setIsLeftover] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [unitMapping, setUnitMapping] = useState<{ item_name: string; unit: string }[]>([]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const selectedItem = useMemo(() => {
    if (!selectedKeys.length) return undefined;
    const key = selectedKeys[0];
    return inventory.find((item) => `${item.item_id}-${item.expiry_date}` === key);
  }, [inventory, selectedKeys]);

  const isItemExpired = (item?: InventoryItem) => {
    if (!item || !item.expiry_date) return false;
    return item.expiry_date < todayStr;
  };

  const { expiredItems, activeItems } = useMemo(() => {
    const expired: InventoryItem[] = [];
    const active: InventoryItem[] = [];
    for (const item of inventory) {
      if (item.expiry_date && item.expiry_date < todayStr) expired.push(item);
      else active.push(item);
    }
    return { expiredItems: expired, activeItems: active };
  }, [inventory, todayStr]);

  const friendlyName = (item: InventoryItem) => item.item_name || item.items?.item_name || "Unnamed";

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const fetchUnitMapping = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/get_inventory_unit_mapping`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnitMapping(data.mapping || []);
      }
    } catch {}
  }, [token]);

  const getUnitsForItem = (name: string) => {
    const match = unitMapping.find(
      (entry) => entry.item_name.toLowerCase() === name.toLowerCase()
    );
    return match ? [match.unit] : ALLOWED_UNITS;
  };

  const fetchInventory = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/get_user_inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      setInventory(data.inventory || []);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not load inventory.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchInventory();
      fetchUnitMapping();
    }, [fetchInventory, fetchUnitMapping])
  );

  const openAdd = () => {
    setMode("add");
    setForm(emptyForm);
    setIsLeftover(false);
    setModalVisible(true);
  };

  const openEdit = () => {
    if (!selectedItem) return Alert.alert("Select an item", "Pick one item to edit.");
    if (isItemExpired(selectedItem)) return Alert.alert("Cannot edit expired items");
    setMode("edit");
    setForm({
      item_name: friendlyName(selectedItem),
      quantity_value: String(selectedItem.quantity_value ?? ""),
      quantity_unit: selectedItem.quantity_unit ?? "",
      expiry_date: selectedItem.expiry_date ?? "",
    });
    setIsLeftover(false); // always hide leftover in edit mode
    setModalVisible(true);
  };

  const handleRemove = async () => {
    if (!token) return Alert.alert("Login required");
    if (!selectedKeys.length) return Alert.alert("Select items");
    try {
      setSaving(true);
      const items = inventory
        .filter((it) => selectedKeys.includes(`${it.item_id}-${it.expiry_date}`))
        .map((it) => ({ item_id: it.item_id, expiry_date: it.expiry_date }));
      const res = await fetch(`${API_BASE_URL}/api/remove_inventory_item`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      await fetchInventory();
      setSelectedKeys([]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not remove items.");
    } finally {
      setSaving(false);
    }
  };

  const submitForm = async () => {
    if (!token) return Alert.alert("Login required");
    if (!form.item_name || !form.quantity_value || !form.quantity_unit || !form.expiry_date)
      return Alert.alert("Fill all fields");
    try {
      setSaving(true);
      if (mode === "add") {
        const res = await fetch(`${API_BASE_URL}/api/add_inventory_item`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            items: [{
              ...form,
              quantity_value: Number(form.quantity_value),
              leftover: isLeftover ?? false,
            }],            
          }),
        });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
      } else if (mode === "edit" && selectedItem) {
        const res = await fetch(`${API_BASE_URL}/api/edit_inventory_item`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            items: [{
              item_id: selectedItem.item_id,
              quantity_value: Number(form.quantity_value),
              quantity_unit: form.quantity_unit,
              expiry_date: form.expiry_date,
            }],
          }),
        });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
      }
      await fetchInventory();
      await fetchUnitMapping();
      setModalVisible(false);
      setSelectedKeys([]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not save item.");
    } finally {
      setSaving(false);
    }
  };

  const selectedIsExpired = selectedItem ? isItemExpired(selectedItem) : false;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.subtle}>
            {inventory.length} {inventory.length === 1 ? "item" : "items"}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2BA84A" style={{ marginTop: 40 }} />
        ) : (
          <>
            {expiredItems.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.sectionHeader}>Expired items</Text>
                <Text style={styles.sectionSubtle}>
                  These items are past their expiry date. Do not eat them. Safely discard and
                  try generating recipes earlier next time to use similar items before they expire.
                </Text>

                {expiredItems.map((item) => {
                  const rowKey = `${item.item_id}-${item.expiry_date}`;
                  const isSelected = selectedKeys.includes(rowKey);
                  return (
                    <Pressable
                      key={rowKey}
                      onPress={() => toggleSelect(rowKey)}
                      style={[
                        styles.card,
                        styles.expiredCard,
                        isSelected && {
                          borderColor: "#F97373",
                          backgroundColor: "#FEF2F2",
                        },
                      ]}
                    >
                      <View style={styles.cardHeader}>
                        <Text style={styles.itemName}>{friendlyName(item)}</Text>
                        <View style={{ flexDirection: "row", gap: 4 }}>
                          {item.is_leftover && (
                            <View style={styles.leftoverBadge}>
                              <Text style={styles.badgeText}>Leftover</Text>
                            </View>
                          )}
                          {item.quantity_value === 0 && (
                            <View style={[styles.badge, { backgroundColor: "#CBD5E1" }]}>
                              <Text style={[styles.badgeText, { color: "#0F172A" }]}>None available</Text>
                            </View>
                          )}
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>Expired</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={styles.meta}>
                          Qty: {item.quantity_value} {item.quantity_unit}
                        </Text>
                        <Text style={[styles.meta, { color: "#B91C1C" }]}>
                          Expired: {item.expiry_date}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {activeItems.length > 0 && (
              <View>
                <Text style={styles.sectionHeader}>In-date items</Text>
                <Text style={styles.sectionSubtle}>
                  These items are still within their listed expiry date. Always double-check
                  how they look and smell before using them.
                </Text>

                {activeItems.map((item) => {
                  const rowKey = `${item.item_id}-${item.expiry_date}`;
                  const isSelected = selectedKeys.includes(rowKey);
                  return (
                    <Pressable
                      key={rowKey}
                      onPress={() => toggleSelect(rowKey)}
                      style={[
                        styles.card,
                        isSelected && {
                          borderColor: "#2BA84A",
                          backgroundColor: "#EFF8F0",
                        },
                      ]}
                    >
                      <View style={styles.cardHeader}>
                        <Text style={styles.itemName}>{friendlyName(item)}</Text>
                        <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                          {isSelected && <Ionicons name="checkmark-circle" size={20} color="#2BA84A" />}
                          {item.is_leftover && (
                            <View style={styles.leftoverBadge}>
                              <Text style={styles.badgeText}>Leftover</Text>
                            </View>
                          )}
                          {item.quantity_value === 0 && (
                            <View style={[styles.badge, { backgroundColor: "#CBD5E1" }]}>
                              <Text style={[styles.badgeText, { color: "#0F172A" }]}>None available</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={styles.meta}>
                          Qty: {item.quantity_value} {item.quantity_unit}
                        </Text>
                        <Text style={styles.meta}>Expires: {item.expiry_date}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {!expiredItems.length && !activeItems.length && (
              <Text style={styles.sectionSubtle}>
                Your inventory is empty. Add items to start tracking.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.actionsBar}>
        <ActionButton
          label="Add"
          icon="add"
          onPress={openAdd}
          disabled={saving}
          tone="primary"
        />
        <ActionButton
          label="Edit"
          icon="create-outline"
          onPress={openEdit}
          disabled={!selectedKeys.length || saving || selectedIsExpired}
        />
        <ActionButton
          label="Remove"
          icon="trash-outline"
          onPress={handleRemove}
          disabled={!selectedKeys.length || saving}
          tone="danger"
        />
      </View>

      <Modal
        transparent
        animationType="slide"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {mode === "add" ? "Add item" : `Edit ${form.item_name || "item"}`}
            </Text>

            {mode === "add" && (
              <TextInput
                style={styles.input}
                placeholder="Item name"
                placeholderTextColor="#64748B"
                value={form.item_name}
                onChangeText={(v) => setForm((prev) => ({ ...prev, item_name: v }))}
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Quantity (e.g. 2)"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={form.quantity_value}
              onChangeText={(v) => setForm((prev) => ({ ...prev, quantity_value: v }))}
            />

            <RNPickerSelect
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, quantity_unit: value }))
              }
              placeholder={{ label: "Select unit", value: null }}
              value={form.quantity_unit}
              items={getUnitsForItem(form.item_name).map((u) => ({ label: u, value: u }))}
              style={{
                inputIOS: { ...styles.input, color: "#0F172A" },
                inputAndroid: { ...styles.input, color: "#0F172A" },
              }}
            />

            {mode === "add" && (
              <TextInput
                style={styles.input}
                placeholder="Expiry date (YYYY-MM-DD)"
                placeholderTextColor="#64748B"
                value={form.expiry_date}
                onChangeText={(v) => setForm((prev) => ({ ...prev, expiry_date: v }))}
              />
            )}

            {mode === "add" && (
              <>
                <Text style={styles.label}>Is this a leftover?</Text>
                <View style={styles.binaryContainer}>
                  <Pressable
                    style={[
                      styles.binaryOption,
                      isLeftover === true && styles.binaryOptionSelected
                    ]}
                    onPress={() => setIsLeftover(true)}
                  >
                    <Text
                      style={[
                        styles.binaryOptionText,
                        isLeftover === true && styles.binaryOptionTextSelected
                      ]}
                    >
                      Yes
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.binaryOption,
                      isLeftover === false && styles.binaryOptionSelected
                    ]}
                    onPress={() => setIsLeftover(false)}
                  >
                    <Text
                      style={[
                        styles.binaryOptionText,
                        isLeftover === false && styles.binaryOptionTextSelected
                      ]}
                    >
                      No
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.outlineButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: "#0F172A" }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.filledButton]}
                onPress={submitForm}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>
                    {mode === "add" ? "Add" : "Save"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type ActionButtonProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  tone?: "primary" | "danger" | "neutral";
};

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  icon,
  onPress,
  disabled,
  tone = "neutral",
}) => {
  const bg =
    tone === "primary" ? "#2BA84A" : tone === "danger" ? "#F43F5E" : "#E2E8F0";
  const color = tone === "primary" || tone === "danger" ? "#fff" : "#0F172A";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor: bg, opacity: disabled ? 0.6 : pressed ? 0.8 : 1 },
      ]}
    >
      <Ionicons name={icon} size={18} color={color} style={{ marginBottom: 2 }} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 80 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  subtle: { color: "#64748B" },
  sectionHeader: { fontWeight: "600", fontSize: 16, marginVertical: 8 },
  sectionSubtle: { fontSize: 12, color: "#64748B", marginBottom: 8 },
  card: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  expiredCard: { backgroundColor: "#FEF2F2", borderColor: "#F87171" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName: { fontWeight: "600", fontSize: 14 },
  leftoverBadge: { backgroundColor: "#FBBF24", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badge: { backgroundColor: "#2BA84A", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, color: "#fff" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  meta: { fontSize: 12, color: "#64748B" },
  actionsBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-around", padding: 12, backgroundColor: "#fff", borderTopWidth: 1, borderColor: "#CBD5E1" },
  actionButton: { flex: 1, marginHorizontal: 4, paddingVertical: 8, borderRadius: 12, alignItems: "center" },
  actionLabel: { fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 14,
    backgroundColor: "#E5E7EB",
    color: "#0F172A",
  },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 4 },
  binaryContainer: { flexDirection: "row", gap: 8, marginBottom: 10 },
  binaryOption: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 10 },
  binaryOptionSelected: { backgroundColor: "#2BA84A", borderColor: "#2BA84A" },
  binaryOptionText: { color: "#0F172A" },
  binaryOptionTextSelected: { color: "#fff" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12, gap: 8 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, minWidth: 80, alignItems: "center" },
  filledButton: { backgroundColor: "#2BA84A" },
  outlineButton: { backgroundColor: "#E2E8F0" },
  modalButtonText: { color: "#fff", fontWeight: "600" },
});
