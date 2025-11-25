from flask import Blueprint, request, jsonify
from pantrypal.db.queries import (
    get_user_inventory, 
    edit_inventory_item, 
    add_inventory_item, 
    deduct_inventory_item, 
    remove_inventory_item, 
    get_expiring_items
)
from pantrypal.auth.auth_utils import authorize

inventory_bp = Blueprint("inventory", __name__)

@inventory_bp.route("/get_user_inventory", methods=["GET"])
def get_user_inventory_route():
    user_id, error = authorize(request)
    if error:
        return jsonify({"error": error}), 401

    inventory = get_user_inventory(user_id)
    return jsonify({"inventory": inventory}), 200


@inventory_bp.route("/add_inventory_item", methods=["POST"])
def add_inventory_item_route():
    user_id, error = authorize(request)
    if error:
        return jsonify({"error": error}), 401

    data = request.json
    items = data["items"]

    added_items = []

    for item in items:
        try:
            item_name = item["item_name"]
            expiry_date = item["expiry_date"]
            quantity_value = item["quantity_value"]
            quantity_unit = item["quantity_unit"]

            to_add = add_inventory_item(user_id, item_name, expiry_date, quantity_value, quantity_unit)
            added_items.append(to_add)

        except Exception as e:
            added_items.append({
                "item": item,
                "status": "error",
                "error": str(e)
            })

    return jsonify(added_items), 200


@inventory_bp.route("/edit_inventory_item", methods=["POST"])
def edit_inventory_item_route():
    user_id, error = authorize(request)
    if error:
        return jsonify({"error": error}), 401

    data = request.json
    items = data["items"]

    edited_items = []

    for item in items:
        try:
            item_id = item["item_id"]
            expiry_date = item["expiry_date"]
            quantity_value = item["quantity_value"]
            quantity_unit = item["quantity_unit"]

            to_edit = edit_inventory_item(user_id, item_id, expiry_date, quantity_value, quantity_unit)
            edited_items.append(to_edit)

        except Exception as e:
            edited_items.append({
                "item": item,
                "status": "error",
                "error": str(e)
            })

    return jsonify(edited_items), 200


@inventory_bp.route("/deduct_inventory_item", methods=["POST"])
def deduct_inventory_item_route():
    user_id, error = authorize(request)
    if error:
        return jsonify({"error": error}), 401

    data = request.json
    items = data["items"]

    deducted_items = []

    for item in items:
        try:
            item_id = item["item_id"]
            expiry_date = item["expiry_date"]
            quantity_value = item["quantity_value"]
            quantity_unit = item["quantity_unit"]

            to_deduct = deduct_inventory_item(user_id, item_id, expiry_date, quantity_value, quantity_unit)
            deducted_items.append(to_deduct)

        except Exception as e:
            deducted_items.append({
                "item": item,
                "status": "error",
                "error": str(e)
            })

    return jsonify(deducted_items), 200


@inventory_bp.route("/remove_inventory_item", methods=["DELETE"])
def remove_inventory_item_route():
    user_id, error = authorize(request)
    if error:
        return jsonify({"error": error}), 401

    data = request.json
    items = data["items"]

    removed_items = []

    for item in items:
        try:
            item_id = item["item_id"]
            expiry_date = item["expiry_date"]

            to_remove = remove_inventory_item(user_id, item_id, expiry_date)
            removed_items.append(to_remove)

        except Exception as e:
            removed_items.append({
                "item": item,
                "status": "error",
                "error": str(e)
            })

    return jsonify(removed_items), 200


@inventory_bp.route("/get_expiring_items", methods=["GET"])
def get_expiring_items_route():
    user_id, error = authorize(request)
    if error:
        return jsonify({"error": error}), 401

    notifications = get_expiring_items(user_id)
    
    return jsonify(notifications), 200
