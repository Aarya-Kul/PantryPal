from flask import request
from pantrypal.db.db_client import supabase_client
import jwt


def authorize(request):
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        return None, "Missing Authorization header"

    if not auth_header.startswith("Bearer "):
        return None, "Invalid Authorization format"

    access_token = auth_header.split(" ")[1]

    try:
        # decode JWT without verifying signature
        payload = jwt.decode(access_token, options={"verify_signature": False})
        user_id = payload.get("sub")
        print(payload)
        print(user_id)
        if not user_id:
            return None, "Invalid token payload"
        return user_id, None
    except Exception as e:
        return None, f"Invalid or expired session token: {str(e)}"