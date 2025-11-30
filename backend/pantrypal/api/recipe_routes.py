from flask import Blueprint, request, jsonify
import json
import logging

from pantrypal.db.queries import (
    get_user_inventory,
    get_user_preferences,
    add_nutrition_info
)
from pantrypal.api.helpers import (
    build_inventory_summary,
    compute_preference_match_percent,
    compute_expiry_stars,
    build_tag_config
)
from pantrypal.auth.auth_utils import authorize
from pantrypal.api.receipt_routes import gemini_generator
from pantrypal.api.prompts import RECIPE_BASE_PROMPT

recipes_bp = Blueprint("recipes", __name__)
logger = logging.getLogger(__name__)

@recipes_bp.route("/add_recipe_nutrition", methods=["POST"])
def add_recipe_nutrition_route():
    try:
        user_id, error = authorize(request)
        if error:
            return jsonify({"error": error}), 401
        
        data = request.json
        recipe_nutrition = data.get("nutrition")

        if not recipe_nutrition:
            return jsonify({"error": "Missing nutrition data"}), 400

        updated = add_nutrition_info(user_id, recipe_nutrition)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"nutrition": updated}), 200

@recipes_bp.route("/get_recipes", methods=["GET"])
def get_recipes():
    """
    GET /get_recipes

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
    try:
        user_id, error = authorize(request)
        if error:
            return jsonify({"error": error}), 401

        # 1) Pull full inventory + preferences
        inventory_rows = get_user_inventory(user_id)
        inventory_summary = build_inventory_summary(inventory_rows)

        user_prefs = get_user_preferences(user_id)

        logger.info("GOT ALL THE INFO I NEED FOR GEMINI")

        # (item_id|expiry_date) -> days_to_expiry
        # using both because an item_id could have different expiries
        inventory_map = {
            f"{item['item_id']}|{item['expiry_date']}": item["days_to_expiry"]
            for item in inventory_summary
        }

        TAG_CONFIG = build_tag_config()

        # 2) Prompt Gemini
        prompt = f"""
            {RECIPE_BASE_PROMPT}

            tag_config (JSON with allowed tag values):
            {json.dumps(TAG_CONFIG)}

            User inventory (JSON list) with expiry information:
            {json.dumps(inventory_summary)}

            User preferences (JSON):
            {json.dumps(user_prefs)}

            Generate 5 complete recipes that follow the instructions.
        """
        

        
        model_output = gemini_generator(prompt)
        
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
        logger.info("SORTING RECIPES NOW")

        enriched_recipes.sort(
            key=lambda recipe: (
                -(recipe.get("expiry_priority_stars") or 0),
                recipe.get("min_days_to_expiry") if recipe.get("min_days_to_expiry") is not None else 9999,
                -(recipe.get("preference_match_percent") or 0),
            )
        )

        logger.info("Final Curated Recipes:\n%s", enriched_recipes)

    except Exception as e:
        return jsonify({"error": f"Recipe generation failed: {str(e)}"}), 500

    return jsonify({"recipes": enriched_recipes}), 200