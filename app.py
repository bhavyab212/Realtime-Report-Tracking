import os
import json
import datetime # Ensure datetime is imported
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_bcrypt import Bcrypt
from flask_cors import CORS

# --- Configuration ---
DATA_FILE = 'users.json'
# Define the paths for static and template folders RELATIVE to app.py
STATIC_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
TEMPLATE_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')


# --- Flask App Setup ---
# Initialize Flask using the correct template and static folders
app = Flask(__name__,
            template_folder=TEMPLATE_FOLDER,
            static_folder=STATIC_FOLDER,
            static_url_path='/static') # URL path for static files

# CORS is NOT strictly necessary anymore if everything is served from the same origin,
# but doesn't hurt to keep it for flexibility or potential future changes.
CORS(app)
bcrypt = Bcrypt(app)
app.config['SECRET_KEY'] = 'replace-this-with-a-real-secret-key'

# --- Data Handling Functions (load_data, save_data - Keep As Is) ---
def load_data():
    """Loads user data from the JSON file."""
    if not os.path.exists(DATA_FILE):
        save_data({"citizens": [], "admins": []}) # Ensure default structure
        return {"citizens": [], "admins": []}
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f: # Specify encoding
            data = json.load(f)
            if 'citizens' not in data: data['citizens'] = []
            if 'admins' not in data: data['admins'] = []
            return data
    except (json.JSONDecodeError, FileNotFoundError, Exception) as e: # Catch broader errors
        print(f"Error loading data file ({DATA_FILE}): {e}")
        return {"citizens": [], "admins": []}

def save_data(data):
    """Saves user data to the JSON file."""
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f: # Specify encoding
            if 'citizens' not in data: data['citizens'] = []
            if 'admins' not in data: data['admins'] = []
            json.dump(data, f, indent=4)
        return True
    except (IOError, TypeError, Exception) as e: # Catch broader errors
        print(f"Error saving data file ({DATA_FILE}): {e}")
        return False

# --- Routes for Serving HTML Pages ---

@app.route('/') # Route for the root URL
def index():
    """Serves the login/index page."""
    return render_template('index.html')

@app.route('/dashboard') # Route for the dashboard page
def dashboard():
    """Serves the dashboard page."""
    # In a real app, you'd add checks here to ensure the user is logged in
    # (using Flask sessions or tokens) before rendering the dashboard.
    return render_template('dashboard.html')

# --- API Routes (Keep As Is) ---

# POST /register
@app.route('/register', methods=['POST'])
def register_citizen():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({"message": "Missing required fields"}), 400

    username = data['username'].strip()
    email = data['email'].strip()
    password = data['password']

    # Add your validation logic here (email format, password length etc.)
    if len(password) < 6: return jsonify({"message": "Password too short"}), 400
    if not "@" in email or not "." in email: return jsonify({"message": "Invalid email"}), 400

    user_data = load_data()
    if any(u['username'].lower() == username.lower() for u in user_data['citizens']):
        return jsonify({"message": "Username already exists"}), 409
    if any(u['email'].lower() == email.lower() for u in user_data['citizens']):
        return jsonify({"message": "Email already registered"}), 409

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = {
        "username": username, "email": email, "password": hashed_password,
        "role": "citizen", "createdAt": datetime.datetime.now().isoformat() # Use ISO format string
    }
    user_data['citizens'].append(new_user)

    if save_data(user_data):
        return jsonify({"message": "Registration successful!"}), 201
    else:
        return jsonify({"message": "Server error saving data"}), 500

# POST /login/citizen
@app.route('/login/citizen', methods=['POST'])
def login_citizen():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({"message": "Missing username or password"}), 400

    username = data['username'].strip()
    password = data['password']
    user_data = load_data()
    user_found = next((user for user in user_data.get('citizens', []) if user.get('username', '').lower() == username.lower()), None)

    if user_found and bcrypt.check_password_hash(user_found.get('password', ''), password):
        return jsonify({"message": "Citizen login successful!", "username": user_found['username']}), 200
    else:
        return jsonify({"message": "Invalid username or password"}), 401

# POST /login/admin
@app.route('/login/admin', methods=['POST'])
def login_admin():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({"message": "Missing Admin ID or password"}), 400

    username = data['username'].strip()
    password = data['password']
    user_data = load_data()
    admin_found = next((admin for admin in user_data.get('admins', []) if admin.get('username', '').lower() == username.lower()), None)

    # !! IMPORTANT: Compare admin passwords securely if you hash them!
    # This example assumes plain text password for admin as stored in users.json previously.
    # For hashed admin passwords, use bcrypt.check_password_hash here too.
    if admin_found and admin_found.get('password', '') == password:
         return jsonify({"message": "Admin login successful!", "username": admin_found['username']}), 200
    else:
        return jsonify({"message": "Invalid admin credentials"}), 401


# --- Run the App ---
if __name__ == '__main__':
    # Ensure a default admin exists if the file is new/empty (keep this)
    initial_data = load_data()
    if not initial_data.get('admins'):
        print("Creating default admin...")
        # Hash the default admin password IF you decide to store hashed admin passwords
        # default_admin_hashed_pw = bcrypt.generate_password_hash("adminpassword").decode('utf-8')
        initial_data['admins'] = [
            { "username": "admin", "password": "adminpassword" } # CHANGE THIS PASSWORD - Store hashed version ideally
        ]
        save_data(initial_data)
        print("Default admin created (username: admin). PLEASE CHANGE the default password in users.json!")

    # Bind to 0.0.0.0 to be accessible on network if needed for deployment
    # For simple local running, default host is fine. Debug=True helps development.
    app.run(host='0.0.0.0', port=5000, debug=True)
