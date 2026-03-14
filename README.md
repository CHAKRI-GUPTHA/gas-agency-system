# Gas Agency System

A lightweight online LPG cylinder booking system with user registration, booking requests, admin approvals, payment tracking, notifications, and activity logs.

## Features
- User registration and login (Firebase Auth)
- Cylinder booking with PhonePe QR / Cash on Delivery
- Phone OTP login (Firebase Phone Auth)
- Admin approval or rejection of bookings
- Booking history and quota tracking (12 cylinders/year)
- Notifications for approvals and system updates
- Activity logging for audit and debugging

## Tech Stack
- HTML, CSS, JavaScript (ES modules)
- Firebase Authentication
- Firebase Firestore

## Project Structure
- `public/index.html` — Landing page, login, registration
- `public/user.html` — Customer dashboard
- `public/admin.html` — Admin dashboard
- `public/app.js` — Auth + registration logic
- `public/user.js` — User booking workflow
- `public/admin.js` — Admin approvals and notifications
- `public/firebase.js` — Firebase config
- `firestore.rules` — Firestore rules

## Setup
1. Create a Firebase project.
2. Enable Authentication → Email/Password.
3. Enable Authentication → Phone (for OTP login).
4. Create a Firestore database (in test mode for first run).
5. Update `public/firebase.js` with your Firebase config.
6. Serve the `public` folder:

```bash
npx serve public
```

Or (if Python is available):

```bash
python -m http.server 5500 --directory public
```

Then open the local URL in your browser.

## Public Deployment (Firebase Hosting)
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize hosting: `firebase init hosting`
   - Public directory: `public`
   - SPA: `No`
4. Deploy: `firebase deploy`
5. Add your Hosting domain to Firebase Auth → **Authorized domains**:
   - `your-project.web.app`
   - `your-project.firebaseapp.com`

## Admin Setup
Admins are identified by email in `public/app.js`:

```js
const ADMIN_EMAILS = ["chakriguptha123@gmail.com"];
```

- Add all admin emails to that list.
- Create the account from the registration form.
- Ensure Firestore rules allow admin role access.

## Firestore Collections
- `users` — profile, role, quota
- `bookings` — booking requests + status
- `notifications` — admin broadcasts or single user messages
- `logs` — activity logging

## Logging
Every login, booking, and admin action writes to the `logs` collection. This is used for debugging and auditing.

## Notes
- Email notifications are simulated via the in-app notifications list. Real emails require Firebase Cloud Functions or third‑party services.
- Phone OTP SMS requires Firebase billing for real messages. For demos, use Firebase test phone numbers.

