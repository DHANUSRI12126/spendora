import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables (check backend/.env explicitly)
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(dotenv_path=env_path)
load_dotenv()

# Import blueprints from spendora package
from spendora.db import init_db
from spendora.routes.auth import auth_bp
from spendora.routes.transactions import income_bp, expenses_bp
from spendora.routes.categories import categories_bp
from spendora.routes.budgets import budgets_bp
from spendora.routes.groups import groups_bp
from spendora.routes.reports import reports_bp
from spendora.routes.ai import ai_bp
from spendora.routes.voice import voice_bp
from spendora.routes.receipts import receipts_bp

# Initialise SQLite database (creates file + tables if not exists)
init_db()

app = Flask(__name__)

# Configure CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(income_bp, url_prefix='/api/income')
app.register_blueprint(expenses_bp, url_prefix='/api/expenses')
app.register_blueprint(receipts_bp, url_prefix='/api/expenses')
app.register_blueprint(categories_bp, url_prefix='/api/categories')
app.register_blueprint(budgets_bp, url_prefix='/api/budgets')
app.register_blueprint(groups_bp, url_prefix='/api/groups')
app.register_blueprint(reports_bp, url_prefix='/api/reports')
app.register_blueprint(ai_bp, url_prefix='/api/ai')
app.register_blueprint(voice_bp, url_prefix='/api/voice')

# Base probe endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'application': 'Spendora API Server',
        'version': '1.0.0'
    }), 200

# Global Error Handlers
@app.errorhandler(404)
def resource_not_found(e):
    return jsonify({'error': 'Not Found', 'message': 'The requested resource does not exist.'}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({'error': 'Method Not Allowed', 'message': 'The HTTP method is not allowed on this endpoint.'}), 405

@app.errorhandler(500)
def internal_server_error(e):
    return jsonify({
        'error': 'Internal Server Error',
        'message': 'An unexpected server error occurred.'
    }), 500

@app.errorhandler(Exception)
def handle_unexpected_exception(e):
    print(f"Unhandled Exception: {str(e)}")
    return jsonify({
        'error': 'Internal Server Error',
        'message': f'Backend Error: {str(e)}'
    }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False)

