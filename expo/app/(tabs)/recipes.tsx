// app/(tabs)/recipes.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = "http://127.0.0.1:8000"; // change if needed

type Ingredient = {
  item_id: number;
  item_name: string;
  expiry_date: string;
  quantity_value: number;
  quantity_unit: string;
};

export type Recipe = {   // export so we can reuse this type in detail screen if we want
  name: string;
  description: string;
  cuisines: string[];
  macronutrient_preferences: string[];
  dietary_restrictions: string[];
  steps: string[];
  ingredients: Ingredient[];
  why_this_recipe: string;
  expiry_priority_stars?: number;
  preference_match_percent?: number;
  min_days_to_expiry?: number | null;
};

type UserPreferences = {
  cuisine_preferences: string[];
  dietary_restrictions: string[];
  macronutrient_preferences: string[];
};

const StarRating: React.FC<{ rating?: number }> = ({ rating }) => {
  const safeRating = rating ?? 0;
  const fullStars = Math.floor(safeRating);
  const hasHalf = safeRating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  const stars = [];

  for (let i = 0; i < fullStars; i++)
    stars.push(
      <Ionicons key={`f-${i}`} name="star" size={16} style={styles.star} />
    );
  if (hasHalf)
    stars.push(
      <Ionicons key="half" name="star-half" size={16} style={styles.star} />
    );
  for (let i = 0; i < emptyStars; i++)
    stars.push(
      <Ionicons key={`e-${i}`} name="star-outline" size={16} style={styles.star} />
    );

  return <View style={styles.starRow}>{stars}</View>;
};

const Chip = ({ label }: { label: string }) => (
  <View style={styles.chip}>
    <Text style={styles.chipText}>{label}</Text>
  </View>
);

const RecipesScreen: React.FC = () => {
  const { token } = useAuth(); // <<< we use auth context
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  // load user preferences on mount
  const fetchPreferences = useCallback(async () => {
    if (!token) return;

    try {
      setLoadingPrefs(true);
      const res = await fetch(`${API_BASE_URL}/api/get_preferences`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(`failed (${res.status})`);
      const data: UserPreferences = await res.json();
      setPrefs(data);
    } catch (err) {
      Alert.alert("Error", "Could not load user preferences.");
    } finally {
      setLoadingPrefs(false);
    }
  }, [token]);

  // generate recipes
  const generateRecipes = useCallback(async () => {
    if (!token) {
      Alert.alert("Not logged in", "You must login first.");
      return;
    }

    try {
      setLoadingRecipes(true);
      const res = await fetch(`${API_BASE_URL}/api/get_recipes`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get recipes");
      }

      const data = await res.json();
      setRecipes(data.recipes);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoadingRecipes(false);
    }
  }, [token]);

  const handleOpenRecipe = (recipe: Recipe) => {
    router.push({
      pathname: "/Recipe",
      params: {
        recipe: JSON.stringify(recipe), // pass recipe data as a route param
      },
    });
  };

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // If no token → block the page
  if (!token) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockedText}>You must login to view recipes.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Recipes</Text>
      </View> */}

      {/* PREFS CARD */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Preferences</Text>
        {loadingPrefs && <ActivityIndicator color="#fff" />}

        {prefs && (
          <>
            <Text style={styles.sectionLabel}>Cuisines</Text>
            <View style={styles.chipRow}>
              {prefs.cuisine_preferences?.map((c) => (
                <Chip key={c} label={c} />
              ))}
            </View>

            <Text style={styles.sectionLabel}>Dietary Restrictions</Text>
            <View style={styles.chipRow}>
              {prefs.dietary_restrictions?.map((d) => (
                <Chip key={d} label={d} />
              ))}
            </View>

            <Text style={styles.sectionLabel}>Macronutrients</Text>
            <View style={styles.chipRow}>
              {prefs.macronutrient_preferences?.map((m) => (
                <Chip key={m} label={m} />
              ))}
            </View>
          </>
        )}
      </View>

      {/* GENERATE BUTTON */}
      <Pressable
        onPress={generateRecipes}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}
      >
        {loadingRecipes ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Generate from my inventory</Text>
        )}
      </Pressable>

      {/* RECIPE SUMMARY CARDS */}
      {recipes.map((recipe, idx) => (
        <Pressable
          key={idx}
          style={({ pressed }) => [
            styles.card,
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
          onPress={() => handleOpenRecipe(recipe)}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{recipe.name}</Text>
            <Text style={styles.matchText}>
              {recipe.preference_match_percent ?? 0}% match
            </Text>
          </View>

          <Text style={styles.description}>{recipe.description}</Text>

          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>Expiry Priority</Text>
              <StarRating rating={recipe.expiry_priority_stars} />
            </View>
            {recipe.min_days_to_expiry != null && (
              <View>
                <Text style={styles.metaLabel}>Soonest Expiry</Text>
                <Text style={styles.metaValue}>
                  {recipe.min_days_to_expiry} days
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionLabel}>Why this recipe?</Text>
          <Text style={styles.whyText}>{recipe.why_this_recipe}</Text>

          <Text style={styles.sectionLabel}>Cuisines</Text>
          <View style={styles.chipRow}>
            {recipe.cuisines?.map((c) => (
              <Chip key={c} label={c} />
            ))}
          </View>

          <Text style={styles.sectionLabel}>Dietary Restrictions</Text>
          <View style={styles.chipRow}>
            {recipe.dietary_restrictions?.map((d) => (
              <Chip key={d} label={d} />
            ))}
          </View>

          <Text style={styles.sectionLabel}>Macronutrients</Text>
          <View style={styles.chipRow}>
            {recipe.macronutrient_preferences?.map((m) => (
              <Chip key={m} label={m} />
            ))}
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
};

export default RecipesScreen;

// styles unchanged...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0B0F" },
  content: { padding: 16 },
  lockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0B0F",
  },
  lockedText: { color: "#fff", fontSize: 16 },

  headerRow: { flexDirection: "row", marginBottom: 16 },
  screenTitle: { fontSize: 24, fontWeight: "600", color: "#fff" },

  card: {
    backgroundColor: "#12121A",
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1E1E2C",
  },

  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  cardTitle: { fontSize: 18, fontWeight: "600", color: "#fff" },
  sectionLabel: {
    marginTop: 10,
    marginBottom: 4,
    fontSize: 12,
    textTransform: "uppercase",
    color: "#AAAACB",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#1E1E2C",
  },
  chipText: { color: "#E3E3FF", fontSize: 12 },
  description: { color: "#D5D5F0", marginBottom: 6 },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  metaLabel: { fontSize: 12, color: "#A0A0C0" },
  metaValue: { color: "#fff", fontSize: 14 },

  starRow: { flexDirection: "row" },
  star: { color: "#FACC15", marginRight: 2 },

  listItem: { color: "#E4E4FF", marginBottom: 2 },
  whyText: { color: "#B9B9D8", marginTop: 4 },

  button: {
    marginBottom: 14,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: "#4F46E5",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  matchText: { fontSize: 12, color: "#A5B4FC" },
});
