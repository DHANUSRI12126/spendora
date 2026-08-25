from spendora.db import get_db_connection

def log_activity(user_id, action, description, ip_address=None):
    """
    Inserts a record into the audit_logs table to track system and user activity.
    Safe to call with user_id=None for system-level or unauthenticated events.
    """
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                INSERT INTO audit_logs (user_id, action, description, ip_address)
                VALUES (?, ?, ?, ?)
            """
            cursor.execute(sql, (user_id, action, description, ip_address))
    except Exception as e:
        # We print but don't crash the request if audit logging fails (keeps application resilient)
        print(f"Failed to log audit activity: {str(e)}")
    finally:
        if connection:
            connection.close()
