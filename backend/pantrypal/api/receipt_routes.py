import os
from datetime import datetime
import logging

from dotenv import load_dotenv
from flask import Blueprint, request, jsonify
from google.cloud import vision 
from google import genai

from pantrypal.api.prompts import RECEIPT_BASE_PROMPT

import json

receipt_bp = Blueprint("receipt", __name__)

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


@receipt_bp.route('/upload_receipt', methods=["POST"])
def upload_receipt():
    image_file = request.files.get("data")

    if not image_file or image_file.filename == '':
        return jsonify({"error": "No image file provided"}), 400

    if not allowed_file(image_file.filename):
        return jsonify({"error": "Unsupported file type"}), 400

    # Read image data
    image_data = image_file.read()

    text = scan_receipts(image_data)

    # Current date string
    date_str = f"Today's date is {datetime.now().date()}. Message = "

    prompt = date_str + text + RECEIPT_BASE_PROMPT

    try:
        response_data = gemini_generator(prompt)
    except Exception as e:
        logger.error(f"Gemini generation error: {e}")
        return jsonify({"error": "Failed to generate JSON from OCR text"}), 500

    return jsonify(response_data), 201