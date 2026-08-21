from functools import wraps
from flask import request, jsonify, g
from spendora.utils.jwt_utils import decode_token

def token_required(f):
    """
    Decorator to protect routes. Verifies the JWT token from the Authorization header.
    Injects current_user details into Flask's global context variable 'g'.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check if Authorization header is present
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                # Expecting 'Bearer <token>'
                token_type, token = auth_header.split(" ")
                if token_type.lower() != 'bearer':
                    return jsonify({'message': 'Invalid token header format. Use: Bearer <token>'}), 401
            except ValueError:
                return jsonify({'message': 'Authorization header must be in the format: Bearer <token>'}), 401

        if not token:
            return jsonify({'message': 'Access token is missing.'}), 401

        payload = decode_token(token)
        if not payload:
            return jsonify({'message': 'Access token is invalid or has expired.'}), 401

        # Store user details in global context 'g'
        g.current_user = {
            'id': payload['sub'],
            'email': payload['email'],
            'role': payload['role']
        }
        
        return f(*args, **kwargs)
    
    return decorated

def role_required(allowed_roles):
    """
    Decorator to restrict access based on roles (e.g., 'ADMIN', 'USER').
    Assumes token_required has already been executed on the route.
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # Ensure user is authenticated
            if not hasattr(g, 'current_user') or not g.current_user:
                return jsonify({'message': 'Authentication required.'}), 401
            
            # Check user role
            user_role = g.current_user.get('role')
            if user_role not in allowed_roles:
                return jsonify({'message': 'Unauthorized access. Insufficient permissions.'}), 403
                
            return f(*args, **kwargs)
        return decorated
    return decorator

def admin_required(f):
    """
    Convenience decorator to restrict access to ADMIN users only.
    """
    return token_required(role_required(['ADMIN'])(f))
