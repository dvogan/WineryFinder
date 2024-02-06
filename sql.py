import os
import psycopg2

try:
    conn = psycopg2.connect(os.environ.get('WINE_DATABASE_URL'))
    cursor = conn.cursor()

    #sql = "DELETE FROM wineries"
    sql="ALTER TABLE wineries DROP COLUMN url"

    cursor.execute(sql)
    conn.commit()
    print("Column dropped successfully.")
except Exception as e:
    print(f"An error occurred: {e}")
finally:
    cursor.close()
    conn.close()

print('done')
