from datetime import datetime
from flask import Blueprint, request, jsonify
from pantrypal.auth.auth_utils import authorize
from pantrypal.api.prompts import RECEIPT_BASE_PROMPT
from pantrypal.api.helpers import (
    allowed_file,
    scan_receipts,
    gemini_generator,
    ALLOWED_UNITS
)
from pantrypal.db.queries import get_inventory_unit_mapping
import logging
import json

receipt_bp = Blueprint("receipt", __name__)

logger = logging.getLogger(__name__)


@receipt_bp.route('/upload_receipt', methods=["POST"])
def upload_receipt():
    user_id, error = authorize(request)
    if error:
        return jsonify({"error": error}), 401

    image_file = request.files.get("data")

    if not image_file or image_file.filename == '':
        return jsonify({"error": "No image file provided"}), 400

    if not allowed_file(image_file.filename):
        return jsonify({"error": "Unsupported file type"}), 400

    # Read image data
    image_data = image_file.read()

    text = scan_receipts(image_data)
    logger.info("OCR text:\n%s", text)

    prompt = f"""
        Today's date is {datetime.now().date()}
        
        Scanned Receipt:
        {text}
        
        Inventory Unit Mapping:
        {json.dumps(get_inventory_unit_mapping(user_id))}

        List of allowed units:
        {json.dumps(ALLOWED_UNITS)}

        Rules for including units:
          - If an item on the scanned receipt corresponds to an item in the inventory unit mapping, use the unit associated with the item in the mapping.
          - Provide the appropriate quantity based on the chosen unit.
          - If the item on the receipt does not correspond to an item in the inventory unit mapping, use the appropriate unit from the list of allowed units.
          - All selected units MUST be in plural form AND in the list of allowed units.

        {RECEIPT_BASE_PROMPT}
    """

    try:
        response_data = gemini_generator(prompt)
    except Exception as e:
        logger.error(f"Gemini generation error: {e}")
        return jsonify({"error": "Failed to generate JSON from OCR text"}), 500

    return jsonify(response_data), 201
