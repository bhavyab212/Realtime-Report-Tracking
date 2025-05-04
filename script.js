document.addEventListener('DOMContentLoaded', () => {
  // --- Backend API Base URL ---
  const API_BASE_URL = 'http://127.0.0.1:5000'; // Default Flask address

  // --- DOM Element References ---
  const container = document.querySelector('.container');
  const userTypes = document.querySelectorAll('.user-type');
  const formBoxes = document.querySelectorAll('.form-box');
  const infoTexts = document.querySelectorAll('.info-text');
  const cRegLink = document.querySelector('.citizen-register-link');
  const cLogLink = document.querySelector('.citizen-login-link');
  const cLogBtn = document.getElementById('citizen-login-btn');
  const cRegBtn = document.getElementById('citizen-register-btn');
  const aLogBtn = document.getElementById('admin-login-btn');
  // Spinner References
  const cLogSpinner = document.getElementById('citizen-login-spinner');
  const aLogSpinner = document.getElementById('admin-login-spinner');

  // --- Helper: Activate specific form and info text ---
  function showFormAndInfo(formClass, infoClass) {
    console.log(`Attempting to show: ${formClass}, ${infoClass}`); // Debug
    formBoxes.forEach(f => f.classList.remove('active'));
    infoTexts.forEach(i => i.classList.remove('active'));

    const formToShow = document.querySelector(`.form-box.${formClass}`);
    const infoToShow = document.querySelector(`.info-text.${infoClass}`);

    if (formToShow) {
      console.log(`Activating form: .form-box.${formClass}`); // Debug
      formToShow.classList.add('active');
    } else {
      console.error(`Form element not found: .form-box.${formClass}`); // Debug
    }
    if (infoToShow) {
      console.log(`Activating info: .info-text.${infoClass}`); // Debug
      infoToShow.classList.add('active');
    } else {
      console.error(`Info element not found: .info-text.${infoClass}`); // Debug
    }
  }

  // --- Helper: Show/Hide Messages & Spinners ---
  function showMessage(elementId, message, isSuccess = true) {
    const element = document.getElementById(elementId);
    const otherElementId = elementId.includes('success')
      ? elementId.replace('success', 'error')
      : elementId.replace('error', 'success');
    const otherElement = document.getElementById(otherElementId);

    // Hide other message first
    if (otherElement) otherElement.style.display = 'none';

    // Hide spinners associated with this message area
    if (elementId.includes('citizen-login') && cLogSpinner) cLogSpinner.style.display = 'none';
    if (elementId.includes('admin-login') && aLogSpinner) aLogSpinner.style.display = 'none';

    // Now show the current message
    if (element) {
      element.textContent = message;
      element.style.display = 'block';
      console.log(`Showing message [${isSuccess ? 'Success' : 'Error'}]: ${message} in #${elementId}`); // Debug
    } else {
      console.error(`Message element not found: #${elementId}`); // Debug
    }
  }

  function hideMessages(...elementIds) {
    elementIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    // Also ensure spinners are hidden when messages are cleared
    if (cLogSpinner) cLogSpinner.style.display = 'none';
    if (aLogSpinner) aLogSpinner.style.display = 'none';
    console.log("Hiding messages:", elementIds.join(', ')); // Debug
  }

  function showSpinner(spinnerElement, buttonElement) {
    console.log("Showing spinner, disabling button"); // Debug
    if (spinnerElement) spinnerElement.style.display = 'block';
    if (buttonElement) buttonElement.disabled = true;
  }

  function hideSpinner(spinnerElement, buttonElement) {
    console.log("Hiding spinner, enabling button"); // Debug
    if (spinnerElement) spinnerElement.style.display = 'none';
    if (buttonElement) buttonElement.disabled = false;
  }

  // --- Event Listener: Role Switch (Citizen/Admin) ---
  userTypes.forEach(selector => {
    selector.addEventListener('click', () => {
      console.log(`User type clicked: ${selector.dataset.type}`); // Debug
      userTypes.forEach(s => s.classList.remove('active'));
      selector.classList.add('active');
      const selectedType = selector.dataset.type;

      // **CRITICAL: Reset container state**
      container.classList.remove('active');

      // Clear all potential messages from previous actions
      hideMessages(
        'citizen-login-success', 'citizen-login-error',
        'citizen-register-success', 'citizen-register-error',
        'admin-login-success', 'admin-login-error'
      );

      if (selectedType === 'admin') {
        showFormAndInfo('admin-login', 'admin-login');
      } else { // citizen
        showFormAndInfo('citizen-login', 'citizen-login');
      }
    });
  });

  // --- Event Listeners: Citizen Login/Register Links ---
  if (cRegLink) {
    cRegLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log("Register link clicked - adding .active to container"); // Debug
      hideMessages('citizen-login-success', 'citizen-login-error'); // Clear login messages
      container.classList.add('active');
    });
  } else console.error("Citizen Register Link not found!");

  if (cLogLink) {
    cLogLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log("Login link clicked - removing .active from container"); // Debug
      hideMessages('citizen-register-success', 'citizen-register-error'); // Clear register messages
      container.classList.remove('active');
    });
  } else console.error("Citizen Login Link not found!");


  // ========================================================
  // === FORM SUBMISSION LOGIC (Using Fetch API)          ===
  // ========================================================

  // --- Event Listener: Citizen Login Button ---
  if (cLogBtn && cLogSpinner) {
    cLogBtn.addEventListener('click', async () => {
      console.log("Citizen Login Button Clicked"); // Debug
      const usernameInput = document.getElementById('citizen-login-username');
      const passwordInput = document.getElementById('citizen-login-password');
      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();
      const successId = 'citizen-login-success';
      const errorId = 'citizen-login-error';

      hideMessages(successId, errorId); // Clear previous & hide spinner
      if (!username || !password) { showMessage(errorId, 'Please fill in Username and Password.', false); return; }

      showSpinner(cLogSpinner, cLogBtn);

      try {
        console.log(`Fetching citizen login for: ${username}`); // Debug
        const response = await fetch(`${API_BASE_URL}/login/citizen`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username, password: password })
        });

        const result = await response.json(); // Get response body
        console.log("Citizen Login Response:", response.status, result); // Debug

        if (response.ok) { // Check if status is 2xx
          showMessage(successId, result.message || 'Login successful! Redirecting...');
          setTimeout(() => {
            localStorage.setItem('loggedInUser', result.username || username);
            window.location.href = 'dashboard.html';
          }, 1000);
        } else { // Handle non-2xx responses (401, 400, etc.)
          showMessage(errorId, result.message || `Login failed (Status: ${response.status})`, false);
          console.error("Login failed:", result.message || `Status: ${response.status}`);
        }
      } catch (error) {
        console.error("Network or fetch error during login:", error);
        showMessage(errorId, 'Login failed. Could not connect to server.', false);
      } finally {
        // Ensure spinner is hidden and button enabled regardless of outcome
        hideSpinner(cLogSpinner, cLogBtn);
      }
    });
  } else { console.error("Citizen Login Button or Spinner not found!"); }


  // --- Event Listener: Citizen Register Button ---
  if (cRegBtn) {
    cRegBtn.addEventListener('click', async () => {
      console.log("Citizen Register Button Clicked"); // Debug
      const usernameInput = document.getElementById('citizen-register-username');
      const emailInput = document.getElementById('citizen-register-email');
      const passwordInput = document.getElementById('citizen-register-password');
      const termsCheckbox = document.getElementById('citizen-register-terms');
      const successId = 'citizen-register-success';
      const errorId = 'citizen-register-error';
      const form = document.getElementById('citizen-register-form');

      hideMessages(successId, errorId);

      const username = usernameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();
      const termsChecked = termsCheckbox.checked;

      // Frontend Validations
      if (!username || !email || !password) { showMessage(errorId, 'Please fill in all fields.', false); return; }
      if (!termsChecked) { showMessage(errorId, 'Please agree to the terms & conditions.', false); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showMessage(errorId, 'Please enter a valid email address.', false); return; }
      if (password.length < 6) { showMessage(errorId, 'Password must be at least 6 characters.', false); return; }

      cRegBtn.disabled = true; // Disable button during request

      try {
        console.log(`Fetching citizen registration for: ${username}`); // Debug
        const response = await fetch(`${API_BASE_URL}/register`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username, email: email, password: password })
        });

        const result = await response.json();
        console.log("Citizen Register Response:", response.status, result); // Debug

        if (response.ok) { // 201 Created or other 2xx
          showMessage(successId, result.message || 'Registration successful! You can now log in.');
          if (form) form.reset();
          setTimeout(() => { container.classList.remove('active'); }, 2000); // Slide back
        } else { // Handle 409 Conflict or other errors
          showMessage(errorId, result.message || `Registration failed (Status: ${response.status})`, false);
          console.error("Registration failed:", result.message || `Status: ${response.status}`);
        }
      } catch (error) {
        console.error("Network or fetch error during registration:", error);
        showMessage(errorId, 'Registration failed. Could not connect to server.', false);
      } finally {
        cRegBtn.disabled = false; // Re-enable button
      }
    });
  } else { console.error("Citizen Register Button not found!"); }


  // --- Event Listener: Admin Login Button ---
  if (aLogBtn && aLogSpinner) {
    aLogBtn.addEventListener('click', async () => {
      console.log("Admin Login Button Clicked"); // Debug
      const usernameInput = document.getElementById('admin-login-username');
      const passwordInput = document.getElementById('admin-login-password');
      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();
      const successId = 'admin-login-success';
      const errorId = 'admin-login-error';

      hideMessages(successId, errorId);
      if (!username || !password) { showMessage(errorId, 'Please fill in Admin ID and Password.', false); return; }

      showSpinner(aLogSpinner, aLogBtn);

      try {
        console.log(`Fetching admin login for: ${username}`); // Debug
        const response = await fetch(`${API_BASE_URL}/login/admin`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username, password: password })
        });

        const result = await response.json();
        console.log("Admin Login Response:", response.status, result); // Debug

        if (response.ok) {
          showMessage(successId, result.message || 'Admin login successful! Redirecting...');
          setTimeout(() => {
            localStorage.setItem('loggedInUser', result.username || 'Administrator');
            window.location.href = 'dashboard.html';
          }, 1000);
        } else {
          showMessage(errorId, result.message || `Admin login failed (Status: ${response.status})`, false);
          console.error("Admin Login failed:", result.message || `Status: ${response.status}`);
        }
      } catch (error) {
        console.error("Network or fetch error during admin login:", error);
        showMessage(errorId, 'Admin login failed. Could not connect to server.', false);
      } finally {
        hideSpinner(aLogSpinner, aLogBtn);
      }
    });
  } else { console.error("Admin Login Button or Spinner not found!"); }


  // --- Initial Setup ---
  // Load user data FIRST, then set the initial view
  loadUserData().then(() => {
    showFormAndInfo('citizen-login', 'citizen-login');
    console.log("Initial view set after data load attempt.");
  }).catch(err => {
    console.error("Error during initial setup data loading:", err);
    // Show generic error or default view even if data fails
    showFormAndInfo('citizen-login', 'citizen-login');
  });


}); // End DOMContentLoaded