from .db_client import supabase_client


# create new profile
def create_profile(user_id, name=None, birthday=None):
    """Create a profile row for a Supabase Auth user."""
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


# add inventory item
def edit_inventory_item(user_id, item_name, expiry_date, quantity_value, quantity_unit):
    item_data = supabase_client.table("items").select("*").eq("item_name", item_name).execute()
    if not item_data.data:
        raise ValueError(f"Item '{item_name}' does not exist.")

    item_id = item_data.data[0]["item_id"]

    inventory_item_data = supabase_client.table("user_inventory").select(
        "item_id, quantity_value, quantity_unit, expiry_date"
    ).eq("user_id", user_id).eq("item_id", item_id).eq("expiry_date", expiry_date).execute()

    if not inventory_item_data.data:
        raise ValueError("Item not found in user inventory.")

    existing_item = inventory_item_data.data[0]
    updated_quantity = existing_item["quantity_value"] + quantity_value

    updated_inventory = supabase_client.table("user_inventory").update({
        "quantity_value": updated_quantity,
        "quantity_unit": quantity_unit
    }).eq("user_id", user_id).eq("item_id", item_id).eq("expiry_date", expiry_date).execute()

    return updated_inventory.data[0]


# add an inventory item
def add_inventory_item(user_id, item_name, expiry_date, quantity_value, quantity_unit):
    item_data = supabase_client.table("items").select("*").eq("item_name", item_name).execute()

    # add the item
    if not item_data.data:
        new_item = supabase_client.table("items").insert({"item_name": item_name}).execute()
        item_id = new_item.data[0]["item_id"]
    else:
        item_id = item_data.data[0]["item_id"]

    # add record of user_id and item_id with the quantity info and expiry date info
    # item not in inventory, insert new record
    new_inventory_item = supabase_client.table("user_inventory").insert({
        "user_id": user_id,
        "item_id": item_id,
        "quantity_value": quantity_value,
        "quantity_unit": quantity_unit,
        "expiry_date": expiry_date
    }).execute()

    return new_inventory_item.data[0]


# remove an inventory item
def remove_inventory_item(user_id, item_name, expiry_date):
    item_data = supabase_client.table("items").select("*").eq("item_name", item_name).execute()
    if not item_data.data:
        raise ValueError(f"Item '{item_name}' not found.")

    item_id = item_data.data[0]["item_id"]

    delete_result = supabase_client.table("user_inventory") \
        .delete() \
        .eq("user_id", user_id) \
        .eq("item_id", item_id) \
        .eq("expiry_date", expiry_date) \
        .execute()

    return delete_result.data



    return


# get inventory
def get_user_inventory(user_id):
    response = supabase_client.table("user_inventory").select(
        "item_id, quantity_value, quantity_unit, expiry_date, items(item_name)"
    ).eq("user_id", user_id).execute()

    return response.data
