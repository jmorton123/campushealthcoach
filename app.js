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
  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/j.jeffmorton@gmail.com';

  // ---------------------------------------------------------------------------
  // COACHES — edit names / taglines / colors HERE (and mirror the HTML fallback
  // in index.html #coach-options). Layout is a 2x2 grid; add up to 4 entries.
  // id: used for input id (coach-<id>). value: submitted as `coach`.
  // initial: letter in the avatar. tone: short one-liner. avatarClass: Tailwind.
  // ---------------------------------------------------------------------------
  var COACHES = [
    {
      id: 'mike',
      value: 'Coach Mike',
      initial: 'M',
      tone: 'Upbeat and direct',
      avatarClass: 'bg-brand-600'
    },
    {
      id: 'anna',
      value: 'Coach Anna',
      initial: 'A',
      tone: 'Calm and encouraging',
      avatarClass: 'bg-azure-500'
    },
    {
      id: 'sophia',
      value: 'Coach Sophia',
      initial: 'S',
      tone: 'Warm and motivating',
      avatarClass: 'bg-brand-700'
    }
    // Add a 4th (male) coach here when ready, e.g.:
    // { id: 'jordan', value: 'Coach Jordan', initial: 'J', tone: '…', avatarClass: 'bg-azure-600' },
  ];

  var form = document.getElementById('early-access-form');
  var success = document.getElementById('form-success');
  var resetBtn = document.getElementById('reset-form');
  var yearEl = document.getElementById('year');

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  function renderCoaches() {
    var container = document.getElementById('coach-options');
    if (!container || !COACHES.length) return;
    var html = '';
    COACHES.forEach(function (c) {
      html +=
        '<label class="coach-card relative flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-3.5">' +
        '<input type="radio" name="coach" id="coach-' + c.id + '" value="' + c.value.replace(/"/g, '&quot;') + '" required />' +
        '<span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full ' + c.avatarClass + ' text-white text-sm font-bold" aria-hidden="true">' + c.initial + '</span>' +
        '<span class="min-w-0">' +
        '<span class="block text-sm font-semibold text-slate-900">' + c.value + '</span>' +
        '<span class="block text-xs text-slate-500">' + c.tone + '</span>' +
        '</span>' +
        '</label>';
    });
    container.innerHTML = html;
  }

  renderCoaches();

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
    var fieldset = document.getElementById('coach-fieldset');
    if (fieldset) fieldset.classList.remove('coach-invalid');
  }

  function showError(fieldId, message) {
    var msg = form.querySelector('.error-msg[data-for="' + fieldId + '"]');
    if (fieldId === 'coach') {
      form.querySelectorAll('input[name="coach"]').forEach(function (input) {
        input.setAttribute('aria-invalid', 'true');
      });
      var fieldset = document.getElementById('coach-fieldset');
      if (fieldset) fieldset.classList.add('coach-invalid');
    } else {
      var input = document.getElementById(fieldId);
      if (input) {
        input.classList.add('border-red-400');
        input.setAttribute('aria-invalid', 'true');
      }
    }
    if (msg) {
      msg.textContent = message;
      msg.classList.remove('hidden');
    }
  }

  function fieldValue(fieldName) {
    var el = form.elements.namedItem(fieldName);
    if (!el) return '';
    // RadioNodeList
    if (el.length !== undefined && el.value !== undefined && typeof el.item === 'function') {
      return (el.value || '').trim();
    }
    return ((el.value || '') + '').trim();
  }

  function selectedCoach() {
    return fieldValue('coach');
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
    var name = fieldValue('name');
    var email = fieldValue('email');
    var phone = fieldValue('phone');
    var coach = selectedCoach();

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
    if (!coach) {
      showError('coach', 'Please pick a coach.');
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
      name: fieldValue('name'),
      email: fieldValue('email'),
      phone: fieldValue('phone'),
      school: fieldValue('school'),
      coach: selectedCoach(),
      submittedAt: new Date().toISOString()
    };

    saveLocal(payload);

    var body = new URLSearchParams();
    body.set('form-name', 'early-access');
    body.set('name', payload.name);
    body.set('email', payload.email);
    body.set('phone', payload.phone);
    body.set('school', payload.school);
    body.set('coach', payload.coach);

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
        body: JSON.stringify(Object.assign({
          _subject: 'New CampusHealthCoach early-access signup',
          _template: 'table',
          _captcha: 'false'
        }, payload))
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
