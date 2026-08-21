from flask import Blueprint, request, jsonify, g
from spendora.middleware.auth import token_required
from spendora.services.ai_service import analyze_spending_ai, get_budget_recommendation_ai, chat_with_ai

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/analyze', methods=['POST'])
@token_required
def analyze_spending():
    data = request.get_json() or {}
    language = data.get('language', 'en')
    try:
        analysis = analyze_spending_ai(g.current_user['id'], language=language)
        return jsonify(analysis), 200
    except Exception as e:
        return jsonify({'message': f'AI Service Error: {str(e)}'}), 500

@ai_bp.route('/budget-recommendation', methods=['POST'])
@token_required
def budget_recommendation():
    data = request.get_json() or {}
    income = data.get('income')
    language = data.get('language', 'en')

    if not income:
        return jsonify({'message': 'Income amount is required.'}), 400

    try:
        income_val = float(income)
        if income_val <= 0:
            return jsonify({'message': 'Income must be greater than zero.'}), 400
    except ValueError:
        return jsonify({'message': 'Income must be a numeric value.'}), 400

    try:
        recommendation = get_budget_recommendation_ai(g.current_user['id'], income_val, language=language)
        return jsonify(recommendation), 200
    except Exception as e:
        return jsonify({'message': f'AI Recommendation Service Error: {str(e)}'}), 500

@ai_bp.route('/chat', methods=['POST'])
@token_required
def chat():
    data = request.get_json() or {}
    query = data.get('message', '').strip()
    language = data.get('language', 'en')

    if not query:
        return jsonify({'message': 'Message is required.'}), 400

    try:
        response_text = chat_with_ai(g.current_user['id'], query, language=language)
        return jsonify({'response': response_text}), 200
    except Exception as e:
        return jsonify({'message': f'AI Chat Error: {str(e)}'}), 500
