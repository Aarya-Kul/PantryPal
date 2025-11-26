import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const ALLOWED_UNITS = [
  "grams",
  "kilograms",
  "milligrams",
  "ounces",
  "pounds",
  "milliliters",
  "liters",
  "teaspoons",
  "tablespoons",
  "fluid_ounces",
  "cups",
  "pints",
  "quarts",
  "gallons",
  "units",
];


type InventoryItem = {
  item_id: number;
  quantity_value: number;
  quantity_unit: string;
  expiry_date: string;
  // Backend returns nested item name under items(...)
  items?: { item_name: string };
  item_name?: string;
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

// Use localhost for web; change to your LAN IP if testing on device.
const API_BASE_URL = "http://127.0.0.1:8000";

export default function InventoryScreen() {
  const { token } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Use composite key item_id+expiry_date so duplicate names/dates stay distinct.
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [unitMapping, setUnitMapping] = useState<{ item_name: string; unit: string }[]>([]);


  const selectedItem = useMemo(() => {
    if (!selectedKeys.length) return undefined;
    const key = selectedKeys[0];
    return inventory.find(
      (item) => `${item.item_id}-${item.expiry_date}` === key
    );
  }, [inventory, selectedKeys]);

  const friendlyName = (item: InventoryItem) =>
    item.item_name || item.items?.item_name || "Unnamed";

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const fetchUnitMapping = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/api/get_inventory_unit_mapping`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setUnitMapping(data.mapping || []);
    }
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

  useEffect(() => {
    fetchInventory();
    fetchUnitMapping();
  }, [fetchInventory, fetchUnitMapping]);

  const openAdd = () => {
    setMode("add");
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEdit = () => {
    if (!selectedItem) {
      Alert.alert("Select an item", "Pick one item to edit.");
      return;
    }
    setMode("edit");
    setForm({
      item_name: friendlyName(selectedItem),
      quantity_value: String(selectedItem.quantity_value ?? ""),
      quantity_unit: selectedItem.quantity_unit ?? "",
      expiry_date: selectedItem.expiry_date ?? "",
    });
    setModalVisible(true);
  };

  const handleRemove = async () => {
    if (!token) {
      Alert.alert("You are not logged in", "Pleae login before proceeding");
      return;
    }
    if (!selectedKeys.length) {
      Alert.alert("Select items", "Choose at least one item to remove.");
      return;
    }
    try {
      setSaving(true);
      const items = inventory
        .filter((it) => selectedKeys.includes(`${it.item_id}-${it.expiry_date}`))
        .map((it) => ({
          item_id: it.item_id,
          expiry_date: it.expiry_date,
        }));

      const res = await fetch(`${API_BASE_URL}/api/remove_inventory_item`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    if (!token) {
      Alert.alert("You are not logged in", "Pleae login before proceeding");
      return;
    }
    if (!form.item_name || !form.quantity_value || !form.quantity_unit || !form.expiry_date) {
      Alert.alert("Missing info", "Please fill all fields.");
      return;
    }
    try {
      setSaving(true);
      if (mode === "add") {
        const res = await fetch(`${API_BASE_URL}/api/add_inventory_item`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            items: [
              {
                item_name: form.item_name.trim(),
                quantity_value: Number(form.quantity_value),
                quantity_unit: form.quantity_unit.trim(),
                expiry_date: form.expiry_date.trim(),
              },
            ],
          }),
        });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
      } else if (mode === "edit" && selectedItem) {
        const res = await fetch(`${API_BASE_URL}/api/edit_inventory_item`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            items: [
              {
                item_id: selectedItem.item_id,
                quantity_value: Number(form.quantity_value),
                quantity_unit: form.quantity_unit.trim(),
                expiry_date: form.expiry_date.trim(),
              },
            ],
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

  if (!token) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedText}>You must login to view inventory.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.subtle}>
            {inventory.length} {inventory.length === 1 ? "item" : "items"}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2BA84A" style={{ marginTop: 40 }} />
        ) : (
          inventory.map((item) => {
            const rowKey = `${item.item_id}-${item.expiry_date}`;
            const isSelected = selectedKeys.includes(rowKey);
            return (
              <Pressable
                key={rowKey}
                onPress={() => toggleSelect(rowKey)}
                style={[
                  styles.card,
                  isSelected && { borderColor: "#2BA84A", backgroundColor: "#EFF8F0" },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.itemName}>{friendlyName(item)}</Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color="#2BA84A" />
                  )}
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>
                    Qty: {item.quantity_value} {item.quantity_unit}
                  </Text>
                  <Text style={styles.meta}>Expires: {item.expiry_date}</Text>
                </View>
              </Pressable>
            );
          })
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
        disabled={!selectedKeys.length || saving}
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
                value={form.item_name}
                onChangeText={(v) => setForm((prev) => ({ ...prev, item_name: v }))}
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Quantity (e.g. 2)"
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
                inputIOS: styles.input,
                inputAndroid: styles.input,
              }}
            />
            {mode === "add" && (
              <TextInput
                style={styles.input}
                placeholder="Expiry date (YYYY-MM-DD)"
                value={form.expiry_date}
                onChangeText={(v) => setForm((prev) => ({ ...prev, expiry_date: v }))}
              />
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.outlineButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: "#0F172A" }]}>Cancel</Text>
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
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtle: {
    fontSize: 14,
    color: "#64748B",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  meta: {
    color: "#475569",
    fontSize: 13,
  },
  actionsBar: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  lockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  lockedText: { color: "#0F172A", fontSize: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    width: "100%",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#0F172A",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 14,
    backgroundColor: "#F8FAFC",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 80,
    alignItems: "center",
  },
  outlineButton: {
    backgroundColor: "#E2E8F0",
  },
  filledButton: {
    backgroundColor: "#2BA84A",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
