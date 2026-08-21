import os
import datetime
import jwt
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv('JWT_SECRET', 'spendora_fallback_secret_key_129381')

def generate_token(user_id, email, role):
    """
    Generates a JWT token for a given user, containing user_id, email, and role.
    Expires in 24 hours.
    """
    try:
        payload = {
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
            'iat': datetime.datetime.utcnow(),
            'sub': user_id,
            'email': email,
            'role': role
        }
        return jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    except Exception as e:
        print(f"Error generating token: {str(e)}")
        return None

def decode_token(token):
    """
    Decodes the JWT token.
    Returns the decoded payload if valid, or None if expired/invalid.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        print("Token has expired.")
        return None
    except jwt.InvalidTokenError:
        print("Invalid token.")
        return None
