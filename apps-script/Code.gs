// Bound to the owner's Google Sheet. The website posts sign-ups here.
// Tab name: Sign-ups
// Columns: Timestamp | Name | Email | Interests | Signed up on page | Consent
//
// Field names from signup.js:
// name, email, interests (repeatable), page, consent ("yes"), website (honeypot)

var SIGNUP_SHEET = 'Sign-ups';
var SIGNUP_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function doGet() {
  return textResponse_('Sign-up endpoint is ready.');
}

function doPost(e) {
  var data = readPost_(e);
  if (data.website) return textResponse_('ok');
  if (!isValidEmail_(data.email)) return textResponse_('invalid email');
  if (data.consent !== 'yes') return textResponse_('consent required');

  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    lock.waitLock(15000);
    locked = true;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return textResponse_('error');
    var sheet = ss.getSheetByName(SIGNUP_SHEET);
    if (!sheet) return textResponse_('error');

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Name', 'Email', 'Interests', 'Signed up on page', 'Consent']);
    }
    if (emailExists_(sheet, data.email)) return textResponse_('ok');

    var interests = [];
    for (var i = 0; i < data.interests.length && interests.length < 12; i++) {
      var item = safeCell_(data.interests[i]);
      if (item) interests.push(item);
    }

    sheet.appendRow([
      new Date(),
      safeCell_(data.name),
      data.email,
      interests.join(', '),
      safeCell_(data.page),
      'yes'
    ]);
    SpreadsheetApp.flush();
    return textResponse_('ok');
  } catch (err) {
    return textResponse_('error');
  } finally {
    if (locked) lock.releaseLock();
  }
}

function readPost_(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var lists = (e && e.parameters) ? e.parameters : {};

  if (!params.email && e && e.postData && e.postData.contents) {
    var parsed = parseFormBody_(e.postData.contents);
    params = parsed.params;
    lists = parsed.lists;
  }

  var interestSource = lists.interests || [];
  if (typeof interestSource === 'string') interestSource = [interestSource];
  if (!interestSource.length && params.interests) interestSource = [params.interests];
  if (interestSource.length === 1 && String(interestSource[0]).indexOf(', ') !== -1) {
    interestSource = String(interestSource[0]).split(', ');
  }

  return {
    website: String(params.website || '').trim(),
    email: String(params.email || '').trim(),
    name: String(params.name || '').trim(),
    page: String(params.page || '').trim(),
    consent: String(params.consent || '').trim().toLowerCase(),
    interests: interestSource
  };
}

function parseFormBody_(body) {
  var params = {};
  var lists = {};
  var parts = String(body || '').split('&');
  for (var i = 0; i < parts.length; i++) {
    if (!parts[i]) continue;
    var eq = parts[i].indexOf('=');
    var rawKey = eq === -1 ? parts[i] : parts[i].slice(0, eq);
    var rawVal = eq === -1 ? '' : parts[i].slice(eq + 1);
    var key = decodePart_(rawKey);
    var val = decodePart_(rawVal);
    if (!key) continue;
    params[key] = val;
    if (!lists[key]) lists[key] = [];
    lists[key].push(val);
  }
  return { params: params, lists: lists };
}

function decodePart_(text) {
  try {
    return decodeURIComponent(String(text || '').replace(/\+/g, ' '));
  } catch (err) {
    return '';
  }
}

function isValidEmail_(email) {
  if (!email || email.length > 254) return false;
  if (/[\r\n\t]/.test(email)) return false;
  return SIGNUP_EMAIL_PATTERN.test(email);
}

function emailExists_(sheet, email) {
  var last = sheet.getLastRow();
  if (last < 2) return false;
  // Row 2 through the last row, column C (Email). Third argument is the row count.
  var values = sheet.getRange(2, 3, last - 1, 1).getValues();
  var target = email.toLowerCase();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim().toLowerCase() === target) return true;
  }
  return false;
}

function safeCell_(value) {
  var text = String(value || '').trim();
  if (text.length > 300) text = text.slice(0, 300);
  if (/^[=+\-@]/.test(text)) return "'" + text;
  return text;
}

function textResponse_(message) {
  return ContentService
    .createTextOutput(message)
    .setMimeType(ContentService.MimeType.TEXT);
}
