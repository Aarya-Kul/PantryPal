import os
import json
from datetime import datetime
from google import genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
gemini_key = os.getenv("GEMINI_API_KEY")
if not gemini_key:
    raise ValueError("Gemini API key not set in .env")

# Initialize Gemini client (newer SDK pattern)
client = genai.Client(api_key=gemini_key)

# Example receipt text
text = """06/01/2016
ZUCHINNI GREEN
$4.66
0.778kg NET @ $5.99/kg
BANANA CAVENDISH
$1.32
0.442kg NET @ $2.99/kg
POTATOES BRUSHED
$3.97
1.328kg NET @ $2.99/kg
BROCCOLI
$4.84
0.808kg NET @ $5.99/kg
BRUSSEL SPROUTS
$5.15
0.322kg NET @ $15.99/kg
GRAPES GREEN
$7.03
1.174kg NET @ $5.99/kg
PEAS SNOW
$3.27
0.218kg NET @ $14.99/kg
TOMATOES GRAPE
$2.99
LETTUCE ICEBERG
$2.49
PASTA PENNE
$2.49
OATS ROLLED
$3.99
MILK FULL CREAM
$3.89
YOGURT GREEK
$23.00
BEANS BLACK
$1.29
CORN CANNED
$1.49
SUBTOTAL $39.20
CASH $50.00
CHANGE $25.80
"""

# Current date string
date_str = f"Today's date is {datetime.now().date()}. Message = "

# Build prompt
prompt = (
    date_str + text +
"""
Convert the following receipt text into JSON following the rules below. 
Only output valid JSON. Do not include explanations.

## FOOD NORMALIZATION RULES
## 1. NAME NORMALIZATION
- Convert food names to lowercase.
- Correct spelling.
- Use correct pluralization (e.g., “banana”, “bananas”; “broccoli” stays “broccoli”).

## 2. HOW TO INFER QUANTITY (EXTREMELY IMPORTANT)
Extract or infer:
  "quantity_value": number,
  "quantity_unit": str,

Follow this decision tree **in order**:

### **A. If weight is given (e.g., “0.778kg NET @ $5.99/kg”)**
- Use the weight as the base signal.
- Decide whether to convert weight → units using the rules below.

### **B. If item is typically sold “by unit” (bananas, apples, onions, cucumbers, zucchini, etc.)**
- Use unit count if given or if weight then follow:
- Convert weight → estimated count.
- Use typical average weights of the item
- Set `"quantity_unit": "unit"`.

### **C. If item is typically sold “by weight” (grapes, potatoes, broccoli, meat, bulk items, etc.)**
- Keep the weight exactly.
- Set `"quantity_unit": "kg"`.

### **D. If item is typically sold as a PACKAGE (pasta bag, yogurt tub, oats container, canned goods)**
Infer quantity and units from:
- typical package size,
- total price,
- or naming conventions.

Examples (not fixed as the quantity can vary based on rules above):
- “pasta penne” → `"quantity_unit": "g", "quantity_value": 500`
- “yogurt greek” → `"quantity_unit": "kg", "quantity_value": 1` or `"quantity_unit": "g", "quantity_value": 500`

If inference is uncertain:
- Use `"quantity_unit": "package"` and `"quantity_value": 1"`.

## 3. EXPIRY DATE INFERENCE
- If no expiry date exists, add the average shelf life for that food to the current date to create `expiry_date`.

======================
JSON SCHEMA
======================
{
  "pantry": [Food],
  "fridge": [Food]
}

Where each Food object:
{
  "name": string,
  "quantity_value": number,
  "quantity_unit": string,
  "expiry_date": string
}

Sort items into:
- "fridge": produce, milk, yogurt, anything perishable.
- "pantry": canned goods, pasta, oats, dry goods.

Output ONLY valid JSON.
"""
)

# Generate structured response
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt
)

generated_text = response.text

# Clean the output if it has ```json markers
clean_json = generated_text.replace("```json", "").replace("```", "").strip()

# Parse JSON
try:
    structured_data = json.loads(clean_json)
    print(json.dumps(structured_data, indent=2))
except json.JSONDecodeError:
    print("Failed to parse JSON output:")
    print(clean_json)
