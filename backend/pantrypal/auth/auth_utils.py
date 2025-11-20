from flask import request
from pantrypal.db.db_client import supabase_client

def authorize(request):
    auth_header = request.headers.get("Authorization")
    refresh_token = request.headers.get("X-Refresh-Token") 

    if not auth_header:
        return None, "Missing Authorization header"

    if not auth_header.startswith("Bearer "):
        return None, "Invalid Authorization format"

    access_token = auth_header.split(" ")[1]

    # try access token
    try:
        supabase_client.auth.set_session({
            "access_token": access_token,
            "refresh_token": refresh_token 
        })
        user = supabase_client.auth.get_user()
        if user and user.user:
            return user.user.id, None

    except Exception:
        pass

    # if access token expired, refresh using the refresh token
    if refresh_token:
        try:
            print("Access token expired")
            refreshed = supabase_client.auth.refresh_session({"refresh_token": refresh_token})
            print(refreshed)
            if refreshed and refreshed.session and refreshed.session.user:
                return refreshed.session.user.id, None
        except Exception:
            pass

    return None, "Invalid or expired session token"

