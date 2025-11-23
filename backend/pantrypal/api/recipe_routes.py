from flask import Blueprint, request, jsonify
from datetime import date, datetime
import json
import logging

from pantrypal.db.queries import (
    get_user_inventory,
    get_user_preferences,
)
from pantrypal.auth.auth_utils import authorize
from pantrypal.api.receipt_routes import gemini_generator
from pantrypal.api.prompts import RECIPE_BASE_PROMPT

recipes_bp = Blueprint("recipes", __name__)
logger = logging.getLogger(__name__)

TAG_CONFIG = {
    "cuisines": ["Indian", "Chinese", "American"],
    "macronutrient_preferences": ["high_protein", "low_carb", "balanced"],
    "dietary_restrictions": ["vegetarian", "vegan", "gluten_free", "nut_free"]
}

def parse_expiry(expiry_value):
    if isinstance(expiry_value, date):
        return expiry_value
    if isinstance(expiry_value, datetime):
        return expiry_value.date()
    # otherwise assume ISO string from Supabase / JSON
    return datetime.fromisoformat(str(expiry_value)).date()


def build_inventory_summary(inventory_rows):
    """
    Adds days_to_expiry for LLM recipe generation.

    Expected shape for each row from get_user_inventory:
    {
        "item_id": int,
        "quantity_value": number,
        "quantity_unit": str,
        "expiry_date": "YYYY-MM-DD" or date/datetime,
        "items": { "item_name": str }
    }
    """
    today = date.today()
    summarized = []

    for row in inventory_rows:
        expiry = parse_expiry(row["expiry_date"])
        days_to_expiry = (expiry - today).days

        summarized.append(
            {
                "item_id": row["item_id"],
                "item_name": row["items"]["item_name"],
                "expiry_date": expiry.isoformat(),
                "quantity_value": row["quantity_value"],
                "quantity_unit": row["quantity_unit"],
                "days_to_expiry": days_to_expiry,
            }
        )

    logger.info("Inventory summary: %s", summarized)
    return summarized


def compute_expiry_stars(recipe, inventory_map):
    """
    Expiry stars from 0 - 5, to display importance of recipe to use up ingredients that expire first.
    """
    days_list = []

    for ing in recipe.get("ingredients", []):
        key = f"{ing.get('item_id')}|{ing.get('expiry_date')}"
        if key in inventory_map:
            days_list.append(inventory_map[key])

    if not days_list:
        return 1.0, None

    min_days = min(days_list)

    # This provides a smooth linear mapping: 0 days -> 5 stars, 14+ days -> 1 star
    raw = 5 - (min_days / 14) * 4
    clamped = max(1, min(raw, 5))

    # Convert to 0.5 increments
    stars = round(clamped * 2) / 2

    return stars, min_days


def compute_preference_match_percent(recipe, user_prefs):
    """
    Provides a score from 0–100.

    Measures how well the recipe matches the user's:
    - cuisine_preferences
    - macronutrient_preferences
    - dietary_restrictions (treated as required diet tags, not 'things to include')
    """

    def to_valid_set(values, valid_tags):
        if not values:
            return set()
        return {v.lower() for v in values if v.lower() in valid_tags}

    valid_cuisines = {t.lower() for t in TAG_CONFIG["cuisines"]}
    valid_macros = {t.lower() for t in TAG_CONFIG["macronutrient_preferences"]}
    valid_diet = {t.lower() for t in TAG_CONFIG["dietary_restrictions"]}

    # User preferences
    pref_cuisines = to_valid_set(user_prefs.get("cuisine_preferences"), valid_cuisines)
    pref_macros = to_valid_set(user_prefs.get("macronutrient_preferences"), valid_macros)
    pref_diet = to_valid_set(user_prefs.get("dietary_restrictions"), valid_diet)

    # Recipe tags, filtered to only known tags in case LLM hallucinated and made up tags
    recipe_cuisines = to_valid_set(recipe.get("cuisines"), valid_cuisines)
    recipe_macros = to_valid_set(recipe.get("macronutrient_preferences"), valid_macros)
    recipe_diet = to_valid_set(recipe.get("dietary_restrictions"), valid_diet)

    # If user has literally no prefs at all, everything is "fine"
    if not (pref_cuisines or pref_macros or pref_diet):
        return 100

    # --- Scores for each preferenceL fraction of user's cuisines that appear in the recipe ---

    cuisine_score = None
    if pref_cuisines:
        cuisine_matches = len(pref_cuisines & recipe_cuisines)
        cuisine_score = cuisine_matches / len(pref_cuisines)

    macro_score = None
    if pref_macros:
        macro_matches = len(pref_macros & recipe_macros)
        macro_score = macro_matches / len(pref_macros)

    diet_score = None
    if pref_diet:
        if pref_diet.issubset(recipe_diet):
            diet_score = 1.0
        else: # we dont want a recipe where it doesn't satisfy every dietary restriction the user selected
            diet_score = 0.0
    
    # TODO: might want to tune
    weights = {
        "cuisines": 0.4,
        "macros": 0.3,
        "diet": 0.3,
    }

    weighted_sum = 0.0
    weight_total = 0.0

    if cuisine_score is not None:
        weighted_sum += cuisine_score * weights["cuisines"]
        weight_total += weights["cuisines"]

    if macro_score is not None:
        weighted_sum += macro_score * weights["macros"]
        weight_total += weights["macros"]

    if diet_score is not None:
        weighted_sum += diet_score * weights["diet"]
        weight_total += weights["diet"]

    # If for some reason weight_total is 0 (e.g., prefs were all invalid),
    # fall back to 100.
    if weight_total == 0:
        return 100

    final_score = (weighted_sum / weight_total) * 100
    return int(round(final_score))


@recipes_bp.route("/get_recipes", methods=["POST"])
def get_recipes():
    """
    POST /get_recipes

    Body (optional):
    {
        "max_recipes": 5
    }

    Response:
    {
      "recipes": [
        {
          "name": "...",
          "description": "...",
          "cuisines": [...],
          "macronutrient_preferences": [...],
          "dietary_restrictions": [...],
          "steps": [...],
          "ingredients": [
            {
              "item_id": 1,
              "item_name": "milk",
              "expiry_date": "2025-11-23",
              "quantity_value": 1.0,
              "quantity_unit": "cup"
            }
          ],
          "why_this_recipe": "short LLM explanation of why this matches the user and uses expiring items",
          "expiry_priority_stars": 1-5,
          "preference_match_percent": 0-100,
          "min_days_to_expiry": int | null
        }
      ]
    }

    NOTE: This will NOT mutate inventory. When the user actually marks a recipe
    as used, the frontend NEEDS to call /deduct_inventory_item or /edit_inventory_item.
    """
    user_id, error = authorize(request)
    if error:
        return jsonify({"error": error}), 401

    payload = request.get_json(silent=True) or {}
    max_recipes = payload.get("max_recipes", 5)

    # 1) Pull full inventory + preferences
    inventory_rows = get_user_inventory(user_id)
    inventory_summary = build_inventory_summary(inventory_rows)

    user_prefs = get_user_preferences(user_id)

    # (item_id|expiry_date) -> days_to_expiry
    # using both because an item_id could have different expiries
    inventory_map = {
        f"{item['item_id']}|{item['expiry_date']}": item["days_to_expiry"]
        for item in inventory_summary
    }

    # 2) Prompt Gemini
    prompt = f"""
        {RECIPE_BASE_PROMPT}

        tag_config (JSON with allowed tag values):
        {json.dumps(TAG_CONFIG)}

        User inventory (JSON list) with expiry information:
        {json.dumps(inventory_summary)}

        User preferences (JSON):
        {json.dumps(user_prefs)}

        Generate up to {max_recipes} complete recipes that follow the instructions.
    """

    try:
        model_output = gemini_generator(prompt)
    except Exception as e:
        return jsonify({"error": f"Recipe generation failed: {str(e)}"}), 500

    recipes = model_output.get("recipes", []) or []

    # 3) Add the expiry stars + preference match % and sort
    enriched_recipes = []
    for recipe in recipes:
        stars, min_days = compute_expiry_stars(recipe, inventory_map)
        match_pct = compute_preference_match_percent(recipe, user_prefs)

        recipe["expiry_priority_stars"] = stars
        recipe["preference_match_percent"] = match_pct
        recipe["min_days_to_expiry"] = min_days

        enriched_recipes.append(recipe)

    # Want to sort by highest expiry priority first; min days to expiry; preference match
    # TODO: should be robust enough but need to work on scoring + display
    enriched_recipes.sort(
        key=lambda recipe: (
            -(recipe.get("expiry_priority_stars") or 0),
            recipe.get("min_days_to_expiry") if recipe.get("min_days_to_expiry") is not None else 9999,
            -(recipe.get("preference_match_percent") or 0),
        )
    )

    logger.info("Final Curated Recipes:\n%s", enriched_recipes)
    return jsonify({"recipes": enriched_recipes}), 200