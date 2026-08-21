import os
import json
import datetime
from spendora.db import get_db_connection
from google import genai
from google.genai.errors import APIError
from dotenv import load_dotenv

load_dotenv()

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
                WHERE user_id = %s AND MONTH(date) = %s AND YEAR(date) = %s
            """, (user_id, month, year))
            month_income = float(cursor.fetchone()['amt'] or 0.0)

            cursor.execute("""
                SELECT SUM(amount) AS amt FROM expenses 
                WHERE user_id = %s AND MONTH(date) = %s AND YEAR(date) = %s
            """, (user_id, month, year))
            month_expenses = float(cursor.fetchone()['amt'] or 0.0)

            # 2. Get Expenses per category (Current Month)
            cursor.execute("""
                SELECT c.name, SUM(e.amount) AS amt FROM expenses e
                JOIN categories c ON e.category_id = c.id
                WHERE e.user_id = %s AND MONTH(e.date) = %s AND YEAR(e.date) = %s
                GROUP BY c.name ORDER BY amt DESC
            """, (user_id, month, year))
            cat_breakdown = cursor.fetchall()
            
            # 3. Get monthly budget
            cursor.execute("""
                SELECT amount FROM budgets 
                WHERE user_id = %s AND month = %s AND year = %s
            """, (user_id, month, year))
            budget_row = cursor.fetchone()
            monthly_budget = float(budget_row['amount']) if budget_row else 0.0

        insights = []
        recommendations = []
        suggestions = []

        if language == 'ta':
            if monthly_budget > 0:
                percent = (month_expenses / monthly_budget) * 100
                insights.append(f"உங்கள் மாதாந்திர பட்ஜெட்டில் {percent:.1f}% செலவிட்டுள்ளீர்கள் (₹{monthly_budget:,.2f} பட்ஜெட்டில் ₹{month_expenses:,.2f} செலவிடப்பட்டுள்ளது).")
                if percent >= 100:
                    recommendations.append("உங்கள் பட்ஜெட் வரம்பு மீறிவிட்டது! அத்தியாவசியமற்ற செலவுகளை உடனடியாகக் குறைக்கவும்.")
                elif percent >= 85:
                    recommendations.append("நீங்கள் பட்ஜெட் வரம்பை நெருங்குகிறீர்கள். செலவுகளைக் கட்டுப்படுத்தவும்.")
                else:
                    recommendations.append("நன்று! நீங்கள் பட்ஜெட் வரம்பிற்குள் இருக்கிறீர்கள்.")
            else:
                insights.append("இந்த மாதத்திற்கு பட்ஜெட் எதுவும் அமைக்கப்படவில்லை. பட்ஜெட் அமைப்பது செலவைக் கட்டுப்படுத்த உதவும்.")
                recommendations.append("மாதாந்திர பட்ஜெட் வரம்பை அமைக்க பட்ஜெட்டுகள் பக்கத்திற்குச் செல்லவும்.")

            if cat_breakdown:
                highest_cat = cat_breakdown[0]['name']
                highest_amt = float(cat_breakdown[0]['amt'])
                insights.append(f"இந்த மாதத்தில் அதிக செலவான பிரிவு '{highest_cat}' (₹{highest_amt:,.2f}).")
                suggestions.append(f"'{highest_cat}' செலவுகளைக் குறைக்க தள்ளுபடிகள் மற்றும் திட்டமிடுதலைப் பயன்படுத்தவும்.")
            else:
                insights.append("இந்த மாதத்தில் இன்னும் செலவுகள் எதுவும் பதிவு செய்யப்படவில்லை.")

            if month_income > 0:
                savings_pct = ((month_income - month_expenses) / month_income) * 100
                if savings_pct > 20:
                    suggestions.append(f"சிறந்த சேமிப்பு விகிதம்! இந்த மாத வருமானத்தில் {savings_pct:.1f}% சேமித்துள்ளீர்கள்.")
                elif savings_pct > 0:
                    suggestions.append(f"உங்கள் வருமானத்தில் {savings_pct:.1f}% சேமித்துள்ளீர்கள். 20% சேமிப்பைக் குறிவையுங்கள்.")
                else:
                    suggestions.append("இந்த மாதம் வருமானத்தை விட அதிகமாக செலவு செய்துள்ளீர்கள். செலவுகளை ஆய்வு செய்யவும்.")
            suggestions.append("சம்பள நாளில் 10% தொகையை சேமிப்புக் கணக்கில் தனியாக வைக்கவும்.")
            suggestions.append("தினசரி சிறு செலவுகளைக் கண்காணிக்கவும்.")

        elif language == 'te':
            if monthly_budget > 0:
                percent = (month_expenses / monthly_budget) * 100
                insights.append(f"మీరు మీ నెలవారీ బడ్జెట్‌లో {percent:.1f}% ఖర్చు చేశారు (₹{monthly_budget:,.2f} బడ్జెట్‌లో ₹{month_expenses:,.2f} ఖర్చు అయింది).")
                if percent >= 100:
                    recommendations.append("మీ బడ్జెట్ పరిమితి దాటింది! అనవసర ఖర్చులను తగ్గించండి.")
                elif percent >= 85:
                    recommendations.append("మీరు బడ్జెట్ పరిమితికి చేరుకుంటున్నారు. నియంత్రణ పాటించండి.")
                else:
                    recommendations.append("బాగుంది! మీరు ప్రస్తుతం బడ్జెట్ పరిమితిలోనే ఉన్నారు.")
            else:
                insights.append("ఈ నెలకు ఎటువంటి బడ్జెట్ సెట్ చేయబడలేదు.")
                recommendations.append("బడ్జెట్ పరిమితిని రూపొందించడానికి బడ్జెట్ల పేజీకి వెళ్లండి.")

            if cat_breakdown:
                highest_cat = cat_breakdown[0]['name']
                highest_amt = float(cat_breakdown[0]['amt'])
                insights.append(f"ఈ నెలలో అత్యధిక ఖర్చు వర్గం '{highest_cat}' (₹{highest_amt:,.2f}).")
                suggestions.append(f"'{highest_cat}' ఖర్చులను తగ్గించడానికి ప్రయత్నించండి.")
            else:
                insights.append("ఈ నెలకు ఖర్చులు నమోదు కాలేదు.")

            if month_income > 0:
                savings_pct = ((month_income - month_expenses) / month_income) * 100
                if savings_pct > 20:
                    suggestions.append(f"అద్భుతమైన పొదుపు శాతం! మీరు మీ ఆదాయంలో {savings_pct:.1f}% పొదుపు చేశారు.")
                elif savings_pct > 0:
                    suggestions.append(f"మీరు మీ ఆదాయంలో {savings_pct:.1f}% పొదుపు చేశారు.")
                else:
                    suggestions.append("మీరు ఈ నెల సంపాదన కంటే ఎక్కువ ఖర్చు చేశారు.")
            suggestions.append("జీతం రోజున 10% మొత్తాన్ని ప్రత్యేక పొదుపు ఖాతాలో ఉంచండి.")

        elif language == 'hi':
            if monthly_budget > 0:
                percent = (month_expenses / monthly_budget) * 100
                insights.append(f"आपने अपने मासिक बजट का {percent:.1f}% खर्च किया है (₹{monthly_budget:,.2f} बजट में से ₹{month_expenses:,.2f} खर्च)।")
                if percent >= 100:
                    recommendations.append("आपका बजट पार हो गया है! अनावश्यक खर्चों को तुरंत रोकें।")
                else:
                    recommendations.append("बढ़िया! आप वर्तमान में बजट सीमा के भीतर हैं।")
            else:
                insights.append("इस महीने के लिए कोई बजट निर्धारित नहीं है।")

            if cat_breakdown:
                highest_cat = cat_breakdown[0]['name']
                highest_amt = float(cat_breakdown[0]['amt'])
                insights.append(f"इस महीने आपका उच्चतम खर्च श्रेणी '{highest_cat}' है (₹{highest_amt:,.2f})।")
            suggestions.append("वेतन दिवस पर अपनी कमाई का 10% अलग बचत खाते में रखें।")

        elif language == 'es':
            if monthly_budget > 0:
                percent = (month_expenses / monthly_budget) * 100
                insights.append(f"Has gastado el {percent:.1f}% de tu presupuesto mensual (₹{month_expenses:,.2f} gastados de ₹{monthly_budget:,.2f}).")
                if percent >= 100:
                    recommendations.append("¡Tu presupuesto ha sido excedido! Reduce gastos no esenciales.")
                else:
                    recommendations.append("¡Buen trabajo! Estás dentro de tus límites de presupuesto mensual.")
            else:
                insights.append("No has establecido un presupuesto para este mes.")

            if cat_breakdown:
                highest_cat = cat_breakdown[0]['name']
                highest_amt = float(cat_breakdown[0]['amt'])
                insights.append(f"Tu categoría de mayor gasto este mes es '{highest_cat}' con ₹{highest_amt:,.2f}.")
            suggestions.append("Reserva el 10% de tus ingresos en una cuenta de ahorros separada.")

        else:
            if monthly_budget > 0:
                percent = (month_expenses / monthly_budget) * 100
                insights.append(f"You have spent {percent:.1f}% of your monthly budget (₹{month_expenses:,.2f} spent of ₹{monthly_budget:,.2f} budget).")
                if percent >= 100:
                    recommendations.append("Your budget is exceeded! Lock down any non-essential shopping or entertainment spending immediately.")
                elif percent >= 85:
                    recommendations.append("You are nearing your budget limit. Consider trimming variable expenses for the rest of the month.")
                else:
                    recommendations.append("Good job! You are currently within your monthly budget limits.")
            else:
                insights.append("You haven't set a budget for this month. Setting a budget helps restrict impulsive purchases.")
                recommendations.append("Go to the Budgets page to create a monthly limit for your spending.")

            if cat_breakdown:
                highest_cat = cat_breakdown[0]['name']
                highest_amt = float(cat_breakdown[0]['amt'])
                insights.append(f"Your highest spending category this month is '{highest_cat}' with an expense of ₹{highest_amt:,.2f}.")
                if highest_cat in ['Food', 'Shopping', 'Entertainment']:
                    suggestions.append(f"Try lowering your '{highest_cat}' costs by looking for discounts or ordering less.")
            else:
                insights.append("No expenses logged for this month yet. Start logging expenses to see detailed category analysis.")

            if month_income > 0:
                savings_pct = ((month_income - month_expenses) / month_income) * 100
                if savings_pct > 20:
                    suggestions.append(f"Excellent saving rate! You saved {savings_pct:.1f}% of your income this month.")
                elif savings_pct > 0:
                    suggestions.append(f"You saved {savings_pct:.1f}% of your income. Standard practice suggests targeting 20%.")
                else:
                    suggestions.append("You spent more than you earned this month. Review your purchases and cut non-essentials.")
            else:
                suggestions.append("Record your monthly salary or other income sources to calculate your monthly savings rate.")

            suggestions.append("Set aside 10% of your earnings automatically on salary day to a separate savings account.")
            suggestions.append("Track small daily expenses, as micro-spending on snacks or rides can add up to large monthly sums.")

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
                WHERE user_id = %s AND MONTH(date) = %s AND YEAR(date) = %s
            """, (user_id, month, year))
            return float(cursor.fetchone()['amt'] or 0.0)
    finally:
        connection.close()

import re

def rule_based_chat(user_id, query, language='en'):
    """
    Multi-language intelligent rule-based query parser and responder.
    Responds to specific questions about monthly expenses, income, category totals,
    budget status, savings tips, and overall balance.
    """
    from spendora.routes.voice import CATEGORY_MAP
    
    query_lower = query.lower().strip()
    now = datetime.datetime.now()
    month = now.month
    year = now.year

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Monthly totals
            cursor.execute("""
                SELECT SUM(amount) AS amt FROM income 
                WHERE user_id = %s AND MONTH(date) = %s AND YEAR(date) = %s
            """, (user_id, month, year))
            m_inc = float(cursor.fetchone()['amt'] or 0.0)

            cursor.execute("""
                SELECT SUM(amount) AS amt FROM expenses 
                WHERE user_id = %s AND MONTH(date) = %s AND YEAR(date) = %s
            """, (user_id, month, year))
            m_exp = float(cursor.fetchone()['amt'] or 0.0)

            # Overall totals
            cursor.execute("SELECT SUM(amount) AS total_inc FROM income WHERE user_id = %s", (user_id,))
            t_inc = float(cursor.fetchone()['total_inc'] or 0.0)

            cursor.execute("SELECT SUM(amount) AS total_exp FROM expenses WHERE user_id = %s", (user_id,))
            t_exp = float(cursor.fetchone()['total_exp'] or 0.0)

            bal = t_inc - t_exp

            # Monthly budget
            cursor.execute("""
                SELECT amount FROM budgets 
                WHERE user_id = %s AND month = %s AND year = %s
            """, (user_id, month, year))
            budget_row = cursor.fetchone()
            monthly_budget = float(budget_row['amount']) if budget_row else 0.0

            # Category expenses
            cursor.execute("""
                SELECT c.name, SUM(e.amount) AS amt FROM expenses e
                JOIN categories c ON e.category_id = c.id
                WHERE e.user_id = %s AND MONTH(e.date) = %s AND YEAR(e.date) = %s
                GROUP BY c.name
            """, (user_id, month, year))
            cat_rows = cursor.fetchall()
            cat_expenses = {r['name']: float(r['amt']) for r in cat_rows}

    finally:
        connection.close()

    # 1. GREETINGS / HELP
    if re.search(r'\b(hi|hello|hey|வணக்கம்|நலமா|உதவி|నమస్కారం|नमस्ते|hola)\b', query_lower):
        if language == 'ta':
            return "வணக்கம்! நான் உங்கள் ஸ்பெண்டோரா AI நிதி உதவியாளர். உங்கள் செலவு, பட்ஜெட் மற்றும் சேமிப்பு தொடர்பான கேள்விகளைக் கேட்கலாம்!"
        elif language == 'te':
            return "నమస్కారం! నేను మీ స్పెండోరా AI ఆర్థిక సహాయకుడిని. మీ ఖర్చులు, బడ్జెట్ మరియు పొదుపు గురించి అడగవచ్చు!"
        elif language == 'hi':
            return "नमस्ते! मैं आपका स्पेंडोरा AI वित्तीय सहायक हूँ। आप अपने खर्च, बजट और बचत के बारे में पूछ सकते हैं!"
        elif language == 'es':
            return "¡Hola! Soy tu asistente financiero Spendora AI. ¡Puedes preguntarme sobre tus gastos, presupuesto y ahorros!"
        else:
            return "Hello! I am your Spendora AI financial assistant. Ask me about your spending, budget, or financial status!"

    # 2. CATEGORY SPECIFIC SPENDING
    matched_cat = None
    for kw, cat in CATEGORY_MAP.items():
        if kw in query_lower:
            matched_cat = cat
            break

    if matched_cat and re.search(r'\b(spent|spend|cost|expense|how much|எவ்வளவு|செலவு|ஆனது|எது|ఎంత|कितना|cuánto)\b', query_lower):
        cat_amt = cat_expenses.get(matched_cat, 0.0)
        if language == 'ta':
            return f"இந்த மாதத்தில் '{matched_cat}' பிரிவில் உங்கள் மொத்த செலவு ₹{cat_amt:,.2f}."
        elif language == 'te':
            return f"ఈ నెలలో '{matched_cat}' విభాగంలో మీ మొత్తం ఖర్చు ₹{cat_amt:,.2f}."
        elif language == 'hi':
            return f"इस महीने '{matched_cat}' श्रेणी में आपका कुल खर्च ₹{cat_amt:,.2f} है।"
        elif language == 'es':
            return f"Este mes has gastado ₹{cat_amt:,.2f} en la categoría '{matched_cat}'."
        else:
            return f"You have spent ₹{cat_amt:,.2f} on '{matched_cat}' this month."

    # 3. MONTHLY EXPENSES QUERY
    if re.search(r'\b(monthly spent|spent this month|total spent|how much spent|total expense|செலவு எவ்வளவு|மாத செலவு|செலவுகள்|செலவு|ఖర్చు|कुल खर्च|gasto total)\b', query_lower):
        if language == 'ta':
            return f"இந்த மாதத்தில் உங்கள் மொத்த செலவு ₹{m_exp:,.2f}."
        elif language == 'te':
            return f"ఈ నెలలో మీ మొత్తం ఖర్చు ₹{m_exp:,.2f}."
        elif language == 'hi':
            return f"इस महीने आपका कुल खर्च ₹{m_exp:,.2f} है।"
        elif language == 'es':
            return f"Tu gasto total de este mes es ₹{m_exp:,.2f}."
        else:
            return f"Your total expenses for this month are ₹{m_exp:,.2f}."

    # 4. MONTHLY INCOME QUERY
    if re.search(r'\b(monthly income|total income|income this month|earning|earned|வருமானம் எவ்வளவு|வருமானம்|ஆదాయం|कुल आय|ingresos)\b', query_lower):
        if language == 'ta':
            return f"இந்த மாதத்தில் உங்கள் மொத்த வருமானம் ₹{m_inc:,.2f}."
        elif language == 'te':
            return f"ఈ నెలలో మీ మొత్తం ఆదాయం ₹{m_inc:,.2f}."
        elif language == 'hi':
            return f"इस महीने आपकी कुल आय ₹{m_inc:,.2f} है।"
        elif language == 'es':
            return f"Tus ingresos totales de este mes son ₹{m_inc:,.2f}."
        else:
            return f"Your total income for this month is ₹{m_inc:,.2f}."

    # 5. BUDGET QUERY
    if re.search(r'\b(budget|remaining budget|budget limit|பட்ஜெட்|பட்ஜெட் நிலவரம்|மீதி பட்ஜெட்|வரம்பு|బడ్జెట్|बजट|presupuesto)\b', query_lower):
        if monthly_budget > 0:
            rem = monthly_budget - m_exp
            pct = (m_exp / monthly_budget) * 100
            if language == 'ta':
                return f"உங்கள் மாதாந்திர பட்ஜெட் ₹{monthly_budget:,.2f}. செலவு: ₹{m_exp:,.2f} ({pct:.1f}%). மீதம் இருப்பது ₹{rem:,.2f}."
            elif language == 'te':
                return f"మీ నెలవారీ బడ్జెట్ ₹{monthly_budget:,.2f}. ఖర్చు: ₹{m_exp:,.2f} ({pct:.1f}%). మిగిలినది ₹{rem:,.2f}."
            elif language == 'hi':
                return f"आपका मासिक बजट ₹{monthly_budget:,.2f} है। खर्च: ₹{m_exp:,.2f} ({pct:.1f}%)। शेष ₹{rem:,.2f} है।"
            elif language == 'es':
                return f"Tu presupuesto mensual es ₹{monthly_budget:,.2f}. Has gastado ₹{m_exp:,.2f} ({pct:.1f}%). Te quedan ₹{rem:,.2f}."
            else:
                return f"Your monthly budget is ₹{monthly_budget:,.2f}. You spent ₹{m_exp:,.2f} ({pct:.1f}%). Remaining: ₹{rem:,.2f}."
        else:
            if language == 'ta':
                return "இந்த மாதத்திற்கு இன்னும் பட்ஜெட் வரம்பு எதுவும் அமைக்கப்படவில்லை."
            elif language == 'te':
                return "ఈ నెలకు ఎటువంటి బడ్జెట్ సెట్ చేయబడలేదు."
            elif language == 'hi':
                return "इस महीने के लिए कोई बजट निर्धारित नहीं है।"
            else:
                return "You haven't set a budget for this month yet."

    # 6. SAVINGS / TIPS QUERY
    if re.search(r'\b(tip|advice|suggestion|save|saving|சேமிப்பு|ஆலோசனை|உதவி|நலன்|సలహా|सलाह|consejo)\b', query_lower):
        if language == 'ta':
            return "நிதி ஆலோசனை: உங்கள் சம்பள நாளில் 20% தொகையை உடனே சேமிப்புக் கணக்கில் ஒதுக்கி வைக்கப் பழகுங்கள்!"
        elif language == 'te':
            return "ఆర్థిక సలహా: మీ ఆదాయంలో కనీసం 20% మొత్తాన్ని పొదుపు ఖాతాలో ఉంచండి!"
        elif language == 'hi':
            return "वित्तीय सलाह: हर महीने अपनी आय का कम से कम 20% बचाएं!"
        else:
            return "Financial Tip: Try to automatically save at least 20% of your income on pay day!"

    # 7. BALANCE QUERY / DEFAULT
    if language == 'ta':
        return f"உங்கள் மொத்த இருப்பு ₹{bal:,.2f} (வருமானம்: ₹{t_inc:,.2f}, செலவு: ₹{t_exp:,.2f})."
    elif language == 'te':
        return f"మీ మొత్తం నిల్వ ₹{bal:,.2f} (ఆదాయం: ₹{t_inc:,.2f}, ఖర్చు: ₹{t_exp:,.2f})."
    elif language == 'hi':
        return f"आपका कुल शेष ₹{bal:,.2f} है (आय: ₹{t_inc:,.2f}, खर्च: ₹{t_exp:,.2f})।"
    elif language == 'es':
        return f"Tu saldo general es ₹{bal:,.2f} (Ingresos: ₹{t_inc:,.2f}, Gastos: ₹{t_exp:,.2f})."
    else:
        return f"Your overall balance is ₹{bal:,.2f} (Total Income: ₹{t_inc:,.2f}, Total Expenses: ₹{t_exp:,.2f})."


# ==========================================
# GEMINI MODEL HANDLERS
# ==========================================

def get_monthly_data_context(user_id):
    now = datetime.datetime.now()
    month = now.month
    year = now.year

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT amount, categories_budget FROM budgets WHERE user_id = %s AND month = %s AND year = %s", (user_id, month, year))
            budget_row = cursor.fetchone()
            budget = float(budget_row['amount']) if budget_row else 0.0
            
            cursor.execute("SELECT amount, source, date, description FROM income WHERE user_id = %s AND MONTH(date) = %s AND YEAR(date) = %s", (user_id, month, year))
            incomes = cursor.fetchall()
            for inc in incomes:
                inc['amount'] = float(inc['amount'])
                if isinstance(inc['date'], datetime.date):
                    inc['date'] = inc['date'].strftime('%Y-%m-%d')

            cursor.execute("""
                SELECT e.amount, c.name as category, e.date, e.description, e.payment_method 
                FROM expenses e
                JOIN categories c ON e.category_id = c.id
                WHERE e.user_id = %s AND MONTH(e.date) = %s AND YEAR(e.date) = %s
            """, (user_id, month, year))
            expenses = cursor.fetchall()
            for exp in expenses:
                exp['amount'] = float(exp['amount'])
                if isinstance(exp['date'], datetime.date):
                    exp['date'] = exp['date'].strftime('%Y-%m-%d')

        return {
            'month': month,
            'year': year,
            'budget': budget,
            'incomes': incomes,
            'expenses': expenses
        }
    finally:
        connection.close()

def analyze_spending_ai(user_id, language='en'):
    client = get_gemini_client()
    lang_name = LANG_NAMES.get(language, 'English')

    if not client:
        return rule_based_spending_analysis(user_id, language=language)

    context = get_monthly_data_context(user_id)
    
    prompt = f"""
    You are Spendora's expert AI financial advisor. Analyze the user's monthly spending, income, and budget data:
    {json.dumps(context, indent=2)}

    IMPORTANT: You MUST generate your ENTIRE JSON text response in the language: {lang_name}.
    Translate all insights, recommendations, and suggestions into {lang_name}.

    Generate a response in JSON format containing:
    1. "insights": A list of 2-3 bulleted observations regarding spending patterns in {lang_name}.
    2. "recommendations": A list of 1-2 actionable recommendations in {lang_name}.
    3. "suggestions": A list of 1-2 savings tips in {lang_name}.

    Output ONLY valid JSON.
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        
        parsed = json.loads(text)
        return parsed
    except Exception as e:
        print(f"Gemini API Error, falling back to local: {str(e)}")
        return rule_based_spending_analysis(user_id, language=language)

def get_budget_recommendation_ai(user_id, income, language='en'):
    client = get_gemini_client()
    lang_name = LANG_NAMES.get(language, 'English')

    if not client:
        return rule_based_budget_recommendation(income, language=language)

    context = get_monthly_data_context(user_id)

    prompt = f"""
    You are Spendora's expert AI financial advisor. The user wants to split a monthly income of ₹{income} into category budgets.
    Here is their recent monthly transactions context:
    {json.dumps(context, indent=2)}

    IMPORTANT: Write the "explanation" text field entirely in {lang_name}.
    
    Generate a JSON response containing:
    1. "total_income": The input income amount.
    2. "recommendation": A dictionary mapping standard categories (Rent, Bills, Food, Shopping, Transport, Healthcare, Education, Travel, Entertainment, Savings, Other) to numeric amounts.
    3. "explanation": A brief, professional description in {lang_name} explaining this 50/30/20 breakdown.
    
    Output ONLY valid JSON.
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        
        parsed = json.loads(text)
        return parsed
    except Exception as e:
        print(f"Gemini API Error, falling back to local budget suggestion: {str(e)}")
        return rule_based_budget_recommendation(income, language=language)

def chat_with_ai(user_id, query, language='en'):
    client = get_gemini_client()
    lang_name = LANG_NAMES.get(language, 'English')

    if not client:
        return rule_based_chat(user_id, query, language=language)

    context = get_monthly_data_context(user_id)

    prompt = f"""
    You are Spendora's personal financial chatbot assistant.
    User's finance data for this month:
    {json.dumps(context, indent=2)}

    Answer the user's question: "{query}"

    IMPORTANT: You MUST respond entirely in the language: {lang_name}.
    Keep your response concise (1-3 sentences max), actionable, and friendly.
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        return response.text.strip()
    except Exception as e:
        print(f"Gemini Chat API Error, falling back to local: {str(e)}")
        return rule_based_chat(user_id, query, language=language)
