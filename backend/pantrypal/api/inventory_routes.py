from flask import Blueprint, request, jsonify
from pantrypal.db.queries import get_user_inventory, edit_inventory_item, add_inventory_item, remove_inventory_item
from pantrypal.auth.auth_utils import authorize

inventory_bp = Blueprint("inventory", __name__)

@inventory_bp.route("/get_user_inventory", methods=["GET"])
def get_user_inventory_route():
    user_id, error = authorize(request)
    if error:
        return jsonify({"error": error}), 401

    inventory = get_user_inventory(user_id)
    return jsonify(inventory), 200

@inventory_bp.route("/add_inventory_item", methods=["POST"])
def add_inventory_item_route():
    user_id, error = authorize(request)
    if error:
        return jsonify({"error": error}), 401

    return

@inventory_bp.route("/edit_inventory_item", methods=["POST"])
def edit_inventory_item_route():
    user_id, error = authorize(request)
    if error:
        return jsonify({"error": error}), 401

    return

@inventory_bp.route("/remove_inventory_item", methods=["DELETE"])
def remove_inventory_item_route():
    user_id, error = authorize(request)
    if error:
        return jsonify({"error": error}), 401
        
    return