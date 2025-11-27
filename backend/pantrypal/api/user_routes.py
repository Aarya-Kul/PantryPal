from flask import Blueprint, request, jsonify
from pantrypal.db.queries import (
    create_user, 
    login_user, 
    get_preferences_tags, 
    get_user_preferences,
    add_user_preferences, 
    send_password_reset,
    get_nutrient_statistics
)
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

        # This may raise ValueError if Supabase returns an error (e.g., email already registered)
        user = create_user(email, password, name, birthday)

        return jsonify(user), 201

    except Exception as e:
        return jsonify({"error": "Internal server error (Email may be already taken)"}), 500

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
    
@user_bp.route("/forgot_password", methods=["POST"])
def forgot_password_route():
    try:
        data = request.json or {}
        email = data.get("email")

        if not email:
            return jsonify({"error": "Email is required"}), 400

        # Do NOT reveal if the email exists as it'll prevent account enumeration
        try:
            send_password_reset(email)
        except ValueError as e:
            return jsonify({
                "message": "If an account exists for this email, a reset link has been sent."
            }), 200

        return jsonify({
            "message": "If an account exists for this email, a reset link has been sent."
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@user_bp.route("/preference_options", methods=["GET"])
def get_preferences_options_route():
    try:
        _, error = authorize(request)
        if error:
            return jsonify({"error": error}), 401

        preferences = get_preferences_tags()
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


    return jsonify(preferences), 200

@user_bp.route("/get_preferences", methods=["GET"])
def get_preferences_route():
    try:
        user_id, error = authorize(request)
        if error:
            return jsonify({"error": error}), 401

        preferences = get_user_preferences(user_id)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify(preferences), 200

@user_bp.route("/add_preferences", methods=["POST"])
def add_preferences_route():
    try:
        user_id, error = authorize(request)
        if error:
            return jsonify({"error": error}), 401

        preferences = request.json
        add_user_preferences(user_id, preferences)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"status": "success"}), 200

@user_bp.route("/get_nutrient_statistics", methods=["GET"])
def get_nutrient_statistics_route():
    try:
        user_id, error = authorize(request)
        if error:
            return jsonify({"error": error}), 401

        reference_date = request.args.get("date")
        nutrient_statistics = get_nutrient_statistics(user_id, reference_date)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify(nutrient_statistics), 200
