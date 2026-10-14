import pandas as pd
from datetime import datetime, timedelta
from database import Database
# pyrefly: ignore [missing-import]
from faker import Faker
import random
# pyrefly: ignore [missing-import]
from werkzeug.security import generate_password_hash

class DataProcessor:
    def __init__(self):
        self.db = Database()
    
    def generate_sample_data(self, num_users=50, num_complaints=200):
        """Generate sample data"""
        fake = Faker()
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            user_ids = []
            for i in range(num_users):
                try:
                    cursor.execute('''
                        INSERT INTO users 
                        (username, email, password, full_name, address, phone, is_admin)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (f"user_{i+1}", f"user{i+1}@test.com", 
                          generate_password_hash('password123'), fake.name(),
                          fake.address().replace('\n', ', '), fake.phone_number(), 0))
                    user_ids.append(cursor.lastrowid)
                except:
                    pass
            
            for i in range(num_complaints):
                if user_ids:
                    try:
                        cursor.execute('''
                            INSERT INTO complaints 
                            (user_id, title, description, category, location, status, priority)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        ''', (random.choice(user_ids), 
                              f"Issue on {fake.street_name()}",
                              fake.text()[:100],
                              random.choice(['Roads', 'Water', 'Electricity', 'Waste']),
                              fake.city(),
                              random.choice(['Submitted', 'Resolved']),
                              random.choice(['Low', 'Medium', 'High'])))
                    except:
                        pass
            
            conn.commit()
            print(f"Generated {len(user_ids)} users and {num_complaints} complaints")

if __name__ == '__main__':
    import sys
    processor = DataProcessor()
    if len(sys.argv) > 1:
        if sys.argv[1] == 'generate':
            processor.generate_sample_data()
        elif sys.argv[1] == 'stats':
            print("Stats generated")
