import re
from flask import Blueprint, request, jsonify, g
from spendora.middleware.auth import token_required
from spendora.services.ai_service import chat_with_ai
from spendora.db import get_db_connection

voice_bp = Blueprint('voice', __name__)

CATEGORY_MAP = {
    # Food
    'food': 'Food', 'dinner': 'Food', 'lunch': 'Food', 'breakfast': 'Food', 'grocery': 'Food', 'groceries': 'Food', 
    'restaurant': 'Food', 'starbucks': 'Food', 'cafe': 'Food', 'saapadu': 'Food', 'sapadu': 'Food', 'hotel': 'Food',
    'tiffin': 'Food', 'tiffen': 'Food',
    'உணவு': 'Food', 'சாப்பாடு': 'Food', 'ஹோட்டல்': 'Food', 'டிபன்': 'Food', 'சாப்பிடு': 'Food',
    'ஆஹாரம்': 'Food', 'भोजन': 'Food', 'खाना': 'Food', 'comida': 'Food',

    # Transport
    'transport': 'Transport', 'transportation': 'Transport', 'uber': 'Transport', 'cab': 'Transport', 
    'taxi': 'Transport', 'bus': 'Transport', 'train': 'Transport', 'fuel': 'Transport', 'petrol': 'Transport', 
    'diesel': 'Transport', 'ola': 'Transport', 'auto': 'Transport',
    'paiyanathirukku': 'Transport', 'payanathirukku': 'Transport', 'payanam': 'Transport', 'paiyanam': 'Transport', 'travel': 'Transport',
    'போக்குவரத்து': 'Transport', 'பஸ்': 'Transport', 'பெட்ரோல்': 'Transport', 'டாக்ஸி': 'Transport', 
    'ஆட்டோ': 'Transport', 'கார்': 'Transport', 'ரயில்': 'Transport', 'பயணம்': 'Transport', 'பயணத்திற்கு': 'Transport',
    'రవాణా': 'Transport', 'परिवहन': 'Transport', 'transporte': 'Transport',

    # Shopping
    'shopping': 'Shopping', 'clothes': 'Shopping', 'shoes': 'Shopping', 'amazon': 'Shopping', 'flipkart': 'Shopping',
    'purchase': 'Shopping', 'dress': 'Shopping', 'thuni': 'Shopping',
    'கொள்முதல்': 'Shopping', 'ஷாப்பிங்': 'Shopping', 'துணி': 'Shopping', 'டிரஸ்': 'Shopping',
    'షాపింగ్': 'Shopping', 'खरीदारी': 'Shopping', 'compras': 'Shopping',

    # Bills
    'bills': 'Bills', 'bill': 'Bills', 'electricity': 'Bills', 'water': 'Bills', 'wifi': 'Bills', 
    'internet': 'Bills', 'phone': 'Bills', 'recharge': 'Bills', 'utilities': 'Bills', 'current': 'Bills', 'eb': 'Bills',
    'பில்': 'Bills', 'கரண்ட்': 'Bills', 'மின்சார': 'Bills', 'மின்சாரம்': 'Bills', 'ரீசார்ஜ்': 'Bills', 'மொபைல்': 'Bills',
    'బిల్లులు': 'Bills', 'बिल': 'Bills', 'facturas': 'Bills',

    # Healthcare
    'healthcare': 'Healthcare', 'doctor': 'Healthcare', 'medicine': 'Healthcare', 'pharmacy': 'Healthcare', 'clinic': 'Healthcare', 'hospital': 'Healthcare',
    'மருந்து': 'Healthcare', 'டாக்டர்': 'Healthcare', 'மருத்துவமனை': 'Healthcare', 'சுகாதாரம்': 'Healthcare',
    'ఆరోగ్య': 'Healthcare', 'स्वास्थ्य': 'Healthcare', 'salud': 'Healthcare',

    # Education
    'education': 'Education', 'books': 'Education', 'course': 'Education', 'fees': 'Education', 'school': 'Education', 'college': 'Education', 'tuition': 'Education',
    'கல்வி': 'Education', 'புத்தகம்': 'Education', 'படிப்புக்': 'Education', 'பள்ளி': 'Education', 'கல்லூரி': 'Education', 'கட்டணம்': 'Education',
    'విద్య': 'Education', 'शिक्षा': 'Education', 'educación': 'Education',

    # Travel
    'trip': 'Travel', 'flight': 'Travel', 'tour': 'Travel', 'booking': 'Travel', 'resort': 'Travel',
    'டூர்': 'Travel', 'டிக்கெட்': 'Travel',
    'ప్రయాణం': 'Travel', 'यात्रा': 'Travel', 'viajes': 'Travel',

    # Rent
    'rent': 'Rent', 'apartment': 'Rent', 'house': 'Rent', 'room': 'Rent', 'vaadagai': 'Rent',
    'வாடகை': 'Rent', 'ரூம்': 'Rent', 'வீடு': 'Rent',
    'అద్దె': 'Rent', 'किराया': 'Rent', 'alquiler': 'Rent',

    # Entertainment
    'entertainment': 'Entertainment', 'movie': 'Entertainment', 'cinema': 'Entertainment', 'netflix': 'Entertainment', 'spotify': 'Entertainment', 'gaming': 'Entertainment',
    'பொழுதுபோக்கு': 'Entertainment', 'படம்': 'Entertainment', 'சினிமா': 'Entertainment',
    'వినోదం': 'Entertainment', 'मनोरंजन': 'Entertainment', 'entretenimiento': 'Entertainment'
}

WORD_TO_NUMBER = {
    # Tamil & Tanglish Numbers
    'onnu': 1, 'ondru': 1, 'rendu': 2, 'irandu': 2, 'moonu': 3, 'moondru': 3,
    'naalu': 4, 'naangu': 4, 'anju': 5, 'ainthu': 5, 'aaru': 6, 'ezhu': 7,
    'ettu': 8, 'onbadhu': 9, 'patthu': 10, 'pathu': 10, 'irubadhu': 20,
    'muppadhu': 30, 'naappadhu': 40, 'aimbadhu': 50, 'arubadhu': 60,
    'ezhubadhu': 70, 'enbhadhu': 80, 'thollayiram': 900,
    'nooru': 100, 'irunooru': 200, 'irunuru': 200, 'munnooru': 300, 'munnuru': 300,
    'naanooru': 400, 'nanuru': 400, 'ainnooru': 500, 'annuru': 500, 'aanooru': 600,
    'ezhanooru': 700, 'ennanooru': 800, 'aayiram': 1000, 'ayiram': 1000,
    'ஒன்று': 1, 'இரண்டு': 2, 'மூன்று': 3, 'நான்கு': 4, 'ஐந்து': 5, 'ஆறு': 6,
    'ஏழு': 7, 'எட்டு': 8, 'ஒன்பது': 9, 'பத்து': 10, 'இருபது': 20, 'முப்பது': 30,
    'நாற்பது': 40, 'ஐம்பது': 50, 'நூறு': 100, 'இருநூறு': 200, 'முந்நூறு': 300,
    'முன்னூறு': 300, 'நானூறு': 400, 'ஐந்நூறு': 500, 'ஆயிரம்': 1000,

    # Hindi Numbers
    'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'paanch': 5, 'sau': 100, 'doh sau': 200, 'teen sau': 300,
    'char sau': 400, 'paanch sau': 500, 'hazaar': 1000,
    'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'सौ': 100, 'दो सौ': 200, 'तीन सौ': 300, 'हजार': 1000,

    # Telugu Numbers
    'okati': 1, 'rendu': 2, 'moodu': 3, 'naalugu': 4, 'aidu': 5, 'vanda': 100,
    'rendu vandalu': 200, 'moodu vandalu': 300, 'veyyi': 1000,
    'ఒకటి': 1, 'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5, 'వంద': 100,

    # English Numbers
    'fifty': 50, 'hundred': 100, 'two hundred': 200, 'three hundred': 300,
    'four hundred': 400, 'five hundred': 500, 'thousand': 1000
}


def detect_language(text, fallback_lang='en'):
    """
    Detects language from text characters (Tamil, Hindi, Telugu, Spanish) 
    or Tanglish/transliterated keywords.
    """
    if not text:
        return fallback_lang

    # 1. Unicode Script Checks (Definitive)
    # Tamil Unicode Block: U+0B80 - U+0BFF
    if re.search(r'[\u0b80-\u0bff]', text):
        return 'ta'
    # Devanagari / Hindi Unicode Block: U+0900 - U+097F
    if re.search(r'[\u0900-\u097f]', text):
        return 'hi'
    # Telugu Unicode Block: U+0C00 - U+0C7F
    if re.search(r'[\u0c00-\u0c7f]', text):
        return 'te'

    text_lower = text.lower()

    # 2. Transliterated / Tanglish / Regional Keyword Detection
    tamil_words = [
        'paiyanathirukku', 'payanathirukku', 'payanam', 'paiyanam', 'saapadu', 'sapadu',
        'selavu', 'evvalavu', 'evlo', 'kaasu', 'panam', 'ser', 'serthedu', 'rubai', 'roobai',
        'vanakkam', 'munnuru', 'irunuru', 'aayiram', 'nooru', 'anniki', 'inda', 'indha',
        'thuni', 'vaadagai', 'tiffen', 'kuduthen', 'vaanginen', 'bay', 'podu'
    ]
    if any(re.search(rf'\b{w}\b', text_lower) for w in tamil_words):
        return 'ta'

    hindi_words = [
        'kharch', 'kitna', 'batao', 'jodo', 'jodein', 'rupaye', 'aamdani', 'bachat',
        'namaste', 'kaise', 'paisa', 'paise', 'doh sau', 'teen sau', 'paanch sau'
    ]
    if any(re.search(rf'\b{w}\b', text_lower) for w in hindi_words):
        return 'hi'

    telugu_words = [
        'kharchu', 'enta', 'jodinchu', 'rupayalu', 'aadaayam', 'namaskaram', 'podupu'
    ]
    if any(re.search(rf'\b{w}\b', text_lower) for w in telugu_words):
        return 'te'

    spanish_words = [
        'gasto', 'gasté', 'gastos', 'dinero', 'presupuesto', 'saldo', 'cuánto', 'comida',
        'añadir', 'agregar', 'hola'
    ]
    if any(re.search(rf'\b{w}\b', text_lower) for w in spanish_words):
        return 'es'

    return fallback_lang


def parse_add_expense_command(text_lower):
    """
    Parses add expense intent across Tamil, Tanglish, English, Telugu, Hindi, Spanish.
    Supports both numeric digits (e.g. 250, 300) and spoken number words (e.g. munnuru, sau).
    """
    amount = None

    # 1. Direct digits
    amount_match = re.search(r'\b(\d+(?:\.\d+)?)\b', text_lower)
    if amount_match:
        val = float(amount_match.group(1))
        if val > 0:
            amount = val

    # 2. Number words in Tamil, Tanglish, Hindi, Telugu, English
    if not amount:
        sorted_words = sorted(WORD_TO_NUMBER.keys(), key=lambda w: len(w), reverse=True)
        for w in sorted_words:
            if re.search(rf'(?:\b|^){re.escape(w)}(?:\b|$)', text_lower):
                amount = float(WORD_TO_NUMBER[w])
                break

    if not amount or amount <= 0:
        return None

    action_keywords = [
        'add', 'log', 'record', 'spent', 'pay', 'paid', 'expense',
        'சேர்', 'சேர்க்கவும்', 'செலவு', 'ரூபாய்', 'ரூ', 'ஆனது', 'ஆகிவிட்டது', 'போடு',
        'ser', 'podu', 'bay', 'rubai', 'roobai', 'kuduthen', 'vaanginen',
        'జోడించు', 'ఖర్చు', 'రూపాయలు',
        'जोड़ें', 'खर्च', 'रुपये', 'डालो',
        'agregar', 'añadir', 'gasto', 'gasté'
    ]

    has_action = any(kw in text_lower for kw in action_keywords)

    matched_cat = 'Other'
    found_cat = False
    for kw, standard_cat in CATEGORY_MAP.items():
        if kw in text_lower:
            matched_cat = standard_cat
            found_cat = True
            break

    if found_cat or has_action:
        return {
            'amount': amount,
            'category': matched_cat
        }

    return None


@voice_bp.route('/command', methods=['POST'])
@token_required
def process_voice_command():
    """
    Parses a voice command transcript sent from the frontend.
    Identifies intents (ADD_EXPENSE, QUERY_FINANCES) and extracts entities (amount, category).
    Automatically detects language if needed and guarantees replies in the user's language.
    """
    data = request.get_json() or {}
    text = data.get('text', '').strip()
    req_lang = data.get('language', 'en')

    if not text:
        return jsonify({'message': 'No text provided.'}), 400

    # Auto-detect language if specified as 'en' but text is in Tamil, Hindi, Telugu, Spanish, etc.
    detected = detect_language(text, fallback_lang=req_lang)
    language = detected if (req_lang == 'en' and detected != 'en') else req_lang

    text_lower = text.lower()
    intent = 'UNKNOWN'
    entities = {}
    response_message = ""

    parsed_expense = parse_add_expense_command(text_lower)
    
    if parsed_expense:
        intent = 'ADD_EXPENSE'
        amount = parsed_expense['amount']
        matched_category = parsed_expense['category']
        
        # Fetch category ID from DB
        connection = get_db_connection()
        category_id = 16 # default 'Other'
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM categories WHERE name = ? AND (is_system=1 OR user_id=?)", (matched_category, g.current_user['id']))
                row = cursor.fetchone()
                if row:
                    category_id = row['id']
        finally:
            connection.close()

        entities = {
            'amount': amount,
            'category': matched_category,
            'category_id': category_id,
            'description': f"Voice added {matched_category}"
        }

        if language == 'ta':
            ta_cats = {
                'Food': 'உணவு (Food)', 'Transport': 'போக்குவரத்து (Transport)', 
                'Shopping': 'ஷாப்பிங் (Shopping)', 'Bills': 'பில்கள் (Bills)', 
                'Healthcare': 'மருத்துவம் (Healthcare)', 'Education': 'கல்வி (Education)',
                'Travel': 'பயணம் (Travel)', 'Rent': 'வாடகை (Rent)',
                'Entertainment': 'பொழுதுபோக்கு (Entertainment)', 'Other': 'மற்றவை (Other)'
            }
            c_name = ta_cats.get(matched_category, matched_category)
            response_message = f"₹{amount:,.2f} தொகையை {c_name} செலவாக சேர்க்க விரும்புகிறீர்களா?"
        elif language == 'te':
            te_cats = {
                'Food': 'ఆహారం (Food)', 'Transport': 'రవాణా (Transport)', 
                'Shopping': 'షాపింగ్ (Shopping)', 'Bills': 'బిల్లులు (Bills)', 
                'Healthcare': 'ఆరోగ్యం (Healthcare)', 'Education': 'విద్య (Education)',
                'Travel': 'ప్రయాణం (Travel)', 'Rent': 'అద్దె (Rent)',
                'Entertainment': 'వినోదం (Entertainment)', 'Other': 'ఇతర (Other)'
            }
            c_name = te_cats.get(matched_category, matched_category)
            response_message = f"మీరు ₹{amount:,.2f} ను {c_name} ఖర్చుగా జోడించాలనుకుంటున్నారా?"
        elif language == 'hi':
            hi_cats = {
                'Food': 'खाना (Food)', 'Transport': 'परिवहन (Transport)', 
                'Shopping': 'खरीदारी (Shopping)', 'Bills': 'बिल (Bills)', 
                'Healthcare': 'स्वास्थ्य (Healthcare)', 'Education': 'शिक्षा (Education)',
                'Travel': 'यात्रा (Travel)', 'Rent': 'किराया (Rent)',
                'Entertainment': 'मनोरंजन (Entertainment)', 'Other': 'अन्य (Other)'
            }
            c_name = hi_cats.get(matched_category, matched_category)
            response_message = f"क्या आप ₹{amount:,.2f} को {c_name} खर्च के रूप में जोड़ना चाहते हैं?"
        elif language == 'es':
            response_message = f"¿Deseas agregar ₹{amount:,.2f} como gasto de {matched_category}?"
        else:
            response_message = f"Do you want to add ₹{amount:,.2f} as a {matched_category} expense?"

    else:
        # Pass to multi-language chat_with_ai with guaranteed language
        intent = 'QUERY_FINANCES'
        response_message = chat_with_ai(g.current_user['id'], text, language=language)

    return jsonify({
        'intent': intent,
        'entities': entities,
        'message': response_message,
        'language': language
    }), 200

