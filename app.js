/**
 * CampusHealthCoach — early-access form
 * Progressive enhancement: validates client-side, shows success UI,
 * stores a local copy, and still posts to Netlify Forms when hosted there.
 */
(function () {
  'use strict';

  // Optional: paste a Formspree endpoint here (e.g. 'https://formspree.io/f/abcdwxyz')
  // to collect signups on GitHub Pages, Vercel, or any static host.
  // Leave empty to use Netlify Forms (only works when hosted on Netlify).
  var FORM_ENDPOINT = '';

  var form = document.getElementById('early-access-form');
  var success = document.getElementById('form-success');
  var resetBtn = document.getElementById('reset-form');
  var yearEl = document.getElementById('year');

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  if (!form) return;

  function clearErrors() {
    form.querySelectorAll('.error-msg').forEach(function (el) {
      el.classList.add('hidden');
      el.textContent = '';
    });
    form.querySelectorAll('input').forEach(function (input) {
      input.classList.remove('border-red-400');
      input.removeAttribute('aria-invalid');
    });
  }

  function showError(fieldId, message) {
    var input = document.getElementById(fieldId);
    var msg = form.querySelector('.error-msg[data-for="' + fieldId + '"]');
    if (input) {
      input.classList.add('border-red-400');
      input.setAttribute('aria-invalid', 'true');
    }
    if (msg) {
      msg.textContent = message;
      msg.classList.remove('hidden');
    }
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function isValidPhone(value) {
    var digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }

  function validate() {
    clearErrors();
    var ok = true;
    var name = (form.name.value || '').trim();
    var email = (form.email.value || '').trim();
    var phone = (form.phone.value || '').trim();

    if (!name || name.length < 2) {
      showError('name', 'Please enter your full name.');
      ok = false;
    }
    if (!email || !isValidEmail(email)) {
      showError('email', 'Please enter a valid email address.');
      ok = false;
    }
    if (!phone || !isValidPhone(phone)) {
      showError('phone', 'Please enter a valid phone number (at least 10 digits).');
      ok = false;
    }
    return ok;
  }

  function showSuccess() {
    form.classList.add('hidden');
    if (success) {
      success.classList.remove('hidden');
      success.focus && success.setAttribute('tabindex', '-1');
      success.focus();
    }
  }

  function hideSuccess() {
    if (success) success.classList.add('hidden');
    form.classList.remove('hidden');
    form.reset();
    clearErrors();
    var first = document.getElementById('name');
    if (first) first.focus();
  }

  function saveLocal(payload) {
    try {
      var key = 'chc_early_access';
      var existing = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(existing)) existing = [];
      existing.push(payload);
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (e) {
      /* private mode / quota — ignore */
    }
  }

  function detectNetlify() {
    // Netlify injects forms handling on their hosts; still OK to POST elsewhere
    // and fall back to local success if the network call fails.
    return true;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!validate()) {
      var firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    var submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';
    }

    var payload = {
      name: (form.name.value || '').trim(),
      email: (form.email.value || '').trim(),
      phone: (form.phone.value || '').trim(),
      school: (form.school.value || '').trim(),
      submittedAt: new Date().toISOString()
    };

    saveLocal(payload);

    // Try Netlify Forms POST (works when deployed to Netlify).
    // On file:// or other hosts, fetch may fail — we still show success.
    var body = new URLSearchParams();
    body.set('form-name', 'early-access');
    body.set('name', payload.name);
    body.set('email', payload.email);
    body.set('phone', payload.phone);
    body.set('school', payload.school);

    var finish = function () {
      showSuccess();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Request early access';
      }
    };

    if (FORM_ENDPOINT && window.fetch) {
      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function () { finish(); })
        .catch(function () { finish(); });
    } else if (detectNetlify() && window.fetch && location.protocol !== 'file:') {
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      })
        .then(function () { finish(); })
        .catch(function () { finish(); });
    } else {
      finish();
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', hideSuccess);
  }
})();
