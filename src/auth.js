// src/auth.js
// Handles login page: error messages from OAuth redirect, session check

(function () {
  const ERROR_MESSAGES = {
    access_denied:  'Access was denied. Please try again.',
    token_failed:   'Authentication failed. Please try again.',
    no_email:       'Could not retrieve your email address from Google.',
    wrong_domain:   'Only @peepalconsulting.com accounts can access this portal.',
    server_error:   'A server error occurred. Please try again.',
  };

  function init() {
    const params = new URLSearchParams(window.location.search);

    const loginBtn = document.getElementById('login-btn');
    const redirect = params.get('redirect');
    if (loginBtn && redirect) {
      loginBtn.href = `/api/auth/login?redirect=${encodeURIComponent(redirect)}`;
    }

    // Show error if redirected back with error param
    const err    = params.get('error');
    if (err) {
      const el  = document.getElementById('login-error');
      if (el) {
        el.textContent = ERROR_MESSAGES[err] || 'An unknown error occurred.';
        el.classList.remove('hidden');
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
