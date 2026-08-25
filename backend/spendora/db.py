import os
from urllib.parse import urlparse
import pymysql
import pymysql.cursors
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(dotenv_path=env_path)
load_dotenv()

def get_db_connection():
    """
    Establishes and returns a connection to the MySQL database.
    Uses DictCursor to automatically format records as dictionary rows.
    """
    try:
        database_url = os.getenv('MYSQL_PUBLIC_URL') or os.getenv('MYSQL_URL')
        if database_url:
            parsed_url = urlparse(database_url)
            if not parsed_url.hostname:
                raise ValueError('MYSQL_PUBLIC_URL or MYSQL_URL must be a valid MySQL URL')
            if parsed_url.hostname.endswith('.railway.internal'):
                raise RuntimeError(
                    'Railway private MySQL host detected. Set MYSQL_PUBLIC_URL or use '
                    'MYSQL_HOST with Railway public TCP credentials in Vercel.'
                )
            host = parsed_url.hostname
            port = parsed_url.port or 3306
            user = parsed_url.username
            password = parsed_url.password
            database = parsed_url.path.lstrip('/')
        else:
            host = os.getenv('MYSQL_HOST', 'localhost')
            port = int(os.getenv('MYSQL_PORT', 3306))
            user = os.getenv('MYSQL_USER', 'root')
            password = os.getenv('MYSQL_PASSWORD', '')
            database = os.getenv('MYSQL_DB', 'spendora')

        connection_options = {}
        if os.getenv('MYSQL_SSL', '').lower() in ('1', 'true', 'yes', 'on'):
            connection_options['ssl'] = {'check_hostname': False}

        connection = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True,
            **connection_options
        )
        return connection
    except Exception as e:
        print(f"Database Connection Error: {str(e)}")
        raise e
