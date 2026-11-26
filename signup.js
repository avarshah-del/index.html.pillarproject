// Parent email list.
// Messages are sent by hand from contactpillarproject@gmail.com.
// This file only collects sign-ups. There are no accounts or passwords.
//
// SETUP: paste the Google Apps Script web app URL (it ends in /exec).
// Leave the quotes empty until that URL exists.
const SIGNUP_ENDPOINT = '';

var SIGNUP_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initParentSignups() {
    var forms = document.querySelectorAll('form[data-parent-signup]');
    for (var i = 0; i < forms.length; i++) {
        setupSignupForm(forms[i]);
    }
}

function setupSignupForm(form) {
    var status = form.querySelector('[data-signup-status]');
    var button = form.querySelector('button[type="submit"]');
    var fields = form.querySelector('[data-signup-fields]');
    var emailInput = form.querySelector('input[name="email"]');
    var consentInput = form.querySelector('input[name="consent"]');

    if (!SIGNUP_ENDPOINT) {
        setSignupStatus(status, 'is-pending', 'Sign-ups open soon');
        if (button) {
            button.disabled = true;
            button.setAttribute('aria-disabled', 'true');
            if (status && status.id) button.setAttribute('aria-describedby', status.id);
        }
    } else if (status) {
        status.textContent = '';
        status.classList.remove('is-pending', 'is-success', 'is-error');
        if (button) {
            button.disabled = false;
            button.removeAttribute('aria-disabled');
        }
    }

    if (emailInput) {
        emailInput.addEventListener('input', function () {
            emailInput.removeAttribute('aria-invalid');
        });
    }
    if (consentInput) {
        consentInput.addEventListener('change', function () {
            consentInput.removeAttribute('aria-invalid');
        });
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        submitSignup(form, status, button, fields, emailInput, consentInput);
    });
}

function submitSignup(form, status, button, fields, emailInput, consentInput) {
    if (!SIGNUP_ENDPOINT) {
        setSignupStatus(status, 'is-pending', 'Sign-ups open soon');
        if (button) {
            button.disabled = true;
            button.setAttribute('aria-disabled', 'true');
        }
        return;
    }
    if (form.getAttribute('data-sending') === 'true') return;

    clearSignupInvalid(form);

    var nameInput = form.querySelector('input[name="name"]');
    var websiteInput = form.querySelector('input[name="website"]');
    var name = nameInput ? nameInput.value.trim() : '';
    var email = emailInput ? emailInput.value.trim() : '';
    var website = websiteInput ? websiteInput.value.trim() : '';
    var pageName = form.getAttribute('data-page') || '';
    var interestInputs = form.querySelectorAll('input[name="interests"]:checked');
    var interests = [];
    for (var i = 0; i < interestInputs.length; i++) {
        interests.push(interestInputs[i].value);
    }

    if (!email) {
        markSignupInvalid(emailInput, status);
        setSignupStatus(status, 'is-error', 'Enter your email address.');
        if (emailInput) emailInput.focus();
        return;
    }
    if (!SIGNUP_EMAIL_PATTERN.test(email) || email.length > 254) {
        markSignupInvalid(emailInput, status);
        setSignupStatus(status, 'is-error', 'Enter a valid email address.');
        if (emailInput) emailInput.focus();
        return;
    }
    if (!consentInput || !consentInput.checked) {
        markSignupInvalid(consentInput, status);
        setSignupStatus(status, 'is-error', 'Check the box to agree to emails from The Pillar Project.');
        if (consentInput) consentInput.focus();
        return;
    }

    var pairs = [
        ['name', name],
        ['email', email],
        ['page', pageName],
        ['consent', 'yes'],
        ['website', website]
    ];
    for (var j = 0; j < interests.length; j++) {
        pairs.push(['interests', interests[j]]);
    }

    form.setAttribute('data-sending', 'true');
    form.setAttribute('aria-busy', 'true');
    if (button) button.disabled = true;
    setSignupStatus(status, 'is-pending', 'Sending your sign-up…');

    fetch(SIGNUP_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        body: new URLSearchParams(pairs)
    }).then(function () {
        if (fields) fields.hidden = true;
        if (button) button.hidden = true;
        form.removeAttribute('aria-busy');
        setSignupStatus(status, 'is-success', "Thank you. You're on the list. We'll email you from contactpillarproject@gmail.com.");
        if (status) status.focus();
    }).catch(function () {
        form.removeAttribute('data-sending');
        form.removeAttribute('aria-busy');
        if (button) {
            button.disabled = false;
            button.removeAttribute('aria-disabled');
        }
        setSignupStatus(status, 'is-error', "Something went wrong, and the sign-up did not send. Please email contactpillarproject@gmail.com and we'll add you.");
        if (status) status.focus();
    });
}

function setSignupStatus(status, kind, message) {
    if (!status) return;
    status.classList.remove('is-pending', 'is-success', 'is-error');
    if (kind) status.classList.add(kind);
    status.textContent = message;
}

function markSignupInvalid(input, status) {
    if (!input) return;
    input.setAttribute('aria-invalid', 'true');
    if (status && status.id) input.setAttribute('aria-describedby', status.id);
}

function clearSignupInvalid(form) {
    var invalid = form.querySelectorAll('[aria-invalid]');
    for (var i = 0; i < invalid.length; i++) {
        invalid[i].removeAttribute('aria-invalid');
        invalid[i].removeAttribute('aria-describedby');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initParentSignups);
} else {
    initParentSignups();
}
