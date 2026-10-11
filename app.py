# pyrefly: ignore [missing-import]
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
# pyrefly: ignore [missing-import]
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os
import uuid
import requests

from database import Database
from models import User, Complaint, AIPrediction, Analytics
from ai_engine import AdvancedAIEngine

app = Flask(__name__)
app.secret_key = 'civicpulse_secret_key_2023'
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)

# Initialize components
db = Database()
ai_engine = AdvancedAIEngine()

# Groq API Configuration
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

# Ensure upload folder exists
UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/')
def index():
    """Home page"""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    """User registration"""
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = generate_password_hash(request.form['password'])
        full_name = request.form['full_name']
        address = request.form.get('address', '')
        phone = request.form.get('phone', '')
        
        try:
            user_id = User.create(username, email, password, full_name, address, phone)
            flash('Registration successful! Please login.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            flash('Registration failed. Username or email might already exist.', 'danger')
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """User login"""
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        user = User.get_by_username(username)
        if user and check_password_hash(user[3], password):
            session['user_id'] = user[0]
            session['username'] = user[1]
            session['is_admin'] = bool(user[7])
            session.permanent = True
            flash('Login successful!', 'success')
            
            if session['is_admin']:
                return redirect(url_for('admin_dashboard'))
            else:
                return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    """User logout"""
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

@app.route('/dashboard')
def dashboard():
    """User dashboard"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM complaints 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        ''', (session['user_id'],))
        user_complaints = cursor.fetchall()
    
    return render_template('dashboard.html', complaints=user_complaints)

@app.route('/complaint/new', methods=['GET', 'POST'])
def submit_complaint():
    """Submit new complaint"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        title = request.form['title']
        description = request.form['description']
        category = request.form['category']
        location = request.form['location']
        latitude = request.form.get('latitude')
        longitude = request.form.get('longitude')
        
        # Handle image upload
        image_path = None
        if 'image' in request.files:
            image = request.files['image']
            if image.filename != '':
                filename = str(uuid.uuid4()) + os.path.splitext(image.filename)[1]
                image.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                image_path = f'uploads/{filename}'
        
        # Create complaint
        complaint_id = Complaint.create(
            session['user_id'], title, description, category, 
            location, latitude, longitude, image_path
        )
        
        # Get existing complaints for similarity check
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, user_id, title, description, category FROM complaints WHERE id != ?', (complaint_id,))
            existing_complaints = cursor.fetchall()
        
        # AI Predictions using AdvancedAIEngine
        category_result = ai_engine.predict_category(title, description)
        predicted_category = category_result['category']
        cat_confidence = category_result['confidence']
        
        priority_result, priority_confidence = ai_engine.predict_priority(title, description, category)
        predicted_priority = priority_result.value
        
        # Spam detection
        spam_analysis = ai_engine.analyze_spam_risk(title, description)
        spam_score = spam_analysis['spam_score']
        
        # Similar complaints
        similar_complaints = ai_engine.detect_similar_complaints(
            title, 
            description,
            existing_complaints
        )
        
        # Save AI predictions
        similar_ids = [str(c['id']) for c in similar_complaints]
        AIPrediction.save(
            complaint_id, predicted_category, predicted_priority,
            spam_score, ','.join(similar_ids), cat_confidence
        )
        
        # Create notification for complaint submission
        create_notification(
            session['user_id'],
            f"Complaint #{complaint_id} Submitted",
            f"Your complaint '{title}' has been submitted successfully. We're analyzing it and will assign it to the relevant department soon.",
            'success',
            complaint_id,
            f'/complaint/{complaint_id}'
        )
        
        flash('Complaint submitted successfully!', 'success')
        return redirect(url_for('complaint_detail', id=complaint_id))
    
    return render_template('submit_complaint.html')

@app.route('/complaint/<int:id>')
def complaint_detail(id):
    """View complaint details"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    complaint = Complaint.get_by_id(id)
    if not complaint:
        flash('Complaint not found', 'danger')
        return redirect(url_for('dashboard'))
    
    # Get comments
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT c.*, u.username 
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.complaint_id = ?
            ORDER BY c.created_at
        ''', (id,))
        comments = cursor.fetchall()
        
        # Get status history
        cursor.execute('''
            SELECT sl.*, u.username 
            FROM status_logs sl
            JOIN users u ON sl.changed_by = u.id
            WHERE sl.complaint_id = ?
            ORDER BY sl.created_at
        ''', (id,))
        status_history = cursor.fetchall()
        
        # Get AI predictions
        cursor.execute('SELECT * FROM ai_predictions WHERE complaint_id = ?', (id,))
        ai_prediction = cursor.fetchone()
        
        # Get similar complaints
        similar_complaints = []
        if ai_prediction and ai_prediction[5]:  # similar_complaints column
            similar_ids = ai_prediction[5].split(',')
            if similar_ids:
                placeholders = ','.join(['?'] * len(similar_ids))
                cursor.execute(f'''
                    SELECT id, title, category, status 
                    FROM complaints 
                    WHERE id IN ({placeholders})
                ''', similar_ids)
                similar_complaints = cursor.fetchall()
    
    return render_template('complaint_detail.html', 
                         complaint=complaint, 
                         comments=comments,
                         status_history=status_history,
                         ai_prediction=ai_prediction,
                         similar_complaints=similar_complaints)

@app.route('/complaint/<int:id>/upvote')
def upvote_complaint(id):
    """Upvote a complaint"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not logged in'})
    
    success = Complaint.upvote(id, session['user_id'])
    if success:
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Already upvoted'})

@app.route('/admin/dashboard')
def admin_dashboard():
    """Admin dashboard"""
    if 'user_id' not in session or not session.get('is_admin'):
        flash('Access denied. Admin privileges required.', 'danger')
        return redirect(url_for('login'))
    
    return render_template('admin_dashboard.html')

@app.route('/admin/complaints')
def admin_complaints():
    """Admin complaints management"""
    if 'user_id' not in session or not session.get('is_admin'):
        return redirect(url_for('login'))
    
    complaints = Complaint.get_all()
    return render_template('admin_complaints.html', complaints=complaints)

@app.route('/admin/complaint/<int:id>/update', methods=['POST'])
def update_complaint_status(id):
    """Update complaint status"""
    if 'user_id' not in session or not session.get('is_admin'):
        return jsonify({'success': False, 'error': 'Unauthorized'})
    
    status = request.form['status']
    notes = request.form.get('notes', '')
    
    # Get the complaint to notify the user
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT user_id FROM complaints WHERE id = ?', (id,))
        result = cursor.fetchone()
        if result:
            user_id = result[0]
            
            # Create notification
            notification_title = f"Complaint #{id} Status Updated"
            notification_message = f"Your complaint has been updated to '{status}'. {notes if notes else ''}"
            create_notification(user_id, notification_title, notification_message, 'info', id, f'/complaint/{id}')
    
    Complaint.update_status(id, status, session['user_id'], notes)
    
    return jsonify({'success': True})

@app.route('/admin/analytics')
def admin_analytics():
    """Admin analytics dashboard"""
    if 'user_id' not in session or not session.get('is_admin'):
        return redirect(url_for('login'))
    
    # Get analytics data
    by_category = Analytics.get_complaints_by_category()
    by_status = Analytics.get_complaints_by_status()
    over_time = Analytics.get_complaints_over_time(7)
    avg_resolution = Analytics.get_average_resolution_time()
    sla_breach = Analytics.get_sla_breach_percentage()
    
    # Format data for charts
    category_labels = [item[0] for item in by_category]
    category_data = [item[1] for item in by_category]
    
    status_labels = [item[0] for item in by_status]
    status_data = [item[1] for item in by_status]
    
    time_labels = [item[0] for item in over_time]
    time_data = [item[1] for item in over_time]
    
    # Get map data
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, title, latitude, longitude, category, status FROM complaints WHERE latitude IS NOT NULL')
        map_complaints = cursor.fetchall()
    
    return render_template('admin_analytics.html',
                         category_labels=category_labels,
                         category_data=category_data,
                         status_labels=status_labels,
                         status_data=status_data,
                         time_labels=time_labels,
                         time_data=time_data,
                         avg_resolution=avg_resolution,
                         sla_breach=sla_breach,
                         map_complaints=map_complaints)
@app.route("/api/user/analytics")
def user_analytics():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    user_id = session["user_id"]
    conn = sqlite3.connect("civicpulse.db")
    cur = conn.cursor()

    # Total complaints
    cur.execute("SELECT COUNT(*) FROM complaints WHERE user_id=?", (user_id,))
    total = cur.fetchone()[0]

    # Status counts
    cur.execute("""
        SELECT status, COUNT(*) 
        FROM complaints 
        WHERE user_id=?
        GROUP BY status
    """, (user_id,))
    status_data = dict(cur.fetchall())

    # Category counts
    cur.execute("""
        SELECT category, COUNT(*) 
        FROM complaints 
        WHERE user_id=?
        GROUP BY category
    """, (user_id,))
    category_data = dict(cur.fetchall())

    # Complaints over time
    cur.execute("""
        SELECT DATE(created_at), COUNT(*) 
        FROM complaints 
        WHERE user_id=?
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
    """, (user_id,))
    time_data = cur.fetchall()

    conn.close()

    return jsonify({
        "total": total,
        "status": status_data,
        "category": category_data,
        "timeline": time_data
    })
@app.route('/api/complaints/geojson')
def complaints_geojson():
    """Get complaints as GeoJSON for map"""
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, title, description, category, status, 
                   latitude, longitude, created_at
            FROM complaints 
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ''')
        complaints = cursor.fetchall()
    
    features = []
    for comp in complaints:
        feature = {
            "type": "Feature",
            "properties": {
                "id": comp[0],
                "title": comp[1],
                "description": comp[2][:100] + "..." if len(comp[2]) > 100 else comp[2],
                "category": comp[3],
                "status": comp[4],
                "date": comp[7]
            },
            "geometry": {
                "type": "Point",
                "coordinates": [comp[6], comp[5]]
            }
        }
        features.append(feature)
    
    return jsonify({
        "type": "FeatureCollection",
        "features": features
    })

@app.route('/api/analytics/department-performance')
def department_performance():
    """Get department performance metrics"""
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT 
                d.name,
                COALESCE(COUNT(c.id), 0) as total_complaints,
                COALESCE(SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END), 0) as resolved,
                COALESCE(AVG(CASE 
                    WHEN c.status = 'Resolved' AND c.resolved_at IS NOT NULL 
                    THEN JULIANDAY(c.resolved_at) - JULIANDAY(c.created_at) 
                    ELSE NULL 
                END) * 24, 0) as avg_hours,
                d.sla_hours
            FROM departments d
            LEFT JOIN complaints c ON c.department = d.name
            GROUP BY d.name
            ORDER BY d.name
        ''')
        data = cursor.fetchall()
    
    performance = []
    for row in data:
        score = 0
        total_complaints = row[1] or 0
        resolved = row[2] or 0
        avg_hours = row[3] or 0
        sla_hours = row[4] or 1
        
        if total_complaints > 0:
            # Resolution rate (40%)
            resolution_rate = (resolved / total_complaints) * 100 if total_complaints > 0 else 0
            score += resolution_rate * 0.4
            
            # SLA adherence (60%)
            if avg_hours > 0 and sla_hours > 0:
                sla_adherence = max(0, 100 - ((avg_hours / sla_hours) * 100))
                score += sla_adherence * 0.6
        
        performance.append({
            'department': row[0],
            'total_complaints': int(total_complaints),
            'resolved': int(resolved),
            'avg_resolution_hours': float(avg_hours),
            'sla_hours': row[4],
            'performance_score': round(score, 1)
        })
    
    return jsonify(performance)

@app.route('/api/analytics/stats')
def analytics_stats():
    """Get general analytics stats"""
    with db.get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM complaints')
        total = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM complaints WHERE status = "Resolved"')
        resolved = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM complaints WHERE status = "In Progress"')
        in_progress = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM complaints WHERE status = "Submitted" OR status = "In Review"')
        pending = cursor.fetchone()[0]
    
    return jsonify({
        'total': total,
        'resolved': resolved,
        'inProgress': in_progress,
        'pending': pending
    })

@app.route('/api/dashboard-stats')
def dashboard_stats():
    """Get dashboard stats - alias for analytics_stats"""
    with db.get_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM complaints')
        total = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM complaints WHERE status = "Resolved"')
        resolved = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM complaints WHERE status = "In Progress"')
        in_progress = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM complaints WHERE status = "Submitted" OR status = "In Review"')
        pending = cursor.fetchone()[0]
    
    return jsonify({
        'total_complaints': total,
        'resolved': resolved,
        'in_progress': in_progress,
        'pending': pending
    })

@app.route('/api/analytics/data')
def analytics_data():
    """Get analytics data for a specific period"""
    period = request.args.get('period', '30')  # days
    
    try:
        period = int(period)
    except:
        period = 30
    
    from datetime import datetime, timedelta
    date_from = datetime.now() - timedelta(days=period)
    
    with db.get_connection() as conn:
        cursor = conn.cursor()
        
        # Get stats for the period
        cursor.execute(f'''
            SELECT COUNT(*) FROM complaints 
            WHERE created_at >= datetime(?, '+0 hours')
        ''', (date_from.isoformat(),))
        total = cursor.fetchone()[0]
        
        cursor.execute(f'''
            SELECT COUNT(*) FROM complaints 
            WHERE status = "Resolved" AND created_at >= datetime(?, '+0 hours')
        ''', (date_from.isoformat(),))
        resolved = cursor.fetchone()[0]
        
        cursor.execute(f'''
            SELECT COUNT(*) FROM complaints 
            WHERE status = "In Progress" AND created_at >= datetime(?, '+0 hours')
        ''', (date_from.isoformat(),))
        in_progress = cursor.fetchone()[0]
        
        cursor.execute(f'''
            SELECT COUNT(*) FROM complaints 
            WHERE (status = "Submitted" OR status = "In Review") AND created_at >= datetime(?, '+0 hours')
        ''', (date_from.isoformat(),))
        pending = cursor.fetchone()[0]
    
    return jsonify({
        'total': total,
        'resolved': resolved,
        'inProgress': in_progress,
        'pending': pending,
        'period': period
    })
@app.route("/my-analytics")
def my_analytics():
    if "user_id" not in session:
        return redirect("/login")
    return render_template("user_analytics.html")


@app.route('/admin/users')
def admin_users():
    """Manage system users"""
    if 'user_id' not in session or not session.get('is_admin'):
        flash('Access denied. Admin privileges required.', 'danger')
        return redirect(url_for('login'))
    
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, username, email, full_name, created_at, is_admin FROM users ORDER BY created_at DESC')
        users = cursor.fetchall()
    
    return render_template('admin_users.html', users=users)

@app.route('/admin/user/<int:user_id>/toggle-admin', methods=['POST'])
def toggle_user_admin(user_id):
    """Toggle admin privileges for a user"""
    if 'user_id' not in session or not session.get('is_admin'):
        return jsonify({'success': False, 'error': 'Unauthorized'})
    
    try:
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,))
            result = cursor.fetchone()
            
            if result:
                new_status = 0 if result[0] else 1
                cursor.execute('UPDATE users SET is_admin = ? WHERE id = ?', (new_status, user_id))
                conn.commit()
                return jsonify({'success': True, 'message': 'User privileges updated'})
        
        return jsonify({'success': False, 'error': 'User not found'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/admin/user/<int:user_id>/delete', methods=['POST'])
def delete_user(user_id):
    """Delete a user account"""
    if 'user_id' not in session or not session.get('is_admin'):
        return jsonify({'success': False, 'error': 'Unauthorized'})
    
    if user_id == session.get('user_id'):
        return jsonify({'success': False, 'error': 'Cannot delete your own account'})
    
    try:
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
            conn.commit()
            return jsonify({'success': True, 'message': 'User deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/admin/reports')
def admin_reports():
    """Generate and view system reports"""
    if 'user_id' not in session or not session.get('is_admin'):
        flash('Access denied. Admin privileges required.', 'danger')
        return redirect(url_for('login'))
    
    with db.get_connection() as conn:
        cursor = conn.cursor()
        
        # Get complaint statistics
        cursor.execute('''
            SELECT 
                category,
                COUNT(*) as count,
                SUM(CASE WHEN status = "Resolved" THEN 1 ELSE 0 END) as resolved,
                AVG(CASE WHEN status = "Resolved" THEN upvotes ELSE NULL END) as avg_upvotes
            FROM complaints
            GROUP BY category
            ORDER BY count DESC
        ''')
        category_stats = cursor.fetchall()
        
        # Get user statistics
        cursor.execute('''
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN is_admin = 1 THEN 1 ELSE 0 END) as admin_count
            FROM users
        ''')
        user_stats = cursor.fetchone()
        
        # Get complaint timeline (last 30 days)
        cursor.execute('''
            SELECT 
                date(created_at) as complaint_date,
                COUNT(*) as count
            FROM complaints
            WHERE created_at >= date('now', '-30 days')
            GROUP BY date(created_at)
            ORDER BY complaint_date
        ''')
        timeline_data = cursor.fetchall()
        
        # Get resolution metrics
        cursor.execute('''
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = "Resolved" THEN 1 ELSE 0 END) as resolved,
                AVG(CASE 
                    WHEN status = "Resolved" AND resolved_at IS NOT NULL 
                    THEN JULIANDAY(resolved_at) - JULIANDAY(created_at)
                    ELSE NULL
                END) as avg_resolution_days
            FROM complaints
        ''')
        resolution_metrics = cursor.fetchone()
    
    return render_template('admin_reports.html',
                         category_stats=category_stats,
                         user_stats=user_stats,
                         timeline_data=timeline_data,
                         resolution_metrics=resolution_metrics)

@app.route('/admin/reports/export', methods=['GET'])
def export_reports():
    """Export reports as CSV"""
    if 'user_id' not in session or not session.get('is_admin'):
        return jsonify({'success': False, 'error': 'Unauthorized'})
    
    try:
        import csv
        from io import StringIO
        from datetime import datetime
        
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT 
                    id, title, category, status, priority, 
                    upvotes, created_at, resolved_at
                FROM complaints
                ORDER BY created_at DESC
            ''')
            complaints = cursor.fetchall()
        
        # Create CSV
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(['ID', 'Title', 'Category', 'Status', 'Priority', 'Upvotes', 'Created', 'Resolved'])
        
        for complaint in complaints:
            writer.writerow(complaint)
        
        response = app.make_response(output.getvalue())
        response.headers["Content-Disposition"] = f"attachment; filename=complaints_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        response.headers["Content-Type"] = "text/csv"
        return response
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/chat', methods=['POST'])
def chat_with_ai():
    """Chat with AI assistant powered by Groq"""
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        chat_history = data.get('history', [])
        
        if not user_message:
            return jsonify({'success': False, 'error': 'Empty message'})
        
        # System prompt for the chatbot
        system_prompt = """You are CivicPulse Assistant, a helpful chatbot for a civic complaint management system. 
        
Your responsibilities:
- Help users submit and track civic complaints
- Provide information about complaint categories: Roads, Water, Electricity, Waste, Parks, Safety, Construction
- Explain how to use the CivicPulse platform
- Provide general civic issue information
- Be friendly, professional, and helpful

Available complaint categories:
- Roads: Potholes, broken pavement, street damage
- Water: Leaks, water supply issues, water quality
- Electricity: Street lights, power outages, electrical issues
- Waste: Garbage collection, waste management
- Parks: Playground issues, park maintenance
- Safety: Suspicious activity, hazards, accidents
- Construction: Construction noise, violations, blocked streets

Keep responses concise and helpful. If asked something unrelated to civic complaints, politely redirect to the platform's services."""
        
        # Prepare messages for Groq API
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add conversation history
        for msg in chat_history[-5:]:  # Keep last 5 messages for context
            messages.append(msg)
        
        # Add current user message
        messages.append({"role": "user", "content": user_message})
        
        # Call Groq API
        headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'mixtral-8x7b-32768',
            'messages': messages,
            'temperature': 0.7,
            'max_tokens': 500,
            'top_p': 1
        }
        
        response = requests.post(GROQ_API_URL, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            bot_message = result['choices'][0]['message']['content'].strip()
            return jsonify({
                'success': True,
                'response': bot_message
            })
        else:
            error_msg = response.json().get('error', {}).get('message', 'API Error')
            print(f"Groq API Error: {error_msg}")
            return jsonify({
                'success': False,
                'error': 'Failed to get response from AI service'
            })
    
    except requests.Timeout:
        return jsonify({'success': False, 'error': 'Request timeout - please try again'})
    except Exception as e:
        print(f"Chat error: {str(e)}")
        return jsonify({'success': False, 'error': 'An error occurred while processing your message'})

# ==================== NOTIFICATION SYSTEM ====================

@app.route('/api/notifications')
def get_notifications():
    """Get user notifications"""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    user_id = session['user_id']
    limit = request.args.get('limit', 20, type=int)
    
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, title, message, type, is_read, complaint_id, action_url, created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        ''', (user_id, limit))
        
        notifications = []
        for row in cursor.fetchall():
            notifications.append({
                'id': row[0],
                'title': row[1],
                'message': row[2],
                'type': row[3],
                'is_read': row[4],
                'complaint_id': row[5],
                'action_url': row[6],
                'created_at': row[7]
            })
    
    return jsonify({'notifications': notifications})

@app.route('/api/notifications/unread-count')
def get_unread_count():
    """Get unread notification count"""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    user_id = session['user_id']
    
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0', (user_id,))
        unread_count = cursor.fetchone()[0]
    
    return jsonify({'unread_count': unread_count})

@app.route('/api/notifications/<int:notification_id>/read', methods=['POST'])
def mark_notification_read(notification_id):
    """Mark notification as read"""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', 
                      (notification_id, session['user_id']))
        conn.commit()
    
    return jsonify({'success': True})

@app.route('/api/notifications/mark-all-read', methods=['POST'])
def mark_all_notifications_read():
    """Mark all notifications as read"""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', 
                      (session['user_id'],))
        conn.commit()
    
    return jsonify({'success': True})

@app.route('/api/notifications/<int:notification_id>', methods=['DELETE'])
def delete_notification(notification_id):
    """Delete a notification"""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM notifications WHERE id = ? AND user_id = ?', 
                      (notification_id, session['user_id']))
        conn.commit()
    
    return jsonify({'success': True})

def create_notification(user_id, title, message, notification_type='info', complaint_id=None, action_url=None):
    """Helper function to create notifications"""
    try:
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO notifications (user_id, complaint_id, title, message, type, action_url)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (user_id, complaint_id, title, message, notification_type, action_url))
            conn.commit()
    except Exception as e:
        print(f"Error creating notification: {str(e)}")

# ==================== INTERNAL AI SERVICE ENDPOINT ====================

@app.route('/api/ai/analyze', methods=['POST'])
def internal_ai_analyze():
    """Internal AI endpoint callable via Vercel service binding"""
    try:
        data = request.get_json() or {}
        title = data.get('title', '')
        description = data.get('description', '')
        
        category_result = ai_engine.predict_category(title, description)
        category = category_result.get('category', 'Roads')
        cat_confidence = category_result.get('confidence', 0.8)
        
        priority_result, priority_confidence = ai_engine.predict_priority(title, description, category)
        priority = priority_result.value if hasattr(priority_result, 'value') else str(priority_result)
        
        spam_analysis = ai_engine.analyze_spam_risk(title, description)
        spam_score = spam_analysis.get('spam_score', 0.0)
        
        dept_mapping = {
            'Roads': 'Roads & Transportation',
            'Water': 'Water & Sewage',
            'Electricity': 'Electricity Department',
            'Waste': 'Waste Management',
            'Parks': 'Parks & Recreation',
            'Safety': 'Public Safety',
            'Construction': 'Building & Construction',
            'Other': 'General Civic Administration',
        }
        department = dept_mapping.get(category, 'General Civic Administration')
        
        return jsonify({
            'success': True,
            'analysis': {
                'category': category,
                'confidence': cat_confidence,
                'priority': priority,
                'spamScore': spam_score,
                'department': department,
                'sentimentScore': -0.8 if priority == 'Urgent' else -0.3,
                'urgencyScore': 0.95 if priority == 'Urgent' else (0.75 if priority == 'High' else 0.4)
            }
        })
    except Exception as e:
        print(f"Internal AI analyze error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)