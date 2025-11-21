import pantrypal
import os
from datetime import datetime
import logging

from dotenv import load_dotenv
from flask import request, jsonify
from google.cloud import vision 
from google import genai
import json

import pantrypal

load_dotenv()

# Set credentials path from .env
google_key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if google_key_path:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = google_key_path
else:
    raise ValueError("Google service account path not set in .env")

gemini_key = os.getenv("GEMINI_API_KEY")
if not gemini_key:
    raise ValueError("Gemini API key not set in .env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

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
    """
    Generate structured JSON from a prompt using Google Gemini (GenAI) API.
    """
    try:
        # Initialize Gemini client with API key
        client = genai.Client(api_key=gemini_key)
        # Generate content using the model
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        # Get the raw text from the model
        generated_text = response.text

        clean_json = generated_text.replace("```json", "").replace("```", "").strip()
        # Convert to Python dictionary
        return json.loads(clean_json)

    except Exception as e:
        logger.error(f"Gemini generation error: {e}")
        raise

@pantrypal.app.route('/upload_receipt/', methods=["POST"])
def upload_receipt():
    image_file = request.files.get("data")

    if not image_file or image_file.filename == '':
        return jsonify({"error": "No image file provided"}), 400

    if not allowed_file(image_file.filename):
        return jsonify({"error": "Unsupported file type"}), 400

    # Read image data
    image_data = image_file.read()

    # OCR with Google Vision
    text = scan_receipts(image_data)

    date_str = f"Today's date is {datetime.now().date()}. Message = "
    prompt = (
        date_str + "This is the current date " + text + 
        """: convert this into JSON format. Generalize the food items i.e. make lowercase and ensure spelling is correct and plural. Divide weight by average weight of item to obtain count. If an expiry date is not given, add the average expiry time onto the current date. Only output the JSON. 

        Use this JSON schema:

        Food = {"name": str, "count": int, "expiry": date}
        Return: {"pantry": list[Food], "fridge": list[Food]}
        Make sure the final output is in PROPER JSON format
        """
    )

    try:
        response_data = gemini_generator(prompt)
    except Exception as e:
        logger.error(f"Gemini generation error: {e}")
        return jsonify({"error": "Failed to generate JSON from OCR text"}), 500

    return jsonify(response_data), 201