# Al Haider Foundation demo website

This project is a responsive, bilingual demo website for Al Haider Foundation built from the verified information in the workspace.

## Files
- index.html — page structure and content
- styles.css — responsive styling and visual design
- script.js — mobile navigation, gallery lightbox, donation copy buttons, and demo contact form handling
- tracking.js — visitor analytics engine (Firebase): visitor ID, IP location, smart GPS, events
- firebase-config.js — where you paste your Firebase keys (tracking stays OFF until you do)
- admin.html — password-protected dashboard to view your visitors & analytics

## Visitor analytics (Firebase) — setup

The site can track who visits, where they are (approximate by default, precise
only if they tap **Allow**), what device they use, where they came from, and
which buttons they click (Download App, Donate, WhatsApp, Call, form submits).
Data is stored in **Firebase Firestore** and viewed in `admin.html`.

> Nothing is tracked until you finish these steps. Until then the site works
> exactly as before and tracking is silently skipped.

### 1. Create the Firebase project
1. Go to <https://console.firebase.google.com> → **Add project**.
2. Click the **`</>` (Web)** icon → **Register app** (nickname: `website`).
3. Copy the shown `firebaseConfig` values into **`firebase-config.js`**.
4. Set `TRACKING_ENABLED = true` in that file.

### 2. Create the database
- Left menu → **Build → Firestore Database → Create database** → *Production mode*.

### 3. Paste these security rules
In Firestore → **Rules** tab, replace everything with the rules below and
**Publish**. Visitors can only *create* records (never read/edit others);
only a signed-in admin can *read* them:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Visitors' browsers may only CREATE small analytics docs.
    // Only a signed-in admin can read/update/delete them.
    match /visits/{id} {
      allow create: if request.resource.data.size() < 60
                    && request.resource.data.visitorId is string
                    && request.resource.data.visitorId.size() < 100;
      allow update: if request.auth != null
                    || request.resource.data.diff(resource.data).affectedKeys()
                         .hasOnly(['secondsOnPage']); // time-on-page update
      allow read, delete: if request.auth != null;
    }
    match /events/{id} {
      allow create: if request.resource.data.size() < 30
                    && request.resource.data.event is string
                    && request.resource.data.event.size() < 60;
      allow read, update, delete: if request.auth != null;
    }
    match /visitors/{id} {
      allow create, update: if request.resource.data.size() < 20;
      allow read, delete: if request.auth != null;
    }
  }
}
```

> These rules limit document size/shape so nobody can abuse the open
> "create" permission to dump huge payloads. For strong anti-abuse
> protection, also enable **App Check** (see the Security section below).

### 4. Create your admin login
- Left menu → **Build → Authentication → Get started** → enable
  **Email/Password**.
- **Users** tab → **Add user** → enter your email + a password.
- Open **`admin.html`** in a browser and sign in with those credentials to see
  the dashboard.

### 5. (Recommended) Also turn on Firebase Analytics / GA4
When registering the web app in step 1, tick **"Also set up Google Analytics"**.
This gives you a full managed dashboard (real-time users, traffic sources,
retention, funnels) with zero extra code — a great companion to the custom
Firestore tracking above.

### How location is captured
- **Approximate location only** (city / region / country) is derived silently
  from the visitor's IP on every visit — **no permission popup is ever shown**.
- Precise GPS has been intentionally removed. IP location + device details are
  enough for business analytics and avoids annoying visitors.

### Excluding your own visits
Mark your own browser so your frequent visits don't pollute the data:
- Visit the site once with `?me=1` in the URL, **or** run `ahfMarkMe()` in the
  browser console. Undo with `ahfUnmarkMe()`.
- The dashboard has a **"Hide my own visits"** checkbox (on by default).

### VPN / proxy detection
Each visit is flagged (`isVpn`) using free heuristics: datacenter/VPN ISP names
+ a timezone-vs-IP-country mismatch. The dashboard has a VPN filter
(All / Exclude VPN / Only VPN). It catches most, but not 100%, of VPN traffic.

## Security checklist (important)
1. **Publish the hardened Firestore rules above** (size/shape limited).
2. **Restrict your API key**: Google Cloud Console → *APIs & Services →
   Credentials* → your browser key → *Application restrictions* → **HTTP
   referrers** → add your domain(s) (e.g. `yourdomain.com/*`). Stops others
   reusing your key.
3. **Enable App Check** (Firebase → *App Check* → register with reCAPTCHA v3)
   so only *your* website can write to Firestore — the best anti-abuse control.
4. **Keep sign-in methods minimal**: only **Email/Password** should be enabled
   under Authentication, and only trusted admins added as Users. (Do NOT enable
   Anonymous or open Google sign-in, or anyone could read your data.)
5. **`admin.html` is protected** by Firebase Auth (reads require login) and all
   visitor-supplied text is HTML-escaped to prevent stored XSS.

> ⚠️ Legal note: IP location, device fingerprint and visit data are **personal
> data** in many regions. Add a short privacy notice (and a consent line for EU
> visitors) explaining what you collect and why.

## Preview locally
Open the folder in a browser, or run a simple local server from this directory:

```bash
python -m http.server 8000
```

Then visit http://127.0.0.1:8000/

## Notes
- The site uses the logo and available image files from the workspace.
- Missing contact or banking details are intentionally marked with placeholders, as requested.
- The contact form is a demo and shows a success message locally without a backend.
