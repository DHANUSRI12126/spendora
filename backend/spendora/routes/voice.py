import re
from flask import Blueprint, request, jsonify, g
from spendora.middleware.auth import token_required
from spendora.services.ai_service import chat_with_ai
from spendora.db import get_db_connection

voice_bp = Blueprint('voice', __name__)

CATEGORY_MAP = {
    # Food
    'food': 'Food', 'dinner': 'Food', 'lunch': 'Food', 'grocery': 'Food', 'groceries': 'Food', 
    'restaurant': 'Food', 'starbucks': 'Food', 'cafe': 'Food', 'saapadu': 'Food', 'hotel': 'Food',
    'உணவு': 'Food', 'சாப்பாடு': 'Food', 'ஹோட்டல்': 'Food', 'டிபன்': 'Food', 'சாப்பிடு': 'Food',
    'ஆஹாரம்': 'Food', 'भोजन': 'Food', 'खाना': 'Food', 'comida': 'Food',

    # Transport
    'transport': 'Transport', 'transportation': 'Transport', 'uber': 'Transport', 'cab': 'Transport', 
    'taxi': 'Transport', 'bus': 'Transport', 'train': 'Transport', 'fuel': 'Transport', 'petrol': 'Transport', 
    'ola': 'Transport', 'travel': 'Transport',
    'போக்குவரத்து': 'Transport', 'பஸ்': 'Transport', 'பெட்ரோல்': 'Transport', 'டாக்ஸி': 'Transport', 
    'ஆட்டோ': 'Transport', 'கார்': 'Transport', 'ரயில்': 'Transport',
    'రవాణా': 'Transport', 'परिवहन': 'Transport', 'transporte': 'Transport',

    # Shopping
    'shopping': 'Shopping', 'clothes': 'Shopping', 'shoes': 'Shopping', 'amazon': 'Shopping', 'purchase': 'Shopping',
    'dress': 'Shopping', 'thuni': 'Shopping',
    'கொள்முதல்': 'Shopping', 'ஷாப்பிங்': 'Shopping', 'துணி': 'Shopping', 'டிரஸ்': 'Shopping',
    'షాపింగ్': 'Shopping', 'खरीदारी': 'Shopping', 'compras': 'Shopping',

    # Bills
    'bills': 'Bills', 'bill': 'Bills', 'electricity': 'Bills', 'water': 'Bills', 'wifi': 'Bills', 
    'internet': 'Bills', 'phone': 'Bills', 'recharge': 'Bills', 'utilities': 'Bills', 'current': 'Bills',
    'பில்': 'Bills', 'கரண்ட்': 'Bills', 'மின்சார': 'Bills', 'ரீசார்ஜ்': 'Bills', 'மொபைல்': 'Bills',
    'బిల్లులు': 'Bills', 'बिल': 'Bills', 'facturas': 'Bills',

    # Healthcare
    'healthcare': 'Healthcare', 'doctor': 'Healthcare', 'medicine': 'Healthcare', 'pharmacy': 'Healthcare', 'clinic': 'Healthcare',
    'மருந்து': 'Healthcare', 'டாக்டர்': 'Healthcare', 'மருத்துவமனை': 'Healthcare', 'சுகாதாரம்': 'Healthcare',
    'ఆరోగ్య': 'Healthcare', 'स्वास्थ्य': 'Healthcare', 'salud': 'Healthcare',

    # Education
    'education': 'Education', 'books': 'Education', 'course': 'Education', 'fees': 'Education', 'school': 'Education', 'college': 'Education',
    'கல்வி': 'Education', 'புத்தகம்': 'Education', 'படிப்புக்': 'Education', 'பள்ளி': 'Education', 'கல்லூரி': 'Education',
    'విద్య': 'Education', 'शिक्षा': 'Education', 'educación': 'Education',

    # Travel
    'travel': 'Travel', 'flight': 'Travel', 'hotel': 'Travel', 'trip': 'Travel', 'booking': 'Travel',
    'பயணம்': 'Travel', 'டிக்கெட்': 'Travel', 'டூர்': 'Travel',
    'ప్రయాణం': 'Travel', 'यात्रा': 'Travel', 'viajes': 'Travel',

    # Rent
    'rent': 'Rent', 'apartment': 'Rent', 'house': 'Rent', 'room': 'Rent', 'vaadagai': 'Rent',
    'வாடகை': 'Rent', 'ரூம்': 'Rent', 'வீடு': 'Rent',
    'అద్దె': 'Rent', 'किराया': 'Rent', 'alquiler': 'Rent',

    # Entertainment
    'entertainment': 'Entertainment', 'movie': 'Entertainment', 'netflix': 'Entertainment', 'spotify': 'Entertainment', 'gaming': 'Entertainment',
    'பொழுதுபோக்கு': 'Entertainment', 'படம்': 'Entertainment', 'சினிமா': 'Entertainment',
    'వినోదం': 'Entertainment', 'मनोरंजन': 'Entertainment', 'entretenimiento': 'Entertainment'
}


def parse_add_expense_command(text_lower):
    """
    Parses add expense intent across Tamil, Tanglish, English, Telugu, Hindi, Spanish.
    """
    amount_match = re.search(r'\b(\d+(?:\.\d+)?)\b', text_lower)
    if not amount_match:
        return None

    amount = float(amount_match.group(1))
    if amount <= 0:
        return None

    action_keywords = [
        'add', 'log', 'record', 'spent', 'pay', 'paid', 'expense',
        'சேர்', 'சேர்க்கவும்', 'செலவு', 'ரூபாய்', 'ரூ', 'ஆனது', 'ஆகிவிட்டது',
        'జోడించు', 'ఖర్చు', 'రూపాయలు',
        'जोड़ें', 'खर्च', 'रुपये',
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
    """
    data = request.get_json() or {}
    text = data.get('text', '').strip()
    language = data.get('language', 'en')

    if not text:
        return jsonify({'message': 'No text provided.'}), 400

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
                cursor.execute("SELECT id FROM categories WHERE name = %s AND (is_system=TRUE OR user_id=%s)", (matched_category, g.current_user['id']))
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
            response_message = f"₹{amount:,.2f} தொகையை {matched_category} செலவாக சேர்க்க விரும்புகிறீர்களா?"
        elif language == 'te':
            response_message = f"మీరు ₹{amount:,.2f} ను {matched_category} ఖర్చుగా జోడించాలనుకుంటున్నారా?"
        elif language == 'hi':
            response_message = f"क्या आप ₹{amount:,.2f} को {matched_category} खर्च के रूप में जोड़ना चाहते हैं?"
        elif language == 'es':
            response_message = f"¿Deseas agregar ₹{amount:,.2f} como gasto de {matched_category}?"
        else:
            response_message = f"Do you want to add ₹{amount:,.2f} as a {matched_category} expense?"

    else:
        # Pass to multi-language chat_with_ai
        intent = 'QUERY_FINANCES'
        response_message = chat_with_ai(g.current_user['id'], text, language=language)

    return jsonify({
        'intent': intent,
        'entities': entities,
        'message': response_message
    }), 200

