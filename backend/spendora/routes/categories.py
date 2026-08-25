from flask import Blueprint, request, jsonify, g
from spendora.db import get_db_connection
from spendora.middleware.auth import token_required
from spendora.services.audit import log_activity

categories_bp = Blueprint('categories', __name__)

@categories_bp.route('', methods=['GET'])
@token_required
def get_categories():
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Regular user gets system categories + their own custom categories
            # Admin gets all categories
            if g.current_user['role'] == 'ADMIN':
                sql = "SELECT * FROM categories ORDER BY is_system DESC, name ASC"
                cursor.execute(sql)
            else:
                sql = """
                    SELECT * FROM categories 
                    WHERE (is_system = 1 OR user_id = ?) AND status = 'active'
                    ORDER BY is_system DESC, name ASC
                """
                cursor.execute(sql, (g.current_user['id'],))
            
            categories = cursor.fetchall()
            return jsonify({'categories': categories}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@categories_bp.route('', methods=['POST'])
@token_required
def create_category():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    cat_type = data.get('type', '').strip().lower() # 'income' or 'expense'

    if not name or not cat_type:
        return jsonify({'message': 'Category name and type (income/expense) are required.'}), 400

    if cat_type not in ['income', 'expense']:
        return jsonify({'message': 'Type must be "income" or "expense".'}), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Check if category already exists (system-wide or for this user)
            check_sql = """
                SELECT id FROM categories 
                WHERE name = ? AND type = ? AND (is_system = 1 OR user_id = ?)
            """
            cursor.execute(check_sql, (name, cat_type, g.current_user['id']))
            if cursor.fetchone():
                return jsonify({'message': f'A category named "{name}" already exists.'}), 400

            # Determine system flag based on role
            is_admin = g.current_user['role'] == 'ADMIN'
            is_system = 1 if is_admin else 0
            user_id = None if is_admin else g.current_user['id']

            sql = """
                INSERT INTO categories (name, type, is_system, user_id, status)
                VALUES (?, ?, ?, ?, 'active')
            """
            cursor.execute(sql, (name, cat_type, is_system, user_id))
            cat_id = cursor.lastrowid

            log_activity(g.current_user['id'], 'CATEGORY_CREATE', f'Created category: {name} ({cat_type})', request.remote_addr)

            return jsonify({
                'message': 'Category created successfully.',
                'category': {
                    'id': cat_id,
                    'name': name,
                    'type': cat_type,
                    'is_system': is_system,
                    'user_id': user_id,
                    'status': 'active'
                }
            }), 201
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@categories_bp.route('/<int:cat_id>', methods=['PUT'])
@token_required
def update_category(cat_id):
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    status = data.get('status', 'active').strip().lower()

    if not name:
        return jsonify({'message': 'Category name is required.'}), 400

    if status not in ['active', 'inactive']:
        return jsonify({'message': 'Status must be "active" or "inactive".'}), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Check ownership
            cursor.execute("SELECT * FROM categories WHERE id = ?", (cat_id,))
            category = cursor.fetchone()
            if not category:
                return jsonify({'message': 'Category not found.'}), 404

            # Enforce access: normal user can only update their own categories, system categories are admin-only
            if g.current_user['role'] != 'ADMIN':
                if category['is_system'] or category['user_id'] != g.current_user['id']:
                    return jsonify({'message': 'Unauthorized to modify this category.'}), 403

            # Update category
            sql = "UPDATE categories SET name = ?, status = ? WHERE id = ?"
            cursor.execute(sql, (name, status, cat_id))

            log_activity(g.current_user['id'], 'CATEGORY_UPDATE', f'Updated category ID {cat_id} to name={name}, status={status}', request.remote_addr)
            return jsonify({'message': 'Category updated successfully.'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@categories_bp.route('/<int:cat_id>', methods=['DELETE'])
@token_required
def delete_category(cat_id):
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM categories WHERE id = ?", (cat_id,))
            category = cursor.fetchone()
            if not category:
                return jsonify({'message': 'Category not found.'}), 404

            if g.current_user['role'] != 'ADMIN':
                if category['is_system'] or category['user_id'] != g.current_user['id']:
                    return jsonify({'message': 'Unauthorized to delete this category.'}), 403

            # Delete the category (relational integrity ON DELETE CASCADE will handle references)
            cursor.execute("DELETE FROM categories WHERE id = ?", (cat_id,))

            log_activity(g.current_user['id'], 'CATEGORY_DELETE', f'Deleted category ID {cat_id} ({category["name"]})', request.remote_addr)
            return jsonify({'message': 'Category deleted successfully.'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()
