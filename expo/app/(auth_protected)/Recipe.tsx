// app/recipe.tsx
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

type Ingredient = {
  item_id: number;
  item_name: string;
  expiry_date: string;
  quantity_value: number;
  quantity_unit: string;
};

type Nutrition = {
  protein: number;
  fats: number;
  dairy: number;
  fruits: number;
  veggies: number;
  carbs: number;
};

type Recipe = {
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
  nutrition: Nutrition;
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

const RecipeDetailScreen: React.FC = () => {
  const params = useLocalSearchParams();
  const [loading, setLoading] = React.useState(false);
  const { token } = useAuth(); // <<< we use auth context
  const raw = params.recipe as string | undefined;

  if (!raw) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No recipe data provided.</Text>
      </View>
    );
  }

  let recipe: Recipe;
  try {
    recipe = JSON.parse(raw);
  } catch (e) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load recipe.</Text>
      </View>
    );
  }

  const handleCookRecipe = async () => {
    if (!token) {
      alert("You must be logged in to cook a recipe.");
      return;
    }

    setLoading(true);
  
    console.log("Cooking recipe:", recipe.name);
    console.log("Ingredients to deduct:", recipe.ingredients);
  
    try {
      const nutrition_response = await fetch(`${API_BASE_URL}/api/add_recipe_nutrition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nutrition: recipe.nutrition }),
      });
  
      if (!nutrition_response.ok) {
        const err = await nutrition_response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add nutrition info");
      }
  
      const nutrition_data = await nutrition_response.json();
      console.log("nutrition data", nutrition_data)

      const response = await fetch(`${API_BASE_URL}/api/deduct_inventory_item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: recipe.ingredients.map((ing) => ({
            item_id: ing.item_id,
            expiry_date: ing.expiry_date,
            quantity_value: ing.quantity_value,
            quantity_unit: ing.quantity_unit,
          })),
        }),
      });
  
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to deduct inventory items");
      }
  
      const data = await response.json();
      console.log("Deducted items:", data);
      alert(`Successfully cooked ${recipe.name}! Inventory updated.`);
      router.push("/");
    } catch (err: any) {
      console.error("Error deducting ingredients:", err.message);
      alert("Failed to cook recipe. Check inventory quantities.");
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <SafeAreaView style={styles.outerContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: 120 }]} // space for floating button
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Ionicons
            name="chevron-back"
            size={24}
            color="#fff"
            onPress={() => router.back()}
          />
          <Text style={styles.screenTitle} numberOfLines={1}>
            Recipes
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Match + description */}
        <View style={styles.card}>
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
        </View>

        {/* Tags */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Cuisines</Text>
          <View style={styles.chipRow}>
            {recipe.cuisines?.map((c) => (
              <View key={c} style={styles.chip}>
                <Text style={styles.chipText}>{c}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Dietary Restrictions</Text>
          <View style={styles.chipRow}>
            {recipe.dietary_restrictions?.map((d) => (
              <View key={d} style={styles.chip}>
                <Text style={styles.chipText}>{d}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Macronutrients</Text>
          <View style={styles.chipRow}>
            {recipe.macronutrient_preferences?.map((m) => (
              <View key={m} style={styles.chip}>
                <Text style={styles.chipText}>{m}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Ingredients</Text>
          {recipe.ingredients.map((ing) => (
            <Text
              key={`${ing.item_id}-${ing.expiry_date}`}
              style={styles.listItem}
            >
              • {ing.quantity_value} {ing.quantity_unit} {ing.item_name} (exp:{" "}
              {ing.expiry_date})
            </Text>
          ))}
        </View>

        {/* Steps */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Steps</Text>
          {recipe.steps.map((step, i) => (
            <Text key={i} style={styles.listItem}>
              {i + 1}. {step}
            </Text>
          ))}
        </View>

        {/* Why this recipe */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Why this recipe?</Text>
          <Text style={styles.whyText}>{recipe.why_this_recipe}</Text>
        </View>
      </ScrollView>

      {/* Floating Cook Button */}
      <View style={styles.buttonWrapper}>
      <Pressable
        style={({ pressed }) => [
          styles.cookButton,
          pressed && { opacity: 0.8 },
          loading && { opacity: 0.5 },
        ]}
        onPress={handleCookRecipe}
        disabled={loading}
      >
        <Text style={styles.cookButtonText}>
          {loading ? "Cooking recipe and deducting ingredients from inventory..." : "Cook recipe and deduct ingredients from inventory"}
        </Text>
      </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default RecipeDetailScreen;

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: "#0B0B0F" },
  container: { flex: 1 },
  content: { padding: 16 },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0B0F",
  },
  errorText: { color: "#fff", fontSize: 16 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  screenTitle: { flex: 1, fontSize: 20, fontWeight: "600", color: "#fff" },

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
    marginBottom: 6,
    fontSize: 12,
    textTransform: "uppercase",
    color: "#AAAACB",
  },

  description: { color: "#D5D5F0", marginBottom: 6 },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  metaLabel: { fontSize: 12, color: "#A0A0C0" },
  metaValue: { color: "#fff", fontSize: 14 },

  starRow: { flexDirection: "row" },
  star: { color: "#FACC15", marginRight: 2 },

  listItem: { color: "#E4E4FF", marginBottom: 4 },
  whyText: { color: "#B9B9D8", marginTop: 4 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#1E1E2C",
  },
  chipText: { color: "#E3E3FF", fontSize: 12 },

  matchText: { fontSize: 12, color: "#A5B4FC" },

  buttonWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "transparent",
  },
  cookButton: {
    backgroundColor: "#16A34A",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cookButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
