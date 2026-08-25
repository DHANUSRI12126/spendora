import re
import bcrypt
from flask import Blueprint, request, jsonify, g
from spendora.db import get_db_connection
from spendora.middleware.auth import token_required
from spendora.utils.jwt_utils import generate_token
from spendora.services.audit import log_activity

auth_bp = Blueprint('auth', __name__)

EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    confirm_password = data.get('confirm_password', '')
    role = 'USER'

    # Validations
    if not full_name or not email or not password:
        return jsonify({'message': 'All fields are required.'}), 400

    if not re.match(EMAIL_REGEX, email):
        return jsonify({'message': 'Please provide a valid email address.'}), 400

    if len(password) < 6:
        return jsonify({'message': 'Password must be at least 6 characters long.'}), 400

    if password != confirm_password:
        return jsonify({'message': 'Passwords do not match.'}), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Check for duplicate email
            cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
            if cursor.fetchone():
                return jsonify({'message': 'Email is already registered.'}), 400

            # Hash password
            salt = bcrypt.gensalt(rounds=12)
            password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

            # Insert user
            sql = """
                INSERT INTO users (full_name, email, password_hash, role, status)
                VALUES (?, ?, ?, ?, 'active')
            """
            cursor.execute(sql, (full_name, email, password_hash, role))
            user_id = cursor.lastrowid

            # Log registration activity
            log_activity(user_id, 'REGISTER', f'User registered with email {email}', request.remote_addr)

            return jsonify({
                'message': 'Registration successful.',
                'user': {
                    'id': user_id,
                    'full_name': full_name,
                    'email': email,
                    'role': 'USER'
                }
            }), 201
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'message': 'Email and password are required.'}), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
            user = cursor.fetchone()

            if not user:
                return jsonify({'message': 'Invalid email or password.'}), 401

            if user['status'] == 'inactive':
                return jsonify({'message': 'Your account has been deactivated. Please contact support.'}), 403

            # Verify bcrypt password hash
            if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                return jsonify({'message': 'Invalid email or password.'}), 401

            # Generate JWT
            token = generate_token(user['id'], user['email'], user['role'])

            log_activity(user['id'], 'LOGIN', f'User logged in from {request.remote_addr}', request.remote_addr)

            return jsonify({
                'message': 'Login successful.',
                'token': token,
                'user': {
                    'id': user['id'],
                    'full_name': user['full_name'],
                    'email': user['email'],
                    'role': user['role']
                }
            }), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout():
    # Logging out is handled client side by removing the token, but we record it in audit logs
    log_activity(g.current_user['id'], 'LOGOUT', f'User logged out from {request.remote_addr}', request.remote_addr)
    return jsonify({'message': 'Logout successful.'}), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def me():
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, full_name, email, role, status, created_at FROM users WHERE id = ?", (g.current_user['id'],))
            user = cursor.fetchone()
            if not user:
                return jsonify({'message': 'User not found.'}), 404
            return jsonify({'user': user}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    data = request.get_json() or {}
    full_name = data.get('full_name', '').strip()
    password = data.get('password', '')

    if not full_name:
        return jsonify({'message': 'Full name is required.'}), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            if password:
                if len(password) < 6:
                    return jsonify({'message': 'Password must be at least 6 characters long.'}), 400
                salt = bcrypt.gensalt(rounds=12)
                password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
                
                sql = "UPDATE users SET full_name = ?, password_hash = ? WHERE id = ?"
                cursor.execute(sql, (full_name, password_hash, g.current_user['id']))
            else:
                sql = "UPDATE users SET full_name = ? WHERE id = ?"
                cursor.execute(sql, (full_name, g.current_user['id']))

            log_activity(g.current_user['id'], 'PROFILE_UPDATE', 'User updated profile details', request.remote_addr)
            return jsonify({'message': 'Profile updated successfully.'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

# ==========================================
# FORGOT & RESET PASSWORD ENDPOINTS
# ==========================================

import random
RESET_CODES = {}

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()

    if not email or not re.match(EMAIL_REGEX, email):
        return jsonify({'message': 'Please provide a valid registered email address.'}), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, full_name FROM users WHERE email = ?", (email,))
            user = cursor.fetchone()

            if not user:
                return jsonify({'message': 'User with this email address does not exist.'}), 404

            # Generate 6-digit OTP code
            code = str(random.randint(100000, 999999))
            RESET_CODES[email] = {
                'code': code,
                'user_id': user['id']
            }

            log_activity(user['id'], 'FORGOT_PASSWORD_REQUEST', f'Reset code generated for {email}', request.remote_addr)

            return jsonify({
                'message': f'Verification code generated successfully.',
                'reset_code': code,
                'email': email
            }), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    reset_code = data.get('reset_code', '').strip()
    new_password = data.get('new_password', '')
    confirm_password = data.get('confirm_password', '')

    if not email or not reset_code or not new_password:
        return jsonify({'message': 'Email, reset code, and new password are required.'}), 400

    if len(new_password) < 6:
        return jsonify({'message': 'New password must be at least 6 characters long.'}), 400

    if confirm_password and new_password != confirm_password:
        return jsonify({'message': 'Passwords do not match.'}), 400

    saved = RESET_CODES.get(email)
    if not saved or saved['code'] != reset_code:
        return jsonify({'message': 'Invalid or expired verification code.'}), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            salt = bcrypt.gensalt(rounds=12)
            password_hash = bcrypt.hashpw(new_password.encode('utf-8'), salt).decode('utf-8')

            cursor.execute("UPDATE users SET password_hash = ? WHERE email = ?", (password_hash, email))
            
            # Clear reset code
            RESET_CODES.pop(email, None)

            log_activity(saved['user_id'], 'PASSWORD_RESET_SUCCESS', f'Password reset completed for {email}', request.remote_addr)

            return jsonify({'message': 'Password reset successful! You can now log in with your new password.'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()
