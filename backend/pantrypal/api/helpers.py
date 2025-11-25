from datetime import date, datetime
from pantrypal.db.queries import get_preferences_tags
from google.cloud import vision 
from google import genai
import logging
import json
import os

# Set credentials path from .env
google_key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if google_key_path:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = google_key_path
else:
    raise ValueError("Google service account path not set in .env")

gemini_key = os.getenv("GEMINI_API_KEY")
if not gemini_key:
    raise ValueError("Gemini API key not set in .env")

logger = logging.getLogger(__name__)

def build_tag_config():
    raw_tags = get_preferences_tags()   
    tag_config = {}

    for key, items in raw_tags.items():
        # extract names
        tag_config[key] = [item["name"] for item in items]

    logging.info(tag_config)
    return tag_config


def parse_expiry(expiry_value):
    if isinstance(expiry_value, date):
        return expiry_value
    if isinstance(expiry_value, datetime):
        return expiry_value.date()
    # otherwise assume ISO string from Supabase / JSON
    return datetime.fromisoformat(str(expiry_value)).date()


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg'}


def scan_receipts(img_data):
    """
    Use Google Vision API to extract text from an image.
    """
    try:
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=img_data)

        response = client.text_detection(image=image)
        texts = response.text_annotations

        parsed_text = texts[0].description if texts else ""

        logger.info(f"OCR Text: {parsed_text}")

        return parsed_text

    except Exception as e:
        logger.error(f"Error scanning receipt: {e}")
        return ""


def gemini_generator(prompt):
    """ Generate JSON using Gemini """
    try:
        client = genai.Client(api_key=gemini_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        raw = response.text
        clean_json = raw.replace("```json", "").replace("```", "").strip()
        # Convert to Python dictionary
        logger.info("Gemini raw output:\n%s", clean_json)
        return json.loads(clean_json)

    except Exception as e:
        logger.error(f"Gemini JSON error: {e}")
        raise


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

    TAG_CONFIG = build_tag_config()

    def to_valid_set(values, valid_tags):
        if not values:
            return set()
        return {v.lower() for v in values if v.lower() in valid_tags}

    valid_cuisines = {t.lower() for t in TAG_CONFIG["cuisines"]}
    valid_macros = {t.lower() for t in TAG_CONFIG["macronutrients"]}
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
