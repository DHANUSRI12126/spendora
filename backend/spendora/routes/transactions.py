from flask import Blueprint, request, jsonify, g
from spendora.db import get_db_connection
from spendora.middleware.auth import token_required
from spendora.services.audit import log_activity
from spendora.services.notifications import create_notification
import datetime

income_bp = Blueprint('income', __name__)
expenses_bp = Blueprint('expenses', __name__)

# ==========================================
# INCOME ENDPOINTS
# ==========================================

@income_bp.route('', methods=['POST'])
@token_required
def create_income():
    data = request.get_json() or {}
    amount = data.get('amount')
    source = data.get('source', '').strip()
    date_str = data.get('date', '').strip()
    description = data.get('description', '').strip()
    notes = data.get('notes', '').strip()

    if not amount or not source or not date_str:
        return jsonify({'message': 'Amount, source, and date are required.'}), 400

    try:
        amount_val = float(amount)
        if amount_val <= 0:
            return jsonify({'message': 'Amount must be greater than zero.'}), 400
    except ValueError:
        return jsonify({'message': 'Amount must be a numeric value.'}), 400

    try:
        date_val = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD.'}), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                INSERT INTO income (user_id, amount, source, date, description, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            """
            cursor.execute(sql, (g.current_user['id'], amount_val, source, str(date_val), description, notes))
            income_id = cursor.lastrowid
            
            log_activity(g.current_user['id'], 'INCOME_CREATE', f'Added income: {source} - {amount_val}', request.remote_addr)
            
            return jsonify({
                'message': 'Income added successfully.',
                'income_id': income_id
            }), 201
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@income_bp.route('', methods=['GET'])
@token_required
def get_incomes():
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = "SELECT * FROM income WHERE user_id = ? ORDER BY date DESC"
            cursor.execute(sql, (g.current_user['id'],))
            incomes = cursor.fetchall()
            return jsonify({'income': incomes}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@income_bp.route('/<int:income_id>', methods=['GET'])
@token_required
def get_income_by_id(income_id):
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = "SELECT * FROM income WHERE id = ? AND user_id = ?"
            cursor.execute(sql, (income_id, g.current_user['id']))
            income = cursor.fetchone()
            if not income:
                return jsonify({'message': 'Income record not found.'}), 404
            return jsonify({'income': income}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@income_bp.route('/<int:income_id>', methods=['PUT'])
@token_required
def update_income(income_id):
    data = request.get_json() or {}
    amount = data.get('amount')
    source = data.get('source', '').strip()
    date_str = data.get('date', '').strip()
    description = data.get('description', '').strip()
    notes = data.get('notes', '').strip()

    if not amount or not source or not date_str:
        return jsonify({'message': 'Amount, source, and date are required.'}), 400

    try:
        amount_val = float(amount)
        if amount_val <= 0:
            return jsonify({'message': 'Amount must be greater than zero.'}), 400
    except ValueError:
        return jsonify({'message': 'Amount must be a numeric value.'}), 400

    try:
        date_val = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD.'}), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Check ownership
            cursor.execute("SELECT user_id FROM income WHERE id = ?", (income_id,))
            record = cursor.fetchone()
            if not record or record['user_id'] != g.current_user['id']:
                return jsonify({'message': 'Income record not found or unauthorized.'}), 404

            sql = """
                UPDATE income 
                SET amount = ?, source = ?, date = ?, description = ?, notes = ? 
                WHERE id = ? AND user_id = ?
            """
            cursor.execute(sql, (amount_val, source, str(date_val), description, notes, income_id, g.current_user['id']))
            
            log_activity(g.current_user['id'], 'INCOME_UPDATE', f'Updated income ID {income_id}: {source} - {amount_val}', request.remote_addr)
            return jsonify({'message': 'Income updated successfully.'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@income_bp.route('/<int:income_id>', methods=['DELETE'])
@token_required
def delete_income(income_id):
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Check ownership
            cursor.execute("SELECT user_id, amount, source FROM income WHERE id = ?", (income_id,))
            record = cursor.fetchone()
            if not record or record['user_id'] != g.current_user['id']:
                return jsonify({'message': 'Income record not found or unauthorized.'}), 404

            cursor.execute("DELETE FROM income WHERE id = ? AND user_id = ?", (income_id, g.current_user['id']))
            
            log_activity(g.current_user['id'], 'INCOME_DELETE', f'Deleted income ID {income_id}: {record["source"]} - {record["amount"]}', request.remote_addr)
            return jsonify({'message': 'Income deleted successfully.'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

# ==========================================
# EXPENSE ENDPOINTS
# ==========================================

@expenses_bp.route('', methods=['POST'])
@token_required
def create_expense():
    data = request.get_json() or {}
    amount = data.get('amount')
    category_id = data.get('category_id')
    date_str = data.get('date', '').strip()
    payment_method = data.get('payment_method', '').strip()
    description = data.get('description', '').strip()
    notes = data.get('notes', '').strip()

    if not amount or not category_id or not date_str or not payment_method or not description:
        return jsonify({'message': 'Amount, category_id, date, payment method, and description are required.'}), 400

    try:
        amount_val = float(amount)
        if amount_val <= 0:
            return jsonify({'message': 'Amount must be greater than zero.'}), 400
    except (ValueError, TypeError):
        return jsonify({'message': 'Amount must be a numeric value.'}), 400

    try:
        category_id_val = int(category_id)
    except (ValueError, TypeError):
        return jsonify({'message': 'Invalid category selected.'}), 400

    try:
        date_val = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD.'}), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Verify category exists and is valid for user
            cursor.execute("SELECT * FROM categories WHERE id = ? AND (is_system = 1 OR user_id = ?)", (category_id_val, g.current_user['id']))
            category = cursor.fetchone()
            if not category:
                return jsonify({'message': 'Invalid category selected.'}), 400

            # Insert expense
            sql = """
                INSERT INTO expenses (user_id, amount, category_id, date, payment_method, description, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """
            cursor.execute(sql, (g.current_user['id'], amount_val, category_id_val, str(date_val), payment_method, description, notes))
            expense_id = cursor.lastrowid
            
            # Check monthly budget and generate alerts
            try:
                month = date_val.month
                year = date_val.year
                
                cursor.execute("SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ?", (g.current_user['id'], month, year))
                budget = cursor.fetchone()
                if budget:
                    total_budget = float(budget['amount'])
                    
                    cursor.execute("""
                        SELECT SUM(amount) as total_spent FROM expenses 
                        WHERE user_id = ? AND CAST(strftime('%m', date) AS INTEGER) = ? AND CAST(strftime('%Y', date) AS INTEGER) = ?
                    """, (g.current_user['id'], month, year))
                    result = cursor.fetchone()
                    total_spent = float(result['total_spent']) if (result and result.get('total_spent')) else 0.0
                    
                    percent_used = (total_spent / total_budget) * 100
                    
                    if percent_used >= 100:
                        cursor.execute("""
                            INSERT INTO notifications (user_id, title, message, type, is_read)
                            VALUES (?, ?, ?, ?, 0)
                        """, (g.current_user['id'], 'Budget Exceeded!', f'Warning: You have exceeded your monthly budget of ₹{total_budget:,.2f}. Spent so far: ₹{total_spent:,.2f}.', 'budget_alert'))
                    elif percent_used >= 85:
                        cursor.execute("""
                            INSERT INTO notifications (user_id, title, message, type, is_read)
                            VALUES (?, ?, ?, ?, 0)
                        """, (g.current_user['id'], 'Budget Warning (85%)', f'Caution: You have utilized {percent_used:.1f}% of your monthly budget (₹{total_budget:,.2f}). Spent: ₹{total_spent:,.2f}.', 'budget_alert'))
                    elif percent_used >= 70:
                        cursor.execute("""
                            INSERT INTO notifications (user_id, title, message, type, is_read)
                            VALUES (?, ?, ?, ?, 0)
                        """, (g.current_user['id'], 'Budget Warning (70%)', f'Notification: You have utilized {percent_used:.1f}% of your monthly budget (₹{total_budget:,.2f}). Spent: ₹{total_spent:,.2f}.', 'budget_alert'))
            except Exception as b_err:
                print(f"Budget notification check error (non-fatal): {str(b_err)}")

            log_activity(g.current_user['id'], 'EXPENSE_CREATE', f'Added expense: {description} - {amount_val}', request.remote_addr)
            
            return jsonify({
                'message': 'Expense added successfully.',
                'expense_id': expense_id
            }), 201
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@expenses_bp.route('', methods=['GET'])
@token_required
def get_expenses():
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                SELECT e.*, c.name AS category_name FROM expenses e
                JOIN categories c ON e.category_id = c.id
                WHERE e.user_id = ? 
                ORDER BY e.date DESC
            """
            cursor.execute(sql, (g.current_user['id'],))
            expenses = cursor.fetchall()
            return jsonify({'expenses': expenses}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@expenses_bp.route('/<int:expense_id>', methods=['GET'])
@token_required
def get_expense_by_id(expense_id):
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                SELECT e.*, c.name AS category_name FROM expenses e
                JOIN categories c ON e.category_id = c.id
                WHERE e.id = ? AND e.user_id = ?
            """
            cursor.execute(sql, (expense_id, g.current_user['id']))
            expense = cursor.fetchone()
            if not expense:
                return jsonify({'message': 'Expense record not found.'}), 404
            return jsonify({'expense': expense}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@expenses_bp.route('/<int:expense_id>', methods=['PUT'])
@token_required
def update_expense(expense_id):
    data = request.get_json() or {}
    amount = data.get('amount')
    category_id = data.get('category_id')
    date_str = data.get('date', '').strip()
    payment_method = data.get('payment_method', '').strip()
    description = data.get('description', '').strip()
    notes = data.get('notes', '').strip()

    if not amount or not category_id or not date_str or not payment_method or not description:
        return jsonify({'message': 'Amount, category_id, date, payment method, and description are required.'}), 400

    try:
        amount_val = float(amount)
        if amount_val <= 0:
            return jsonify({'message': 'Amount must be greater than zero.'}), 400
    except ValueError:
        return jsonify({'message': 'Amount must be a numeric value.'}), 400

    try:
        date_val = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD.'}), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Check ownership
            cursor.execute("SELECT user_id FROM expenses WHERE id = ?", (expense_id,))
            record = cursor.fetchone()
            if not record or record['user_id'] != g.current_user['id']:
                return jsonify({'message': 'Expense record not found or unauthorized.'}), 404

            # Verify category
            cursor.execute("SELECT * FROM categories WHERE id = ? AND (is_system = 1 OR user_id = ?)", (category_id, g.current_user['id']))
            category = cursor.fetchone()
            if not category:
                return jsonify({'message': 'Invalid category selected.'}), 400

            sql = """
                UPDATE expenses 
                SET amount = ?, category_id = ?, date = ?, payment_method = ?, description = ?, notes = ? 
                WHERE id = ? AND user_id = ?
            """
            cursor.execute(sql, (amount_val, category_id, str(date_val), payment_method, description, notes, expense_id, g.current_user['id']))
            
            log_activity(g.current_user['id'], 'EXPENSE_UPDATE', f'Updated expense ID {expense_id}: {description} - {amount_val}', request.remote_addr)
            return jsonify({'message': 'Expense updated successfully.'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@expenses_bp.route('/<int:expense_id>', methods=['DELETE'])
@token_required
def delete_expense(expense_id):
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Check ownership
            cursor.execute("SELECT user_id, amount, description FROM expenses WHERE id = ?", (expense_id,))
            record = cursor.fetchone()
            if not record or record['user_id'] != g.current_user['id']:
                return jsonify({'message': 'Expense record not found or unauthorized.'}), 404

            cursor.execute("DELETE FROM expenses WHERE id = ? AND user_id = ?", (expense_id, g.current_user['id']))
            
            log_activity(g.current_user['id'], 'EXPENSE_DELETE', f'Deleted expense ID {expense_id}: {record["description"]} - {record["amount"]}', request.remote_addr)
            return jsonify({'message': 'Expense deleted successfully.'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

# ==========================================
# UNIFIED TRANSACTIONS ENDPOINT
# ==========================================

@expenses_bp.route('/unified', methods=['GET'])
@token_required
def get_unified_transactions():
    """
    Returns a unified timeline list of both income and expense items.
    Supports filtering by type, category, date, and keyword searches.
    """
    search = request.args.get('search', '').strip()
    txn_type = request.args.get('type', '').strip().lower() # 'income', 'expense', or empty/all
    category_id = request.args.get('category_id', '')
    start_date = request.args.get('start_date', '')
    end_date = request.args.get('end_date', '')
    sort_by = request.args.get('sort_by', 'date') # 'date' or 'amount'
    sort_order = request.args.get('sort_order', 'desc').lower() # 'asc' or 'desc'

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Query income
            income_query = """
                SELECT id, amount, source AS name, date, description, notes, 'income' AS type, 
                       NULL AS category_id, 'Income' AS category_name, NULL AS payment_method
                FROM income 
                WHERE user_id = ?
            """
            
            # Query expenses
            expense_query = """
                SELECT e.id, e.amount, e.description AS name, e.date, e.description, e.notes, 'expense' AS type, 
                       e.category_id, c.name AS category_name, e.payment_method
                FROM expenses e
                JOIN categories c ON e.category_id = c.id
                WHERE e.user_id = ?
            """
            
            income_params = [g.current_user['id']]
            expense_params = [g.current_user['id']]
            
            # Subfilters
            if search:
                income_query += " AND (source LIKE ? OR description LIKE ? OR notes LIKE ?)"
                income_params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
                
                expense_query += " AND (e.description LIKE ? OR e.notes LIKE ?)"
                expense_params.extend([f"%{search}%", f"%{search}%"])
                
            if start_date:
                income_query += " AND date >= ?"
                income_params.append(start_date)
                expense_query += " AND e.date >= ?"
                expense_params.append(start_date)
                
            if end_date:
                income_query += " AND date <= ?"
                income_params.append(end_date)
                expense_query += " AND e.date <= ?"
                expense_params.append(end_date)

            if category_id:
                expense_query += " AND e.category_id = ?"
                expense_params.append(category_id)
                cursor.execute("SELECT type FROM categories WHERE id = ?", (category_id,))
                cat = cursor.fetchone()
                if cat and cat['type'] == 'income':
                    expense_query += " AND 1=0"
                else:
                    income_query += " AND 1=0"

            # Execute based on txn_type
            transactions = []
            if txn_type == 'income':
                cursor.execute(income_query, tuple(income_params))
                transactions = list(cursor.fetchall())
            elif txn_type == 'expense':
                cursor.execute(expense_query, tuple(expense_params))
                transactions = list(cursor.fetchall())
            else:
                cursor.execute(income_query, tuple(income_params))
                incomes = list(cursor.fetchall())
                
                cursor.execute(expense_query, tuple(expense_params))
                expenses = list(cursor.fetchall())
                
                transactions = incomes + expenses

            # Sort combined results
            is_desc = sort_order == 'desc'
            if sort_by == 'amount':
                transactions.sort(key=lambda x: float(x['amount']), reverse=is_desc)
            else: # date — SQLite returns ISO strings so direct comparison works
                transactions.sort(key=lambda x: x['date'] or '', reverse=is_desc)

            return jsonify({'transactions': transactions}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()
