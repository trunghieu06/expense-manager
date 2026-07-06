import sqlite3

conn = sqlite3.connect('expenses.db')
cursor = conn.cursor()

cursor.execute("SELECT amount, currency, category, note, created_at, user_id FROM transactions")
rows = cursor.fetchall()

if not rows:
    print("-- Không có dữ liệu nào trong bảng transactions")
else:
    print("INSERT INTO transactions (amount, currency, category, note, created_at, user_id) VALUES")
    
    values = []
    for r in rows:
        amount, currency, category, note, created_at, user_id = r
        
        # Escape strings safely
        note_str = f"'{note.replace(chr(39), chr(39)+chr(39))}'" if note is not None else "NULL"
        category_str = f"'{category.replace(chr(39), chr(39)+chr(39))}'"
        currency_str = f"'{currency}'"
        created_at_str = f"'{created_at}'" if created_at else "NULL"
        user_id_str = str(user_id) if user_id is not None else "1"
        
        values.append(f"({amount}, {currency_str}, {category_str}, {note_str}, {created_at_str}, {user_id_str})")
    
    print(",\n".join(values) + ";")

conn.close()
