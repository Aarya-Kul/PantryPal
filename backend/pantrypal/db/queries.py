from .db_client import supabase_client
from datetime import date, timedelta
import logging

logger = logging.getLogger(__name__)

"""
TODO
    1. Give chat the db helper queries and ask it to optimize by creating appropriate indexes
    2. Add triggers to db for certain events
        If item becomes expired -> delete from user inventory table
        If all instances of item are gone -> delete from item table
        Etc?
"""

# create new profile
def create_profile(user_id, name=None, birthday=None):
    profile_data = {
        "user_id": user_id,
        "name": name,
        "birthday": birthday
    }
    response = supabase_client.table("profile").insert(profile_data).execute()
    return response.data 

# get existing or create new profile
def get_or_create_profile(user_id, name=None, birthday=None):
    response = supabase_client.table("profile").select("*").eq("user_id", user_id).execute()
    
    if response.data:
        return response.data[0] 
    
    return create_profile(user_id, name, birthday)[0]

# create user
def create_user(email, password, name, birthday=None):
    auth_response = supabase_client.auth.sign_up({
        "email": email,
        "password": password
    })

    if not auth_response.user:
        return None

    user_id = auth_response.user.id

    profile = get_or_create_profile(user_id, name, birthday)

    return {
        "user_id": user_id,
        "email": email,
        "profile": profile
    }

# login user
def login_user(email, password):
    auth_response = supabase_client.auth.sign_in_with_password({
        "email": email,
        "password": password
    })

    if not auth_response.user:
        return None 

    session = auth_response.session

    return {
        "user_id": auth_response.user.id,
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "expires_in": session.expires_in
    }

# ask Supabase Auth to send a password reset email
def send_password_reset(email: str):
    redirect_url = "http://localhost:8081/update-password"

    response = supabase_client.auth.reset_password_for_email(
        email,
        {
            "redirect_to": redirect_url,
        },
    )

    # Supabase Python client returns an AuthResponse with an error attribute if something went wrong
    error = getattr(response, "error", None)
    if error:
        raise ValueError(error.message)

    return True

# edit inventory item
def edit_inventory_item(user_id, item_id, expiry_date, quantity_value, quantity_unit):
    inventory_item_data = supabase_client.table("user_inventory").select(
        "item_id, quantity_value, quantity_unit, expiry_date"
    ).eq("user_id", user_id).eq("item_id", item_id).eq("expiry_date", expiry_date).execute()

    if not inventory_item_data.data:
        raise ValueError("Item not found in user inventory.")

    updated_inventory = supabase_client.table("user_inventory").update({
        "quantity_value": quantity_value,
        "quantity_unit": quantity_unit
    }).eq("user_id", user_id).eq("item_id", item_id).eq("expiry_date", expiry_date).execute()

    return updated_inventory.data[0]

# add inventory item
def deduct_inventory_item(user_id, item_id, expiry_date, deduct_quantity_value, quantity_unit):
    inventory_item = supabase_client.table("user_inventory").select(
        "item_id, quantity_value, quantity_unit, expiry_date"
    ).eq("user_id", user_id).eq("item_id", item_id).eq("expiry_date", expiry_date).execute()

    if not inventory_item.data:
        raise ValueError("Item not found in user inventory.")
    
    if quantity_unit != inventory_item.data[0]["quantity_unit"]:
        # make call to llm to do conversion b/c units are different
        logger.info("making call to llm to do conversion b/c units are different")

    quantity_value_after_deduct = inventory_item.data[0]["quantity_value"] - deduct_quantity_value

    if quantity_value_after_deduct <= 0:
        return remove_inventory_item(user_id, item_id, expiry_date)

    updated_inventory = supabase_client.table("user_inventory").update({
        "quantity_value": quantity_value_after_deduct,
        "quantity_unit": quantity_unit
    }).eq("user_id", user_id).eq("item_id", item_id).eq("expiry_date", expiry_date).execute()

    return updated_inventory.data[0]

# add an inventory item
def add_inventory_item(user_id, item_name, expiry_date, quantity_value, quantity_unit):
    # insert item if it doesn't exist
    item_data = supabase_client.table("items").select("*").eq("item_name", item_name).execute()

    if not item_data.data:
        new_item = supabase_client.table("items").insert({"item_name": item_name}).execute()
        item_id = new_item.data[0]["item_id"]
    else:
        item_id = item_data.data[0]["item_id"]

    # check if item exists in user inventory, update with new quantity value = existing + `quantity_value`
    user_inventory_item = supabase_client.table("user_inventory").select(
        "*"
    ).eq("user_id", user_id).eq("item_id", item_id).eq("expiry_date", expiry_date).execute()

    if not user_inventory_item.data:
        # insert new item into user_inventory
        new_inventory_item = supabase_client.table("user_inventory").insert({
            "user_id": user_id,
            "item_id": item_id,
            "quantity_value": quantity_value,
            "quantity_unit": quantity_unit,
            "expiry_date": expiry_date
        }).execute()
    
    else:
        # update the existing record
        if quantity_unit != user_inventory_item.data[0]["quantity_unit"]:
            # make call to llm to do conversion b/c units are different
            logger.info("making call to llm to do conversion b/c units are different")
        else:
            quantity_value_after_addition = user_inventory_item.data[0]["quantity_value"] + quantity_value
            new_inventory_item = supabase_client.table("user_inventory").update({
                "quantity_value": quantity_value_after_addition,
                "quantity_unit": quantity_unit
            }).eq("user_id", user_id).eq("item_id", item_id).eq("expiry_date", expiry_date).execute()

    return new_inventory_item.data[0]

# remove an inventory item
def remove_inventory_item(user_id, item_id, expiry_date):
    delete_result = supabase_client.table("user_inventory") \
        .delete() \
        .eq("user_id", user_id) \
        .eq("item_id", item_id) \
        .eq("expiry_date", expiry_date) \
        .execute()

    return delete_result.data[0]

# get inventory
def get_user_inventory(user_id):
    response = supabase_client.table("user_inventory").select(
        "item_id, quantity_value, quantity_unit, expiry_date, items(item_name)"
    ).eq("user_id", user_id).order("expiry_date").execute()

    return response.data

def get_inventory_unit_mapping(user_id):
    inventory_unit_mapping = []
    user_inventory = get_user_inventory(user_id)
    seen = set()

    for item in user_inventory:
        item_id = item["item_id"]

        if item_id not in seen:
            seen.add(item_id)
            inventory_unit_mapping.append({
                "item_name": item["items"]["item_name"],
                "unit": item["quantity_unit"]
            })

    return inventory_unit_mapping
    
# get list of preference options
def get_preferences_tags():
    tags = {}
    macronutrients = supabase_client.table("macronutrients").select("*").execute()
    cuisines = supabase_client.table("cuisines").select("*").execute()
    dietary_restrictions = supabase_client.table("dietary_restrictions").select("*").execute()

    def format_rows(response, id_key, name_key):
        return [{"id": row[id_key], "name": row[name_key]} for row in response.data]

    tags["macronutrients"] = format_rows(macronutrients, "macronutrient_id", "macronutrient_name")
    tags["cuisines"] = format_rows(cuisines, "cuisine_id", "cuisine_name")
    tags["dietary_restrictions"] = format_rows(dietary_restrictions, "dietary_restriction_id", "dietary_restriction_name")

    return tags

# get user preferences
def get_user_preferences(user_id):
    preferences = {}

    macronutrient_preferences_data = supabase_client.table("user_macronutrient_preferences").select(
        "macronutrients(macronutrient_name)"
    ).eq("user_id", user_id).execute()

    cuisine_preferences_data = supabase_client.table("user_cuisine_preferences").select(
        "cuisines(cuisine_name)"
    ).eq("user_id", user_id).execute()

    dietary_restrictions_data = supabase_client.table("user_dietary_restrictions").select(
        "dietary_restrictions(dietary_restriction_name)"
    ).eq("user_id", user_id).execute()

    preferences["macronutrient_preferences"] = [data['macronutrients']['macronutrient_name'] for data in macronutrient_preferences_data.data]
    preferences["cuisine_preferences"] = [data['cuisines']['cuisine_name'] for data in cuisine_preferences_data.data]
    preferences["dietary_restrictions"] = [data['dietary_restrictions']['dietary_restriction_name'] for data in dietary_restrictions_data.data]

    return preferences

# set user preferences
def set_user_preferences(user_id, preferences):
    macronutrient_ids = preferences.get("macronutrients", [])
    cuisine_ids = preferences.get("cuisines", [])
    dietary_restriction_ids = preferences.get("dietary_restrictions", [])

    supabase_client.table("user_macronutrient_preferences") \
        .delete() \
        .eq("user_id", user_id) \
        .execute()

    supabase_client.table("user_cuisine_preferences") \
        .delete() \
        .eq("user_id", user_id) \
        .execute()

    supabase_client.table("user_dietary_restrictions") \
        .delete() \
        .eq("user_id", user_id) \
        .execute()

    if macronutrient_ids:
        supabase_client.table("user_macronutrient_preferences") \
            .insert([
                {"user_id": user_id, "macronutrient_id": mid}
                for mid in macronutrient_ids
            ]) \
            .execute()

    if cuisine_ids:
        supabase_client.table("user_cuisine_preferences") \
            .insert([
                {"user_id": user_id, "cuisine_id": cid}
                for cid in cuisine_ids
            ]) \
            .execute()

    if dietary_restriction_ids:
        supabase_client.table("user_dietary_restrictions") \
            .insert([
                {"user_id": user_id, "dietary_restriction_id": drid}
                for drid in dietary_restriction_ids
            ]) \
            .execute()

    return {
        "macronutrients": macronutrient_ids,
        "cuisines": cuisine_ids,
        "dietary_restrictions": dietary_restriction_ids
    }

# add nutrition info
def add_nutrition_info(user_id, recipe_nutrition):
    today = date.today().isoformat()

    existing = supabase_client.table("user_nutrition") \
        .select("*") \
        .eq("user_id", user_id) \
        .eq("date", today) \
        .execute()

    if existing.data:
        record = existing.data[0]

        updated_data = {}
        for key, value in recipe_nutrition.items():
            updated_data[key] = record.get(key, 0) + value

        response = supabase_client.table("user_nutrition") \
            .update(updated_data) \
            .eq("user_id", user_id) \
            .eq("date", today) \
            .execute()

        return response.data[0]

    insert_data = {
        "user_id": user_id,
        "date": today,
        **recipe_nutrition
    }

    response = supabase_client.table("user_nutrition") \
        .insert(insert_data) \
        .execute()

    return response.data[0]

# get nutrient statistics
def get_nutrient_statistics(user_id, reference_date=None):
    if not reference_date:
        reference_date = date.today().isoformat()

    response = supabase_client.table("user_nutrition") \
        .select("protein, carbs, fats, dairy, veggies, fruits") \
        .eq("user_id", user_id) \
        .eq("date", reference_date) \
        .execute()

    rows = response.data
    if not rows:
        return {}

    totals = {
        "protein": sum(r["protein"] for r in rows),
        "carbs": sum(r["carbs"] for r in rows),
        "fats": sum(r["fats"] for r in rows),
        "dairy": sum(r["dairy"] for r in rows),
        "veggies": sum(r["veggies"] for r in rows),
        "fruits": sum(r["fruits"] for r in rows),
    }

    overall_total = sum(totals.values())

    if overall_total == 0:
        return {key: 0.0 for key in totals}

    return {
        key: round(totals[key] / overall_total, 5)
        for key in totals
    }

# get expiring items
def get_expiring_items(user_id):
    notifications = {}
    today = date.today().isoformat()

    week_notification_data = supabase_client.table("user_inventory").select(
        "item_id, quantity_value, quantity_unit, expiry_date, items(item_name)"
    ).eq("user_id", user_id) \
     .gte("expiry_date", today + timedelta(days=3)) \
     .lte("expiry_date", today + timedelta(days=7)) \
     .order("expiry_date") \
     .execute()


    two_day_notification_data = supabase_client.table("user_inventory").select(
        "item_id, quantity_value, quantity_unit, expiry_date, items(item_name)"
    ).eq("user_id", user_id) \
     .gte("expiry_date", today + timedelta(days=1)) \
     .lte("expiry_date", today + timedelta(days=2)) \
     .order("expiry_date") \
     .execute()

    notifications["1 week"] = week_notification_data.data
    notifications["2 days"] = two_day_notification_data.data

    return notifications
