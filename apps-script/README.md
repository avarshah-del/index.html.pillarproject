# Parent email sign-ups

The website form on the home page and the Case Alzheimer's page collects parent sign-ups. You send the emails yourself from contactpillarproject@gmail.com. The site does not create accounts or passwords.

Sign-ups are stored in a Google Sheet on your account. The form sends each one to a Google Apps Script web app that is attached to that sheet.

## 1. Make the sheet

1. Open Google Sheets in the Google account that owns contactpillarproject@gmail.com (or the account you want to own the list).
2. Create a sheet, or open the one you want to use.
3. Rename the first tab to `Sign-ups`. The name must match exactly.
4. In row 1, enter these headers in this order:

   Timestamp | Name | Email | Interests | Signed up on page | Consent

## 2. Add the script

1. In that same sheet, open **Extensions > Apps Script**.
2. Erase the sample code in `Code.gs`.
3. Paste the full contents of `apps-script/Code.gs` from this project.
4. Click the save icon.

Starting from **Extensions > Apps Script** inside the sheet attaches the script to that sheet. The script reads and writes the `Sign-ups` tab on the spreadsheet it belongs to.

## 3. Deploy the web app

1. Click **Deploy > New deployment**.
2. Next to "Select type", click the gear and choose **Web app**.
3. Fill in the deployment:
   - Description: `Parent email sign-ups`
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**.
5. Choose the Google account that owns the sheet and allow the spreadsheet permission.
6. Copy the **Web app URL**. It ends in `/exec`. Do not copy a URL that ends in `/dev`.
7. Open that `/exec` URL in a browser tab. You should see: `Sign-up endpoint is ready.`

Anyone can send a sign-up, which is what a public form needs. The script ignores a filled-in hidden spam field, rejects a bad email address, and skips an email that is already on the list (capital letters do not matter). A new row is:

Timestamp, name, email, interests joined with a comma and a space, the page they signed up on, and `yes` for consent.

## 4. Connect the website

1. Open `signup.js` in this project.
2. Find this line at the top:

   `const SIGNUP_ENDPOINT = '';`

3. Paste the `/exec` URL between the quotes. Leave the quotes in place.
4. Save the file and publish the website the way you usually do.

Until that URL is filled in, both forms show "Sign-ups open soon" and the button stays off.

## If you change the script later

Saving `Code.gs` does not update the live web app.

1. Click **Deploy > Manage deployments**.
2. Click the pencil on the web app deployment.
3. Set Version to **New version**.
4. Click **Deploy**.

The `/exec` URL stays the same. You do not need to edit `signup.js` again.
