from datetime import datetime
from flask import Blueprint, request, jsonify
from pantrypal.api.prompts import RECEIPT_BASE_PROMPT
from pantrypal.api.helpers import (
    allowed_file,
    scan_receipts,
    gemini_generator
)
import logging

receipt_bp = Blueprint("receipt", __name__)

logger = logging.getLogger(__name__)


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