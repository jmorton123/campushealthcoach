/**
 * CampusHealthCoach — early-access form
 * Validates client-side, then posts each sign-up (all fields + the optional
 * SMS consent choice, yes or no, with text + timestamp only when yes) to FormSubmit, which emails it to the owner's inbox.
 * The success message only shows after FormSubmit confirms it received it.
 * Then, only for students who opted in to texts with a phone, the same fields are also
 * posted in the background to the coaching engine (ENGINE_SIGNUP_URL; off while empty).
 * Backup: if FormSubmit fails (down, error, timeout), the whole sign-up (texting or not) is sent
 * to the engine instead with _backup=1, which saves it; the error only shows if both fail.
 */
(function () {
  'use strict';

  // Sign-ups go to FormSubmit (formsubmit.co), which emails every submission
  // to the owner's inbox. The random string is FormSubmit's alias for the
  // inbox address, so the address itself isn't exposed in the page source.
  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/14ade8e0644cace45235befb08280af2';

  // Coaching engine signup endpoint. Fill in when the engine is hosted, e.g.
  // 'https://campushealthcoach-engine.fly.dev/signup'. Empty = feature off (nothing is sent).
  // Only students who checked the texting box AND entered a phone are sent, after FormSubmit
  // has confirmed the sign-up. It runs in the background and can never block or fail the sign-up.
  var ENGINE_SIGNUP_URL = 'https://campushealthcoach-engine.fly.dev/signup';

  // ---------------------------------------------------------------------------
  // COACHES — edit names / taglines / colors HERE (and mirror the HTML fallback
  // in index.html #coach-options). Layout is a 2x2 grid; add up to 4 entries.
  // id: used for input id (coach-<id>). value: submitted as `coach`.
  // initial: letter in the avatar. tone: short one-liner. avatarClass: Tailwind.
  // ---------------------------------------------------------------------------
  var COACHES = [
    {
      id: 'marcus',
      value: 'Coach Marcus',
      initial: 'M',
      tone: 'Steady and focused',
      avatarClass: 'bg-brand-600'
    },
    {
      id: 'rip',
      value: 'Coach Rip',
      initial: 'R',
      tone: 'High-energy and fun',
      avatarClass: 'bg-azure-600'
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

  // US mobile numbers: 10 digits. A pasted +1 / leading 1, spaces, dots and parentheses are tolerated.
  function phoneDigits(value) {
    var d = String(value || '').replace(/\D/g, '');
    if (d.charAt(0) === '1') d = d.slice(1); // country code (US area codes never start with 1)
    return d.slice(0, 10);
  }

  // 6175551234 -> 617-555-1234 (partial input formats as it goes: 617, 617-555, 617-555-1)
  function formatPhone(value) {
    var d = phoneDigits(value);
    if (d.length <= 3) return d;
    if (d.length <= 6) return d.slice(0, 3) + '-' + d.slice(3);
    return d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
  }

  function isValidPhone(value) {
    return /^[2-9]\d{9}$/.test(phoneDigits(value)) && String(value || '').replace(/\D/g, '').length <= 11;
  }

  // Format the phone box as the student types or pastes, keeping the caret after the same digit.
  (function attachPhoneFormatter() {
    var input = document.getElementById('phone');
    if (!input) return;
    input.addEventListener('input', function () {
      var raw = input.value;
      var caret = typeof input.selectionStart === 'number' ? input.selectionStart : raw.length;
      var digitsBefore = phoneDigits(raw.slice(0, caret)).length;
      // a leading 1 stripped from the whole value also shifts digits before the caret
      if (raw.replace(/\D/g, '').charAt(0) === '1' && raw.slice(0, caret).replace(/\D/g, '').charAt(0) !== '1') {
        digitsBefore = Math.max(0, digitsBefore - 1);
      }
      var formatted = formatPhone(raw);
      if (formatted === raw) return;
      input.value = formatted;
      var pos = 0, seen = 0;
      while (pos < formatted.length && seen < digitsBefore) {
        if (/\d/.test(formatted.charAt(pos))) seen++;
        pos++;
      }
      try { if (document.activeElement === input) input.setSelectionRange(pos, pos); } catch (e) { /* ignore */ }
    });
    input.addEventListener('blur', function () { input.value = formatPhone(input.value); });
  })();

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
    // Phone is optional. It is only needed if the student checks the optional texting box.
    var wantsTexts = !!(document.getElementById('sms_consent') || {}).checked;
    if (phone && !isValidPhone(phone)) {
      showError('phone', 'Please enter a 10-digit US mobile number, like 617-555-1234, or leave it blank.');
      ok = false;
    } else if (wantsTexts && !phone) {
      showError('phone', 'Add your mobile number to get coaching texts, or leave the texting box unchecked.');
      ok = false;
    }
    if (!coach) {
      showError('coach', 'Please pick a coach.');
      ok = false;
    }
    // Texting consent is optional: never block sign-up on it.
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

  function showSubmitError(message) {
    var el = document.getElementById('submit-error');
    if (!el) {
      el = document.createElement('p');
      el.id = 'submit-error';
      el.setAttribute('role', 'alert');
      el.className = 'text-sm text-center text-red-600';
      var btn = document.getElementById('submit-btn');
      if (btn && btn.parentNode) btn.parentNode.insertBefore(el, btn.nextSibling);
      else form.appendChild(el);
    }
    el.textContent = message;
    el.classList.remove('hidden');
  }

  function hideSubmitError() {
    var el = document.getElementById('submit-error');
    if (el) el.classList.add('hidden');
  }

  // Background post to the coaching engine. Fire-and-forget: every error is swallowed, and the
  // student has already seen the success message. The engine holds new students until Jeff approves.
  function notifyEngine(payload) {
    try {
      if (!ENGINE_SIGNUP_URL || !window.fetch || !window.URLSearchParams) return;
      if (payload.sms_consent !== 'yes' || !payload.phone) return;
      var body = new URLSearchParams();
      ['name', 'email', 'phone', 'school', 'coach', 'sms_consent', 'sms_consent_text',
        'sms_consent_timestamp', 'page_url', 'submitted_at', 'plan', 'ref'].forEach(function (k) {
        if (payload[k]) body.append(k, payload[k]);
      });
      // URL-encoded body = a "simple" CORS request (no preflight); keepalive lets it finish if the page closes.
      fetch(ENGINE_SIGNUP_URL, { method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true, body: body })
        .catch(function () { /* engine down: Jeff still has the FormSubmit email; CSV import is the backup */ });
    } catch (e) {
      /* never let this affect the sign-up */
    }
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    hideSubmitError();
    if (!validate()) {
      var firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Honeypot: real people never fill this hidden field.
    if (fieldValue('bot-field')) {
      showSuccess();
      return;
    }

    var submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';
    }

    var now = new Date().toISOString();
    var consentBox = document.getElementById('sms_consent');
    var smsOptIn = !!(consentBox && consentBox.checked);
    var consentText = function () {
      var el = document.getElementById('sms_consent_text');
      return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    };
    var payload = {
      name: fieldValue('name'),
      email: fieldValue('email'),
      phone: fieldValue('phone') ? formatPhone(fieldValue('phone')) : '',
      school: fieldValue('school'),
      coach: selectedCoach(),
      sms_consent: smsOptIn ? 'yes' : 'no',
      sms_consent_text: smsOptIn ? consentText() : '',
      sms_consent_timestamp: smsOptIn ? now : '',
      contact_preference: smsOptIn ? 'text and email' : 'email only (did not opt in to texts)',
      submitted_at: now,
      page_url: location.href.split('#')[0]
    };

    var resetButton = function () {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Request early access';
      }
    };

    var fail = function () {
      resetButton();
      showSubmitError('Sorry, something went wrong and your sign-up was not sent. Please try again in a minute, or email j.jeffmorton@gmail.com.');
    };

    var succeed = function () {
      saveLocal(payload);
      resetButton();
      showSuccess();
    };

    // FormSubmit failed: send the whole sign-up to the engine, which saves it (signups list --backup).
    var backupOrFail = function (reason) {
      try {
        if (!ENGINE_SIGNUP_URL || !window.fetch || !window.URLSearchParams) { fail(); return; }
        var body = new URLSearchParams();
        Object.keys(payload).forEach(function (k) { if (payload[k]) body.append(k, payload[k]); });
        body.append('_backup', '1');
        body.append('_backup_reason', String(reason || 'unknown').slice(0, 80));
        fetch(ENGINE_SIGNUP_URL, { method: 'POST', mode: 'cors', credentials: 'omit', body: body })
          .then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (d) { return { ok: res.ok, data: d }; });
          })
          .then(function (r) {
            if (r.ok && r.data && r.data.ok === true && r.data.backup_saved === true) succeed();
            else fail();
          })
          .catch(function () { fail(); });
      } catch (e) {
        fail();
      }
    };

    if (!window.fetch) {
      fail();
      return;
    }
    if (!FORM_ENDPOINT) {
      backupOrFail('no_formsubmit');
      return;
    }

    var controller = window.AbortController ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;

    fetch(FORM_ENDPOINT, {
      signal: controller ? controller.signal : undefined,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(Object.assign({
        _subject: 'New CampusHealthCoach early-access signup',
        _template: 'table',
        _captcha: 'false'
      }, payload))
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (r) {
        if (timer) clearTimeout(timer);
        var good = r.ok && r.data && (r.data.success === true || r.data.success === 'true');
        if (good) {
          succeed();
          notifyEngine(payload);
        } else {
          if (window.console) console.warn('Sign-up not accepted:', r.data && r.data.message);
          backupOrFail('formsubmit_rejected');
        }
      })
      .catch(function (err) {
        if (timer) clearTimeout(timer);
        backupOrFail(err && err.name === 'AbortError' ? 'formsubmit_timeout' : 'formsubmit_network');
      });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', hideSuccess);
  }
})();
