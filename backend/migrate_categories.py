import sqlite3

def migrate_categories():
    conn = sqlite3.connect('expenses.db')
    cursor = conn.cursor()
    
    mapping = {
        'Food': 'Ăn uống (Cơ bản)',
        'Eating': 'Ăn uống (Cơ bản)',
        'Transport': 'Di chuyển',
        'Shopping': 'Mua sắm / Quần áo',
        'Housing': 'Nhà ở',
        'Bills': 'Nhà ở',
        'Entertainment': 'Giải trí',
        'Health': 'Sức khỏe',
        'Other': 'Khác'
    }
    
    for old_cat, new_cat in mapping.items():
        cursor.execute("UPDATE transactions SET category = ? WHERE category = ?", (new_cat, old_cat))
        print(f"Đã cập nhật {cursor.rowcount} giao dịch từ '{old_cat}' sang '{new_cat}'")
        
    conn.commit()
    conn.close()
    print("Hoàn tất chuyển đổi dữ liệu!")

if __name__ == '__main__':
    migrate_categories()
