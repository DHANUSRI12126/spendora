import os
import json
import datetime
from spendora.db import get_db_connection
from google import genai
from google.genai.errors import APIError
from dotenv import load_dotenv


GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

LANG_NAMES = {
    'en': 'English',
    'ta': 'Tamil (தமிழ்)',
    'te': 'Telugu (తెలుగు)',
    'hi': 'Hindi (हिन्दी)',
    'es': 'Spanish (Español)'
}

def get_gemini_client():
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key or api_key.startswith('your_'):
        return None
    try:
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Error initializing Gemini Client: {str(e)}")
        return None

# ==========================================
# LOCAL RULE-BASED FALLBACK ENGINE (MULTI-LANGUAGE)
# ==========================================

def rule_based_spending_analysis(user_id, language='en'):
    """
    Performs structured local analysis of user data with full multi-language support.
    """
    now = datetime.datetime.now()
    month = now.month
    year = now.year

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 1. Total Income & Expense (Current Month)
            cursor.execute("""
                SELECT SUM(amount) AS amt FROM income 
                WHERE user_id = ? 
                  AND CAST(strftime('%m', date) AS INTEGER) = ? 
                  AND CAST(strftime('%Y', date) AS INTEGER) = ?
            """, (user_id, month, year))
            month_income = float(cursor.fetchone()['amt'] or 0.0)

            cursor.execute("""
                SELECT SUM(amount) AS amt FROM expenses 
                WHERE user_id = ? 
                  AND CAST(strftime('%m', date) AS INTEGER) = ? 
                  AND CAST(strftime('%Y', date) AS INTEGER) = ?
            """, (user_id, month, year))
            month_expenses = float(cursor.fetchone()['amt'] or 0.0)

            # 2. Get Expenses per category (Current Month)
            cursor.execute("""
                SELECT c.name, SUM(e.amount) AS amt FROM expenses e
                JOIN categories c ON e.category_id = c.id
                WHERE e.user_id = ? 
                  AND CAST(strftime('%m', e.date) AS INTEGER) = ? 
                  AND CAST(strftime('%Y', e.date) AS INTEGER) = ?
                GROUP BY c.name ORDER BY amt DESC
            """, (user_id, month, year))
            cat_breakdown = cursor.fetchall()
            
            # 3. Get monthly budget
            cursor.execute("""
                SELECT amount FROM budgets 
                WHERE user_id = ? AND month = ? AND year = ?
            """, (user_id, month, year))
            budget_row = cursor.fetchone()
            monthly_budget = float(budget_row['amount']) if budget_row else 0.0

        insights = []
        recommendations = []
        suggestions = []

        localized = {
            'en': {
                'budget': "You have used {percent:.1f}% of your monthly budget (₹{spent:,.2f} of ₹{budget:,.2f}).",
                'over': "Your budget has been exceeded. Reduce non-essential spending.",
                'near': "You are nearing your budget limit. Keep spending in check.",
                'within': "Good work! You are within your budget.",
                'no_budget': "No budget is set for this month.",
                'set_budget': "Set a monthly budget to keep spending on track.",
                'category': "Your highest spending category this month is '{category}' (₹{amount:,.2f}).",
                'no_expenses': "No expenses have been recorded this month.",
                'reduce_category': "Review your spending in '{category}' to find savings.",
                'savings': "You saved {percent:.1f}% of your income this month.",
                'great_savings': "Great savings rate! You saved {percent:.1f}% of your income.",
                'overspent': "You spent more than you earned this month. Review non-essential purchases.",
                'no_income': "Record your income to calculate your monthly savings rate.",
                'save_tip': "Set aside 10% of your earnings on payday.",
                'track_tip': "Track small daily expenses, which can add up over the month.",
            },
            'ta': {
                'budget': "உங்கள் மாதாந்திர பட்ஜெட்டில் {percent:.1f}% செலவிட்டுள்ளீர்கள் (₹{budget:,.2f} இல் ₹{spent:,.2f}).",
                'over': "பட்ஜெட் வரம்பு மீறப்பட்டுள்ளது. தேவையற்ற செலவுகளைக் குறைக்கவும்.",
                'near': "பட்ஜெட் வரம்பை நெருங்குகிறீர்கள். செலவுகளைக் கட்டுப்படுத்தவும்.",
                'within': "நன்று! நீங்கள் பட்ஜெட் வரம்பிற்குள் இருக்கிறீர்கள்.",
                'no_budget': "இந்த மாதத்திற்கு பட்ஜெட் அமைக்கப்படவில்லை.",
                'set_budget': "செலவைக் கட்டுப்படுத்த மாதாந்திர பட்ஜெட் அமைக்கவும்.",
                'category': "இந்த மாதத்தில் அதிக செலவான பிரிவு '{category}' (₹{amount:,.2f}).",
                'no_expenses': "இந்த மாதத்தில் செலவுகள் எதுவும் பதிவு செய்யப்படவில்லை.",
                'reduce_category': "'{category}' செலவுகளைக் குறைக்க முயற்சிக்கவும்.",
                'savings': "இந்த மாதம் உங்கள் வருமானத்தில் {percent:.1f}% சேமித்துள்ளீர்கள்.",
                'great_savings': "சிறந்த சேமிப்பு விகிதம்! உங்கள் வருமானத்தில் {percent:.1f}% சேமித்துள்ளீர்கள்.",
                'overspent': "இந்த மாதம் வருமானத்தை விட அதிகமாக செலவு செய்துள்ளீர்கள். செலவுகளை ஆய்வு செய்யவும்.",
                'no_income': "சேமிப்பு விகிதத்தைக் கணக்கிட உங்கள் வருமானத்தைப் பதிவு செய்யவும்.",
                'save_tip': "சம்பள நாளில் உங்கள் வருமானத்தில் 10% சேமிக்கவும்.",
                'track_tip': "மாதாந்திரமாக அதிகரிக்கக்கூடிய சிறிய தினசரி செலவுகளைக் கண்காணிக்கவும்.",
            },
            'te': {
                'budget': "మీ నెలవారీ బడ్జెట్‌లో {percent:.1f}% ఖర్చు చేశారు (₹{budget:,.2f}లో ₹{spent:,.2f}).",
                'over': "మీ బడ్జెట్ పరిమితి దాటింది. అనవసర ఖర్చులను తగ్గించండి.",
                'near': "మీరు బడ్జెట్ పరిమితికి చేరుకుంటున్నారు. ఖర్చులను నియంత్రించండి.",
                'within': "బాగుంది! మీరు బడ్జెట్ పరిమితిలోనే ఉన్నారు.",
                'no_budget': "இந்த மாதத்திற்கு பட்ஜெட் அமைக்கப்படவில்லை.",
                'set_budget': "செலவைக் கட்டுப்படுத்த மாதாந்திர பட்ஜெட் அமைக்கவும்.",
                'category': "இந்த மாதத்தில் அதிக செலவான பிரிவு '{category}' (₹{amount:,.2f}).",
                'no_expenses': "இந்த மாதத்தில் செலவுகள் எதுவும் பதிவு செய்யப்படவில்லை.",
                'reduce_category': "'{category}' செலவுகளைக் குறைக்க முயற்சிக்கவும்.",
                'savings': "இந்த மாதம் உங்கள் ஆதாயத்தில் {percent:.1f}% சேமித்துள்ளீர்கள்.",
                'great_savings': "சிறந்த சேமிப்பு விகிதம்! உங்கள் ஆதாயத்தில் {percent:.1f}% சேமித்துள்ளீர்கள்.",
                'overspent': "இந்த மாதம் வருமானத்தை விட அதிகமாக செலவு செய்துள்ளீர்கள். செலவுகளை ஆய்வு செய்யவும்.",
                'no_income': "சேமிப்பு விகிதத்தைக் கணக்கிட உங்கள் வருமானத்தைப் பதிவு செய்யவும்.",
                'save_tip': "ஜీతం రోజున మీ ఆదాయంలో 10% పొదుపు చేయండి.",
                'track_tip': "నెలంతా పెరిగే చిన్న రోజువారీ ఖర్చులను గమనించండి.",
            },
            'hi': {
                'budget': "आपने अपने मासिक बजट का {percent:.1f}% खर्च किया है (₹{budget:,.2f} में से ₹{spent:,.2f}).",
                'over': "आपका बजट पार हो गया है। गैर-ज़रूरी खर्च कम करें।",
                'near': "आप बजट सीमा के करीब हैं। खर्च पर नियंत्रण रखें।",
                'within': "बढ़िया! आप बजट सीमा के भीतर हैं।",
                'no_budget': "इस महीने के लिए कोई बजट निर्धारित नहीं है।",
                'set_budget': "खर्च नियंत्रित करने के लिए मासिक बजट तय करें।",
                'category': "इस महीने सबसे अधिक खर्च वाली श्रेणी '{category}' है (₹{amount:,.2f}।",
                'no_expenses': "इस महीने कोई खर्च दर्ज नहीं किया गया है।",
                'reduce_category': "'{category}' के खर्चों को कम करने के तरीके देखें।",
                'savings': "इस महीने आपने अपनी आय का {percent:.1f}% बचाया।",
                'great_savings': "बचत की अच्छी दर! आपने अपनी आय का {percent:.1f}% बचाया।",
                'overspent': "इस महीने आपने कमाई से अधिक खर्च किया। गैर-ज़रूरी खर्चों की समीक्षा करें।",
                'no_income': "बचत दर जानने के लिए अपनी आय दर्ज करें।",
                'save_tip': "वेतन के दिन अपनी आय का 10% बचत खाते में रखें।",
                'track_tip': "छोटे दैनिक खर्चों को ट्रैक करें, जो महीने में बढ़ सकते हैं।",
            },
            'es': {
                'budget': "Has usado el {percent:.1f}% de tu presupuesto mensual (₹{spent:,.2f} de ₹{budget:,.2f}).",
                'over': "Has superado tu presupuesto. Reduce los gastos no esenciales.",
                'near': "Estás cerca del límite de tu presupuesto. Controla tus gastos.",
                'within': "¡Bien hecho! Estás dentro de tu presupuesto.",
                'no_budget': "No has establecido un presupuesto para este mes.",
                'set_budget': "Establece un presupuesto mensual para controlar tus gastos.",
                'category': "Tu categoría con más gastos este mes es '{category}' (₹{amount:,.2f}).",
                'no_expenses': "No se han registrado gastos este mes.",
                'reduce_category': "Revisa los gastos de '{category}' para ahorrar.",
                'savings': "Has ahorrado el {percent:.1f}% de tus ingresos este mes.",
                'great_savings': "¡Excelente ahorro! Has guardado el {percent:.1f}% de tus ingresos.",
                'overspent': "Este mes gastaste más de lo que ganaste. Revisa los gastos no esenciales.",
                'no_income': "Registra tus ingresos para calcular tu tasa de ahorro mensual.",
                'save_tip': "Ahorra el 10% de tus ingresos el día de pago.",
                'track_tip': "Controla los pequeños gastos diarios, que se acumulan durante el mes.",
            },
        }
        messages = localized.get(language, localized['en'])

        if monthly_budget > 0:
            percent = (month_expenses / monthly_budget) * 100
            insights.append(messages['budget'].format(
                percent=percent, spent=month_expenses, budget=monthly_budget
            ))
            if percent >= 100:
                recommendations.append(messages['over'])
            elif percent >= 85:
                recommendations.append(messages['near'])
            else:
                recommendations.append(messages['within'])
        else:
            insights.append(messages['no_budget'])
            recommendations.append(messages['set_budget'])

        if cat_breakdown:
            highest_cat = cat_breakdown[0]['name']
            highest_amt = float(cat_breakdown[0]['amt'])
            insights.append(messages['category'].format(
                category=highest_cat, amount=highest_amt
            ))
            suggestions.append(messages['reduce_category'].format(category=highest_cat))
        else:
            insights.append(messages['no_expenses'])

        if month_income > 0:
            savings_pct = ((month_income - month_expenses) / month_income) * 100
            if savings_pct > 20:
                suggestions.append(messages['great_savings'].format(percent=savings_pct))
            elif savings_pct > 0:
                suggestions.append(messages['savings'].format(percent=savings_pct))
            else:
                suggestions.append(messages['overspent'])
        else:
            suggestions.append(messages['no_income'])

        suggestions.append(messages['save_tip'])
        suggestions.append(messages['track_tip'])

        return {
            'insights': insights,
            'recommendations': recommendations,
            'suggestions': suggestions
        }
    finally:
        connection.close()


def rule_based_budget_recommendation(income, language='en'):
    try:
        inc_val = float(income)
    except ValueError:
        inc_val = 30000.00

    recs = {
        'Rent': round(inc_val * 0.25, 2),
        'Bills': round(inc_val * 0.15, 2),
        'Food': round(inc_val * 0.12, 2),
        'Shopping': round(inc_val * 0.08, 2),
        'Savings': round(inc_val * 0.20, 2),
        'Entertainment': round(inc_val * 0.05, 2),
        'Travel': round(inc_val * 0.05, 2),
        'Healthcare': round(inc_val * 0.05, 2),
        'Education': round(inc_val * 0.05, 2),
        'Other': 0.00
    }
    
    if language == 'ta':
        explanation = f"இந்த பட்ஜெட் பரிந்துரை 50/30/20 விதியின் அடிப்படையில் அமைக்கப்பட்டது: 50% தேவைகள் (₹{inc_val*0.50:,.2f}), 30% விருப்பங்கள் (₹{inc_val*0.30:,.2f}), மற்றும் 20% சேமிப்பு (₹{inc_val*0.20:,.2f})."
    elif language == 'te':
        explanation = f"ఈ బడ్జెట్ సిఫార్సు 50/30/20 నియమం ఆధారంగా రూపొందించబడింది: 50% అవసరాలు (₹{inc_val*0.50:,.2f}), 30% కోరికలు (₹{inc_val*0.30:,.2f}), మరియు 20% పొదుపు (₹{inc_val*0.20:,.2f})."
    elif language == 'hi':
        explanation = f"यह बजट सिफारिश 50/30/20 नियम पर आधारित है: 50% आवश्यकताएं (₹{inc_val*0.50:,.2f}), 30% इच्छाएं (₹{inc_val*0.30:,.2f}), और 20% बचत (₹{inc_val*0.20:,.2f})।"
    elif language == 'es':
        explanation = f"Esta recomendación presupuestaria se basa en la regla 50/30/20: 50% Necesidades (₹{inc_val*0.50:,.2f}), 30% Deseos (₹{inc_val*0.30:,.2f}) y 20% Ahorros (₹{inc_val*0.20:,.2f})."
    else:
        explanation = (
            f"This budget recommendation is based on the 50/30/20 rule: "
            f"50% for Needs (₹{inc_val*0.50:,.2f}), 30% for Wants (₹{inc_val*0.30:,.2f}), and 20% for Savings (₹{inc_val*0.20:,.2f})."
        )

    return {
        'total_income': inc_val,
        'recommendation': recs,
        'explanation': explanation
    }


def month_expenses_helper(user_id, month, year):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT SUM(amount) AS amt FROM expenses 
                WHERE user_id = ? 
                  AND CAST(strftime('%m', date) AS INTEGER) = ? 
                  AND CAST(strftime('%Y', date) AS INTEGER) = ?
            """, (user_id, month, year))
            return float(cursor.fetchone()['amt'] or 0.0)
    finally:
        connection.close()


def rule_based_chat(user_id, query, language='en'):
    """Answer common financial questions from the user's saved transactions."""
    from spendora.routes.voice import CATEGORY_MAP, detect_language

    query_lower = query.lower().strip()
    detected = detect_language(query, fallback_lang=language)
    if language == 'en' and detected != 'en':
        language = detected

    now = datetime.datetime.now()
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT COALESCE(SUM(amount), 0) AS total FROM income "
                "WHERE user_id = ? AND CAST(strftime('%m', date) AS INTEGER) = ? "
                "AND CAST(strftime('%Y', date) AS INTEGER) = ?",
                (user_id, now.month, now.year),
            )
            monthly_income = float(cursor.fetchone()['total'] or 0)

            cursor.execute(
                "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses "
                "WHERE user_id = ? AND CAST(strftime('%m', date) AS INTEGER) = ? "
                "AND CAST(strftime('%Y', date) AS INTEGER) = ?",
                (user_id, now.month, now.year),
            )
            monthly_expenses = float(cursor.fetchone()['total'] or 0)

            cursor.execute("SELECT COALESCE(SUM(amount), 0) AS total FROM income WHERE user_id = ?", (user_id,))
            total_income = float(cursor.fetchone()['total'] or 0)
            cursor.execute("SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ?", (user_id,))
            total_expenses = float(cursor.fetchone()['total'] or 0)

            cursor.execute(
                "SELECT amount FROM budgets WHERE user_id = ? AND month = ? AND year = ?",
                (user_id, now.month, now.year),
            )
            budget_row = cursor.fetchone()
            monthly_budget = float(budget_row['amount']) if budget_row else 0

            cursor.execute(
                "SELECT c.name, COALESCE(SUM(e.amount), 0) AS total FROM expenses e "
                "JOIN categories c ON e.category_id = c.id "
                "WHERE e.user_id = ? AND CAST(strftime('%m', e.date) AS INTEGER) = ? "
                "AND CAST(strftime('%Y', e.date) AS INTEGER) = ? GROUP BY c.name",
                (user_id, now.month, now.year),
            )
            category_expenses = {row['name']: float(row['total']) for row in cursor.fetchall()}
    finally:
        connection.close()

    if any(word in query_lower for word in ('hi', 'hello', 'hey', 'வணக்கம்', 'నమస్కారం', 'नमस्ते', 'hola')):
        greetings = {
            'ta': 'வணக்கம்! உங்கள் செலவு மற்றும் பட்ஜெட் பற்றி என்னிடம் கேளுங்கள்.',
            'te': 'నమస్కారం! మీ ఖర్చులు మరియు బడ్జెట్ గురించి అడగండి.',
            'hi': 'नमस्ते! अपने खर्च और बजट के बारे में पूछें।',
            'es': '¡Hola! Pregúntame sobre tus gastos y presupuesto.',
        }
        return greetings.get(language, 'Hello! Ask me about your spending, budget, or financial status.')

    category = next((name for keyword, name in CATEGORY_MAP.items() if keyword in query_lower), None)
    spend_words = ('spent', 'spend', 'cost', 'expense', 'how much', 'செலவு', 'ఖర్చు', 'खर्च', 'gasto')
    if category and any(word in query_lower for word in spend_words):
        amount = category_expenses.get(category, 0)
        return f"You have spent ₹{amount:,.2f} on '{category}' this month."

    if any(word in query_lower for word in ('income', 'earning', 'earned', 'வருமானம்', 'ఆదాయం', 'आय', 'ingresos')):
        return f"Your total income for this month is ₹{monthly_income:,.2f}."
    if any(word in query_lower for word in ('budget', 'பட்ஜெட்', 'బడ్జెట్', 'बजट', 'presupuesto')):
        if monthly_budget:
            remaining = monthly_budget - monthly_expenses
            percent = monthly_expenses / monthly_budget * 100
            return f"Your monthly budget is ₹{monthly_budget:,.2f}. You spent ₹{monthly_expenses:,.2f} ({percent:.1f}%). Remaining: ₹{remaining:,.2f}."
        return "You haven't set a budget for this month yet."
    if any(word in query_lower for word in ('tip', 'advice', 'suggestion', 'save', 'saving', 'சேமிப்பு', 'सलाह', 'consejo')):
        tips = {
            'ta': 'நிதி ஆலோசனை: உங்கள் வருமானத்தில் குறைந்தது 20% சேமிக்க முயற்சிக்கவும்!',
            'te': 'ఆర్థిక సలహా: మీ ఆదాయంలో కనీసం 20% పొదుపు చేయండి!',
            'hi': 'वित्तीय सलाह: हर महीने अपनी आय का कम से कम 20% बचाएं!',
            'es': 'Consejo financiero: intenta ahorrar al menos el 20% de tus ingresos.',
        }
        return tips.get(language, 'Financial tip: try to save at least 20% of your income each month.')
    if any(word in query_lower for word in ('monthly spent', 'spent this month', 'total spent', 'total expense', 'செலவு', 'खर्च', 'gasto')):
        return f"Your total expenses for this month are ₹{monthly_expenses:,.2f}."

    balance = total_income - total_expenses
    return f"Your overall balance is ₹{balance:,.2f} (Total Income: ₹{total_income:,.2f}, Total Expenses: ₹{total_expenses:,.2f})."


def get_monthly_data_context(user_id):
    """Return this month's budget, income, and expenses for the AI prompts."""
    now = datetime.datetime.now()
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT amount, categories_budget FROM budgets "
                "WHERE user_id = ? AND month = ? AND year = ?",
                (user_id, now.month, now.year),
            )
            budget_row = cursor.fetchone()
            budget = dict(budget_row) if budget_row else {'amount': 0, 'categories_budget': None}

            cursor.execute(
                "SELECT amount, source, date, description FROM income "
                "WHERE user_id = ? AND CAST(strftime('%m', date) AS INTEGER) = ? "
                "AND CAST(strftime('%Y', date) AS INTEGER) = ?",
                (user_id, now.month, now.year),
            )
            incomes = [dict(row) for row in cursor.fetchall()]

            cursor.execute(
                "SELECT e.amount, c.name AS category, e.date, e.description, e.payment_method "
                "FROM expenses e JOIN categories c ON e.category_id = c.id "
                "WHERE e.user_id = ? AND CAST(strftime('%m', e.date) AS INTEGER) = ? "
                "AND CAST(strftime('%Y', e.date) AS INTEGER) = ?",
                (user_id, now.month, now.year),
            )
            expenses = [dict(row) for row in cursor.fetchall()]

        for item in incomes + expenses:
            item['amount'] = float(item['amount'] or 0)
            if isinstance(item.get('date'), (datetime.date, datetime.datetime)):
                item['date'] = item['date'].strftime('%Y-%m-%d')

        return {
            'month': now.month,
            'year': now.year,
            'budget': budget,
            'incomes': incomes,
            'expenses': expenses,
        }
    finally:
        connection.close()


def _generate_json(prompt):
    """Ask Gemini for JSON and parse plain or fenced JSON responses."""
    client = get_gemini_client()
    if not client:
        return None
    response = client.models.generate_content(model='gemini-2.0-flash', contents=prompt)
    text = (response.text or '').strip()
    if text.startswith('```'):
        text = text.split('\n', 1)[-1]
        if text.endswith('```'):
            text = text[:-3]
    return json.loads(text.strip())


def analyze_spending_ai(user_id, language='en'):
    """Generate monthly spending insights, falling back to local analysis."""
    context = get_monthly_data_context(user_id)
    lang_name = LANG_NAMES.get(language, 'English')
    prompt = (
        "You are Spendora's financial advisor. Analyze this monthly financial data:\n"
        f"{json.dumps(context, ensure_ascii=False, indent=2)}\n"
        f"Respond entirely in {lang_name} as valid JSON only, with keys "
        '"insights" (2-3 observations), "recommendations" (1-2 actions), and '
        '"suggestions" (1-2 savings tips).'
    )
    try:
        return _generate_json(prompt) or rule_based_spending_analysis(user_id, language)
    except Exception as exc:
        print(f"Gemini analysis failed; using local fallback: {exc}")
        return rule_based_spending_analysis(user_id, language)


def get_budget_recommendation_ai(user_id, income, language='en'):
    """Recommend category budgets for an income amount."""
    try:
        income_amount = float(income)
    except (TypeError, ValueError):
        income_amount = 30000.0
    context = get_monthly_data_context(user_id)
    lang_name = LANG_NAMES.get(language, 'English')
    prompt = (
        f"Recommend category budget allocations for monthly income ₹{income_amount:.2f}. "
        f"Recent financial context: {json.dumps(context, ensure_ascii=False)}. "
        f"Explain the 50/30/20 approach in {lang_name}. Return valid JSON only with "
        '"total_income" (number), "recommendation" (category-to-number object), '
        'and "explanation" (string).'
    )
    try:
        return _generate_json(prompt) or rule_based_budget_recommendation(income_amount, language)
    except Exception as exc:
        print(f"Gemini budget recommendation failed; using local fallback: {exc}")
        return rule_based_budget_recommendation(income_amount, language)


def chat_with_ai(user_id, query, language='en'):
    """Answer a finance question with Gemini or the local rule-based assistant."""
    context = get_monthly_data_context(user_id)
    lang_name = LANG_NAMES.get(language, 'English')
    prompt = (
        "You are Spendora's concise, friendly financial assistant. Use only this "
        f"monthly financial data: {json.dumps(context, ensure_ascii=False)}\n"
        f"Answer in {lang_name}: {query}"
    )
    try:
        client = get_gemini_client()
        if client:
            response = client.models.generate_content(model='gemini-2.0-flash', contents=prompt)
            if response.text:
                return response.text.strip()
    except Exception as exc:
        print(f"Gemini chat failed; using local fallback: {exc}")
    return rule_based_chat(user_id, query, language)
