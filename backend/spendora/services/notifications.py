from spendora.db import get_db_connection

def create_notification(user_id, title, message, notif_type='general'):
    """
    Creates an inside-app notification for a user.
    """
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                INSERT INTO notifications (user_id, title, message, type, is_read)
                VALUES (%s, %s, %s, %s, FALSE)
            """
            cursor.execute(sql, (user_id, title, message, notif_type))
    except Exception as e:
        print(f"Failed to create notification: {str(e)}")
    finally:
        if connection:
            connection.close()
