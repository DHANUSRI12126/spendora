import json
from flask import Blueprint, request, jsonify, g
from spendora.db import get_db_connection
from spendora.middleware.auth import token_required
from spendora.services.audit import log_activity
import datetime

budgets_bp = Blueprint('budgets', __name__)

@budgets_bp.route('', methods=['POST'])
@token_required
def create_budget():
    data = request.get_json() or {}
    month = data.get('month')
    year = data.get('year')
    amount = data.get('amount')
    categories_budget = data.get('categories_budget', {}) # expects dict {cat_id: amount}

    if not month or not year or not amount:
        return jsonify({'message': 'Month, year, and total budget amount are required.'}), 400

    try:
        month_val = int(month)
        if month_val < 1 or month_val > 12:
            return jsonify({'message': 'Month must be between 1 and 12.'}), 400
    except ValueError:
        return jsonify({'message': 'Month must be an integer.'}), 400

    try:
        year_val = int(year)
        if year_val < 2020:
            return jsonify({'message': 'Year must be greater than or equal to 2020.'}), 400
    except ValueError:
        return jsonify({'message': 'Year must be an integer.'}), 400

    try:
        amount_val = float(amount)
        if amount_val <= 0:
            return jsonify({'message': 'Budget amount must be greater than zero.'}), 400
    except ValueError:
        return jsonify({'message': 'Budget amount must be a numeric value.'}), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Check if budget already exists
            cursor.execute("""
                SELECT id FROM budgets 
                WHERE user_id = %s AND month = %s AND year = %s
            """, (g.current_user['id'], month_val, year_val))
            if cursor.fetchone():
                return jsonify({'message': f'Budget already exists for {month_val}/{year_val}. Edit the existing budget instead.'}), 400

            # Convert categories_budget dict to JSON string
            categories_json = json.dumps(categories_budget)

            sql = """
                INSERT INTO budgets (user_id, month, year, amount, categories_budget)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (g.current_user['id'], month_val, year_val, amount_val, categories_json))
            budget_id = cursor.lastrowid

            log_activity(g.current_user['id'], 'BUDGET_CREATE', f'Created budget for {month_val}/{year_val}: {amount_val}', request.remote_addr)

            return jsonify({
                'message': 'Budget created successfully.',
                'budget_id': budget_id
            }), 201
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@budgets_bp.route('', methods=['GET'])
@token_required
def get_budgets():
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = "SELECT * FROM budgets WHERE user_id = %s ORDER BY year DESC, month DESC"
            cursor.execute(sql, (g.current_user['id'],))
            budgets = cursor.fetchall()
            
            # Parse categories_budget from JSON string back to dict
            for b in budgets:
                if b['categories_budget']:
                    try:
                        b['categories_budget'] = json.loads(b['categories_budget'])
                    except:
                        b['categories_budget'] = {}
                else:
                    b['categories_budget'] = {}

            return jsonify({'budgets': budgets}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@budgets_bp.route('/<int:budget_id>', methods=['GET'])
@token_required
def get_budget_by_id(budget_id):
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = "SELECT * FROM budgets WHERE id = %s AND user_id = %s"
            cursor.execute(sql, (budget_id, g.current_user['id']))
            budget = cursor.fetchone()
            if not budget:
                return jsonify({'message': 'Budget not found.'}), 404
            
            if budget['categories_budget']:
                try:
                    budget['categories_budget'] = json.loads(budget['categories_budget'])
                except:
                    budget['categories_budget'] = {}
            else:
                budget['categories_budget'] = {}
                
            return jsonify({'budget': budget}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@budgets_bp.route('/<int:budget_id>', methods=['PUT'])
@token_required
def update_budget(budget_id):
    data = request.get_json() or {}
    amount = data.get('amount')
    categories_budget = data.get('categories_budget', {})

    if not amount:
        return jsonify({'message': 'Total budget amount is required.'}), 400

    try:
        amount_val = float(amount)
        if amount_val <= 0:
            return jsonify({'message': 'Budget amount must be greater than zero.'}), 400
    except ValueError:
        return jsonify({'message': 'Budget amount must be a numeric value.'}), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Check ownership
            cursor.execute("SELECT user_id, month, year FROM budgets WHERE id = %s", (budget_id,))
            record = cursor.fetchone()
            if not record or record['user_id'] != g.current_user['id']:
                return jsonify({'message': 'Budget not found or unauthorized.'}), 404

            categories_json = json.dumps(categories_budget)

            sql = "UPDATE budgets SET amount = %s, categories_budget = %s WHERE id = %s"
            cursor.execute(sql, (amount_val, categories_json, budget_id))

            log_activity(g.current_user['id'], 'BUDGET_UPDATE', f'Updated budget ID {budget_id} to amount: {amount_val}', request.remote_addr)
            return jsonify({'message': 'Budget updated successfully.'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@budgets_bp.route('/<int:budget_id>', methods=['DELETE'])
@token_required
def delete_budget(budget_id):
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Check ownership
            cursor.execute("SELECT user_id, month, year FROM budgets WHERE id = %s", (budget_id,))
            record = cursor.fetchone()
            if not record or record['user_id'] != g.current_user['id']:
                return jsonify({'message': 'Budget not found or unauthorized.'}), 404

            cursor.execute("DELETE FROM budgets WHERE id = %s", (budget_id,))

            log_activity(g.current_user['id'], 'BUDGET_DELETE', f'Deleted budget ID {budget_id} for {record["month"]}/{record["year"]}', request.remote_addr)
            return jsonify({'message': 'Budget deleted successfully.'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@budgets_bp.route('/alert', methods=['GET'])
@token_required
def check_budget_alerts():
    """
    Checks the status of the current month's budget.
    Returns spent amount, total budget, percent used, status ('safe', 'warning', 'exceeded').
    Also checks category-specific budgets.
    """
    # Current date
    now = datetime.datetime.now()
    month = now.month
    year = now.year

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Fetch budget
            cursor.execute("""
                SELECT * FROM budgets 
                WHERE user_id = %s AND month = %s AND year = %s
            """, (g.current_user['id'], month, year))
            budget = cursor.fetchone()
            
            if not budget:
                return jsonify({
                    'has_budget': False,
                    'message': 'No budget set for the current month.'
                }), 200

            total_budget = float(budget['amount'])
            
            # Fetch total expenses for current month
            cursor.execute("""
                SELECT SUM(amount) as total_spent FROM expenses 
                WHERE user_id = %s AND MONTH(date) = %s AND YEAR(date) = %s
            """, (g.current_user['id'], month, year))
            result = cursor.fetchone()
            total_spent = float(result['total_spent'] or 0)
            
            percent_used = (total_spent / total_budget) * 100 if total_budget > 0 else 0
            
            status = 'safe'
            if percent_used >= 100:
                status = 'exceeded'
            elif percent_used >= 70:
                status = 'warning'

            # Check category-specific alerts if set
            category_alerts = []
            if budget['categories_budget']:
                try:
                    cat_budgets = json.loads(budget['categories_budget'])
                    
                    # Fetch expenses per category for this month
                    cursor.execute("""
                        SELECT category_id, SUM(amount) as amt_spent FROM expenses 
                        WHERE user_id = %s AND MONTH(date) = %s AND YEAR(date) = %s
                        GROUP BY category_id
                    """, (g.current_user['id'], month, year))
                    cat_expenses = {item['category_id']: float(item['amt_spent']) for item in cursor.fetchall()}
                    
                    for cat_id, cat_budget_str in cat_budgets.items():
                        cat_budget = float(cat_budget_str)
                        if cat_budget <= 0:
                            continue
                        cat_spent = cat_expenses.get(int(cat_id), 0.0)
                        cat_percent = (cat_spent / cat_budget) * 100
                        
                        cat_status = 'safe'
                        if cat_percent >= 100:
                            cat_status = 'exceeded'
                        elif cat_percent >= 70:
                            cat_status = 'warning'
                            
                        # Fetch category name
                        cursor.execute("SELECT name FROM categories WHERE id = %s", (cat_id,))
                        cat_info = cursor.fetchone()
                        cat_name = cat_info['name'] if cat_info else 'Unknown'
                        
                        category_alerts.append({
                            'category_id': int(cat_id),
                            'category_name': cat_name,
                            'budget': cat_budget,
                            'spent': cat_spent,
                            'percent_used': cat_percent,
                            'status': cat_status
                        })
                except Exception as ex:
                    print(f"Error parsing category budgets: {str(ex)}")

            return jsonify({
                'has_budget': True,
                'budget_id': budget['id'],
                'budget': total_budget,
                'spent': total_spent,
                'percent_used': percent_used,
                'status': status,
                'category_alerts': category_alerts
            }), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()
