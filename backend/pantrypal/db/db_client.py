"""Supabase client setup for PantryPal."""
import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    raise ValueError("Supabase URL or KEY not found in environment variables.")

# create db client
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
