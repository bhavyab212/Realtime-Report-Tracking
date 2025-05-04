import os
import json
from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
from flask_cors import CORS  # Import CORS

# --- Configuration ---
DATA_FILE = 'users.json' # Name of the file to store user data

# --- Flask App Setup ---
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes, allowing frontend requests
bcrypt = Bcrypt(app) # Initialize bcrypt for password hashing
app.config['SECRET_KEY'] = 'this-is-a-super-secret-key-replace-it' # Needed for Flask sessions/flashing, though not used heavily here

# --- Data Handling Functions ---

def load_data():
    """Loads user data from the JSON file."""
    if not os.path.exists(DATA_FILE):
        # Create the file with default structure if it doesn't exist
        save_data({"citizens": [], "admins": []})
        return {"citizens": [], "admins": []}
    try:
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
            # Ensure keys exist
            if 'citizens' not in data:
                data['citizens'] = []
            if 'admins' not in data:
                data['admins'] = []
            return data
    except (json.JSONDecodeError, FileNotFoundError) as e:
        print(f"Error loading data file ({DATA_FILE}): {e}")
        # If file is corrupted or unreadable, return default structure
        return {"citizens": [], "admins": []}

def save_data(data):
    """Saves user data to the JSON file."""
    try:
        with open(DATA_FILE, 'w') as f:
            # Ensure citizens and admins keys exist before saving
            if 'citizens' not in data: data['citizens'] = []
            if 'admins' not in data: data['admins'] = []
            json.dump(data, f, indent=4) # Use indent for readability
        return True
    except IOError as e:
        print(f"Error saving data file ({DATA_FILE}): {e}")
        return False

# --- API Routes ---

@app.route('/')
def index():
    return jsonify({"message": "Welcome to the Auth API!"}), 200

# --- Citizen Registration ---
@app.route('/register', methods=['POST'])
def register_citizen():
    data = request.get_json()

    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({"message": "Missing required fields (username, email, password)"}), 400

    username = data['username'].strip()
    email = data['email'].strip()
    password = data['password'] # Don't strip password

    # Basic validation (add more as needed)
    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400
    if not "@" in email or not "." in email:
         return jsonify({"message": "Invalid email format"}), 400

    user_data = load_data()

    # Check if username or email already exists
    if any(user['username'].lower() == username.lower() for user in user_data['citizens']):
        return jsonify({"message": "Username already exists"}), 409 # 409 Conflict
    if any(user['email'].lower() == email.lower() for user in user_data['citizens']):
       return jsonify({"message": "Email already registered"}), 409

    # --- Hash the password ---
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    new_user = {
        "username": username,
        "email": email,
        "password": hashed_password, # Store the HASHED password
        "role": "citizen",
        "createdAt": json.dumps(datetime.datetime.now(), default=str) # Store creation date
    }

    user_data['citizens'].append(new_user)

    if save_data(user_data):
        return jsonify({"message": "Citizen registration successful!"}), 201 # 201 Created
    else:
        return jsonify({"message": "Server error occurred during registration"}), 500


# --- Citizen Login ---
@app.route('/login/citizen', methods=['POST'])
def login_citizen():
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password'):
        return jsonify({"message": "Missing username or password"}), 400

    username = data['username'].strip()
    password = data['password']

    user_data = load_data()
    user_found = None

    # Find user by username (case-insensitive)
    for user in user_data.get('citizens', []):
        if user.get('username', '').lower() == username.lower():
            user_found = user
            break

    if user_found:
        # --- Verify the hashed password ---
        stored_hash = user_found.get('password', '')
        if bcrypt.check_password_hash(stored_hash, password):
            # Passwords match!
            return jsonify({
                "message": "Citizen login successful!",
                "username": user_found['username'] # Send username back
                }), 200
        else:
            # Password incorrect
            return jsonify({"message": "Invalid username or password"}), 401 # Unauthorized
    else:
        # User not found
        return jsonify({"message": "Invalid username or password"}), 401 # Unauthorized

# --- Admin Login ---
@app.route('/login/admin', methods=['POST'])
def login_admin():
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password'):
        return jsonify({"message": "Missing Admin ID or password"}), 400

    username = data['username'].strip()
    password = data['password']

    user_data = load_data()
    admin_found = None

     # Find admin by username (case-insensitive)
    for admin in user_data.get('admins', []):
        if admin.get('username', '').lower() == username.lower():
            admin_found = admin
            break

    if admin_found:
         # --- Compare plain text passwords (AS STORED IN JSON for admin in this example) ---
         # !! Ideally, admin passwords should ALSO be hashed !!
        stored_password = admin_found.get('password', '')
        if password == stored_password:
            return jsonify({
                "message": "Admin login successful!",
                "username": admin_found['username']
            }), 200
        else:
             return jsonify({"message": "Invalid admin credentials"}), 401 # Unauthorized
    else:
        # Admin not found
        return jsonify({"message": "Invalid admin credentials"}), 401 # Unauthorized


# --- Run the App ---
# Add a default admin if the file is empty/newly created
import datetime # Import here for default admin creation
if __name__ == '__main__':
    # Ensure a default admin exists if the file is new or empty
    initial_data = load_data()
    if not initial_data.get('admins'):
        print("No admins found, creating default admin...")
        initial_data['admins'] = [
             { "username": "admin", "password": "adminpassword" } # CHANGE THIS DEFAULT PASSWORD
        ]
        save_data(initial_data)
        print("Default admin created (username: admin, password: adminpassword). CHANGE THIS PASSWORD IN users.json!")

    app.run(debug=True, port=5000) # Run on default port 5000 with debug mode ON