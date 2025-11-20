from flask import Blueprint, request, jsonify
from pantrypal.db.queries import create_user, login_user, get_user_preferences
from pantrypal.auth.auth_utils import authorize

user_bp = Blueprint("users", __name__)

@user_bp.route("/sign_up", methods=["POST"])
def create_user_route():
    try:
        data = request.json

        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        birthday = data.get("birthday")

        if not name or not password or not email:
            return jsonify({"error": "Missing required field (name, email, password)"}), 400

        user = create_user(email, password, name, birthday)

        if not user:
            return jsonify({"error": "Failed to create user"}), 500

        return jsonify(user), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@user_bp.route("/login", methods=["POST"])
def login_user_route():
    try:
        data = request.json

        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Missing email or password"}), 400

        result = login_user(email, password)

        if not result:
            return jsonify({"error": "Invalid email or password"}), 401

        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@user_bp.route("/get_preferences", methods=["GET"])
def get_preferences_route():
    user_id, error = authorize(request)
    if error:
        return jsonify({"error": error}), 401

    preferences = get_user_preferences(user_id)

    return jsonify(preferences), 200
