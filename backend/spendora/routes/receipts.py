import os
import json
import re
import datetime
import io
from flask import Blueprint, request, jsonify, g
from spendora.middleware.auth import token_required
from spendora.services.ai_service import get_gemini_client, LANG_NAMES
from spendora.db import get_db_connection
from google.genai import types
from PIL import Image

receipts_bp = Blueprint('receipts', __name__)

_easyocr_reader = None

def get_easyocr_reader():
    """
    Lazy loader for EasyOCR reader to avoid slow startup.
    """
    global _easyocr_reader
    if _easyocr_reader is None:
        try:
            import easyocr
            print("Initializing EasyOCR reader for local receipt scanning...")
            _easyocr_reader = easyocr.Reader(['en'], gpu=False)
        except Exception as e:
            print(f"EasyOCR reader init error: {str(e)}")
            _easyocr_reader = False
    return _easyocr_reader if _easyocr_reader is not False else None


def resolve_category(cat_name, user_id):
    """
    Finds the matching category_id and standard name from MySQL database.
    """
    if not cat_name:
        cat_name = 'Other'

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Exact case-insensitive match
            cursor.execute("""
                SELECT id, name FROM categories 
                WHERE LOWER(name) = %s AND type = 'expense' AND (is_system = TRUE OR user_id = %s)
                LIMIT 1
            """, (cat_name.strip().lower(), user_id))
            row = cursor.fetchone()
            if row:
                return row['id'], row['name']
            
            # 2. Substring matching against existing user/system categories
            cursor.execute("""
                SELECT id, name FROM categories 
                WHERE type = 'expense' AND (is_system = TRUE OR user_id = %s)
            """, (user_id,))
            rows = cursor.fetchall()
            for r in rows:
                if r['name'].lower() in cat_name.lower() or cat_name.lower() in r['name'].lower():
                    return r['id'], r['name']
            
            # 3. Default fallback to 'Other'
            cursor.execute("SELECT id, name FROM categories WHERE name = 'Other' AND type = 'expense' LIMIT 1")
            r_other = cursor.fetchone()
            if r_other:
                return r_other['id'], r_other['name']
            return 16, 'Other'
    except Exception as err:
        print(f"Error resolving category: {str(err)}")
        return 16, 'Other'
    finally:
        if connection:
            connection.close()


def parse_receipt_text_lines(text_lines, filename="receipt.jpg"):
    """
    Parses extracted OCR text lines to extract total amount, merchant, date, category, and payment method.
    """
    today_str = datetime.date.today().strftime('%Y-%m-%d')
    if not text_lines:
        return None

    full_text = " ".join(text_lines)
    text_lower = full_text.lower()

    # 1. MERCHANT NAME EXTRACTION
    ignore_headers = {
        'tax invoice', 'invoice', 'receipt', 'bill', 'welcome', 'cash memo', 
        'original', 'duplicate', 'customer copy', 'retail invoice', 'tax bill',
        'sl no', 'sn item', 'sn', 'item', 'qty', 'rate', 'price', 'amt', 'amount'
    }
    merchant_name = None
    for line in text_lines[:6]:
        cleaned = line.strip()
        if not cleaned or len(cleaned) < 2:
            continue
        if cleaned.lower() in ignore_headers:
            continue
        if re.match(r'^(date|time|phone|tel|mobile|gst|gstin|bill no|invoice no|sn|sl|no[:\.\s])', cleaned.lower()):
            continue
        if re.search(r'[a-zA-Z]{2,}', cleaned):
            merchant_name = cleaned
            break

    if not merchant_name:
        clean_file = os.path.splitext(filename)[0].replace('_', ' ').replace('-', ' ').title()
        merchant_name = f"Store ({clean_file})"

    # 2. DATE EXTRACTION
    extracted_date = today_str
    month_map = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    }

    # Pattern A: 23-Jan-2025 or 23/JAN/25
    m1 = re.search(r'\b(\d{1,2})[-/\.]([A-Za-z]{3})[-/\.](\d{2,4})\b', full_text)
    # Pattern B: 2025-01-23 or 2025/01/23
    m2 = re.search(r'\b(20\d{2})[-/\.](0?[1-9]|1[0-2])[-/\.](0?[1-9]|[12]\d|3[01])\b', full_text)
    # Pattern C: 23-01-2025 or 23/01/25
    m3 = re.search(r'\b(0?[1-9]|[12]\d|3[01])[-/\.](0?[1-9]|1[0-2])[-/\.](20\d{2}|\d{2})\b', full_text)

    if m1:
        d, m, y = m1.groups()
        m_num = month_map.get(m.lower()[:3], '01')
        y_num = f"20{y}" if len(y) == 2 else y
        extracted_date = f"{y_num}-{int(m_num):02d}-{int(d):02d}"
    elif m2:
        y, m, d = m2.groups()
        extracted_date = f"{y}-{int(m):02d}-{int(d):02d}"
    elif m3:
        d, m, y = m3.groups()
        y_num = f"20{y}" if len(y) == 2 else y
        extracted_date = f"{y_num}-{int(m):02d}-{int(d):02d}"

    # 3. AMOUNT EXTRACTION
    extracted_amount = 0.0
    total_candidates = []

    for line in text_lines:
        line_l = line.lower()
        if any(kw in line_l for kw in ['total', 'grand total', 'net amt', 'net amount', 'amount payable', 'bal due', 'to pay', 'subtotal', 'sub total', 'total:']):
            found_nums = re.findall(r'[\d,]+\.\d{2}', line)
            if not found_nums:
                found_nums = re.findall(r'\b\d+\b', line)
            for n in found_nums:
                try:
                    val = float(n.replace(',', ''))
                    if 1.0 <= val <= 500000 and val not in (2024.0, 2025.0, 2026.0):
                        total_candidates.append(val)
                except ValueError:
                    pass

    if total_candidates:
        extracted_amount = max(total_candidates)
    else:
        # Fallback: scan all monetary floats across receipt text
        all_floats = re.findall(r'[\d,]+\.\d{2}', full_text)
        valid_vals = []
        for n in all_floats:
            try:
                v = float(n.replace(',', ''))
                if 1.0 <= v <= 200000 and v not in (2024.0, 2025.0, 2026.0):
                    valid_vals.append(v)
            except ValueError:
                pass
        if valid_vals:
            extracted_amount = max(valid_vals)

    # 4. CATEGORY CLASSIFICATION
    raw_cat = 'Other'
    if re.search(r'\b(food|restaurant|cafe|dining|swiggy|zomato|burger|pizza|bakery|snack|tea|coffee|hotel|kitchen|sweet|biryani|walnut|powder|cheese|milk|juice|fruit|veg|grocery|paneer|curd|paneer|dal|rice|oil|biscuit)\b', text_lower):
        raw_cat = 'Food'
    elif re.search(r'\b(cab|uber|ola|petrol|diesel|fuel|shell|parking|toll|auto|rail|bus|flight|metro|transport|garage|service|indane)\b', text_lower):
        raw_cat = 'Transport'
    elif re.search(r'\b(mart|store|cloth|apparel|fashion|amazon|flipkart|supermarket|retail|footwear|electronic|mall|pant|shirt|shoe|dress|dmart|zudio|pantaloons)\b', text_lower):
        raw_cat = 'Shopping'
    elif re.search(r'\b(electricity|water|gas|mobile|recharge|broadband|wifi|utility|power|bill|airtel|jio|vi|tata)\b', text_lower):
        raw_cat = 'Bills'
    elif re.search(r'\b(pharmacy|medical|hospital|doctor|lab|health|clinic|drug|chemist|medicine|apollo|medplus)\b', text_lower):
        raw_cat = 'Healthcare'
    elif re.search(r'\b(book|school|college|tuition|course|stationery|fee|pen|pencil|notebook)\b', text_lower):
        raw_cat = 'Education'
    elif re.search(r'\b(hotel|resort|ticket|tour|stay|lodging|trip|make my trip|goibibo)\b', text_lower):
        raw_cat = 'Travel'
    elif re.search(r'\b(cinema|movie|pvr|theatre|event|game|park|show|ticket|inox|playstand)\b', text_lower):
        raw_cat = 'Entertainment'
    elif re.search(r'\b(rent|lease|landlord|house)\b', text_lower):
        raw_cat = 'Rent'

    # 5. PAYMENT METHOD
    payment_method = 'UPI'
    if re.search(r'\b(card|credit|debit|visa|mastercard|pos)\b', text_lower):
        payment_method = 'Card'
    elif re.search(r'\b(cash|change)\b', text_lower):
        payment_method = 'Cash'
    elif re.search(r'\b(netbanking|neft|rtgs|imps)\b', text_lower):
        payment_method = 'NetBanking'

    summary = f"Scanned receipt from {merchant_name} on {extracted_date} (Total: ₹{extracted_amount:.2f})"

    return {
        'amount': round(extracted_amount, 2),
        'date': extracted_date,
        'merchant': merchant_name,
        'category': raw_cat,
        'payment_method': payment_method,
        'summary': summary
    }


def configure_pytesseract():
    try:
        import pytesseract
        import shutil
        if shutil.which('tesseract'):
            return True
        possible_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tesseract', 'tesseract.exe'),
            os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Tesseract-OCR', 'tesseract.exe'),
            os.path.join(os.environ.get('PROGRAMFILES', 'C:\\Program Files'), 'Tesseract-OCR', 'tesseract.exe')
        ]
        for p in possible_paths:
            if os.path.exists(p):
                pytesseract.pytesseract.tesseract_cmd = p
                return True
    except Exception as e:
        print(f"Pytesseract config error: {e}")
    return False


def local_ocr_scan(image_bytes, filename):
    """
    Extracts text lines using EasyOCR or PyTesseract and parses details.
    """
    text_lines = []

    # 1. Try EasyOCR
    reader = get_easyocr_reader()
    if reader:
        try:
            results = reader.readtext(image_bytes, detail=0)
            if results:
                text_lines = [str(r).strip() for r in results if str(r).strip()]
        except Exception as e:
            print(f"EasyOCR read error: {str(e)}")

    # 2. Try PyTesseract if EasyOCR didn't yield results
    if not text_lines:
        try:
            import pytesseract
            configure_pytesseract()
            img = Image.open(io.BytesIO(image_bytes))
            # Convert image to RGB/Grayscale for clean text extraction
            img_gray = img.convert('L')
            raw = pytesseract.image_to_string(img_gray)
            lines = [l.strip() for l in raw.split('\n') if l.strip()]
            if lines:
                text_lines = lines
        except Exception as e:
            print(f"PyTesseract read error: {str(e)}")

    if text_lines:
        parsed = parse_receipt_text_lines(text_lines, filename)
        if parsed and parsed.get('amount', 0) > 0:
            return parsed
        elif parsed:
            # If text lines were extracted but amount was 0, keep parsed info
            return parsed

    # 3. Fallback if no OCR engine could read text lines
    today_str = datetime.date.today().strftime('%Y-%m-%d')
    cleaned = filename.lower()
    if 'food' in cleaned or 'swiggy' in cleaned or 'zomato' in cleaned:
        raw_cat = 'Food'
        merchant_name = 'Restaurant & Dining'
    elif 'cab' in cleaned or 'uber' in cleaned or 'petrol' in cleaned:
        raw_cat = 'Transport'
        merchant_name = 'Fuel / Transport'
    elif 'mart' in cleaned or 'shop' in cleaned or 'amazon' in cleaned:
        raw_cat = 'Shopping'
        merchant_name = 'Supermarket / Store'
    else:
        raw_cat = 'Other'
        clean_file = os.path.splitext(filename)[0].replace('_', ' ').replace('-', ' ').title()
        merchant_name = f"Bill ({clean_file})"

    return {
        'amount': 0.00,
        'date': today_str,
        'merchant': merchant_name,
        'category': raw_cat,
        'payment_method': 'UPI',
        'summary': f'Uploaded receipt image ({filename}). Set GEMINI_API_KEY in backend/.env for AI Vision extraction.'
    }


@receipts_bp.route('/scan-receipt', methods=['POST'])
@token_required
def scan_receipt():
    """
    Multimodal AI Receipt Scanner endpoint.
    Runs Vision AI via Gemini 2.0 or local EasyOCR text extraction,
    and returns structured receipt details (amount, date, merchant, category, category_id, payment_method).
    """
    file = request.files.get('receipt') or request.files.get('file')
    language = request.form.get('language', 'en')

    if not file:
        return jsonify({'message': 'No receipt image file uploaded.'}), 400

    image_bytes = file.read()
    mime_type = file.mimetype or 'image/jpeg'
    filename = file.filename or 'receipt.jpg'

    client = get_gemini_client()
    lang_name = LANG_NAMES.get(language, 'English')

    scanned_data = None

    if client:
        try:
            prompt = f"""
            You are an expert AI financial receipt scanner. Extract key details from this receipt image.
            
            Return ONLY a valid JSON object with the following fields:
            1. "amount": Total numeric expense amount (number, e.g. 249.50). If not found, default to 0.0.
            2. "date": Date of receipt in YYYY-MM-DD format. Default to today's date if missing.
            3. "merchant": Specific Merchant name or store title printed on receipt (e.g., "D-Mart", "Starbucks", "Amazon", "Shell Gas").
            4. "category": Best matching category from: Food, Transport, Shopping, Bills, Healthcare, Education, Travel, Entertainment, Rent, Other.
            5. "payment_method": Detected payment method from: UPI, Card, Cash, NetBanking.
            6. "summary": Brief receipt summary in {lang_name}.

            Output ONLY valid JSON.
            """

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt
                ]
            )

            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            scanned_data = json.loads(text)

        except Exception as e:
            print(f"Gemini Vision error, using local OCR engine: {str(e)}")

    # If Gemini key missing or Gemini failed, use Local OCR engine
    if not scanned_data:
        scanned_data = local_ocr_scan(image_bytes, filename)

    # Resolve database category ID and standard category name
    raw_cat_name = scanned_data.get('category', 'Other')
    cat_id, cat_standard_name = resolve_category(raw_cat_name, g.current_user['id'])
    
    scanned_data['category_id'] = cat_id
    scanned_data['category'] = cat_standard_name

    # Ensure merchant is clean
    if not scanned_data.get('merchant') or scanned_data.get('merchant') == 'Scanned Receipt':
        scanned_data['merchant'] = f"Expense ({scanned_data['category']})"

    return jsonify({
        'success': True,
        'scanned_data': scanned_data
    }), 200

