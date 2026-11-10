# Al Haider Foundation demo website

This project is a responsive, bilingual demo website for Al Haider Foundation built from the verified information in the workspace.

## Files
- index.html — page structure and content
- styles.css — responsive styling and visual design
- script.js — mobile navigation, gallery lightbox, donation copy buttons, and demo contact form handling
- tracking.js — visitor analytics engine (Firebase): visitor ID, IP location, smart GPS, events
- `.env.example` — placeholder names for Firebase browser configuration
- `scripts/generate-firebase-config.mjs` — generates the ignored browser config at build time
- admin.html — password-protected dashboard to view your visitors & analytics

## Visitor analytics (Firebase) — setup

The site can track who visits, where they are (approximate by default, precise
only if they tap **Allow**), what device they use, where they came from, and
which buttons they click (Download App, Donate, WhatsApp, Call, form submits).
Data is stored in **Firebase Firestore** and viewed in `admin.html`.

> Nothing is tracked until you configure Firebase and enable tracking.

This is a static HTML site with browser ES modules, not a Vite/React/Next.js
application. It has no framework-specific client env prefix. The generated
`firebase-config.js` is a browser asset, so its Firebase web-app identifiers
remain visible to visitors; do not put service-account credentials, private
keys, or other server secrets in these variables.

### 1. Create the Firebase project
1. Go to <https://console.firebase.google.com> → **Add project**.
2. Click the **`</>` (Web)** icon → **Register app** (nickname: `website`).
3. Copy `.env.example` to `.env.local` and fill in the Firebase web app values:
   `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`,
   `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`,
   `FIREBASE_APP_ID`, and, if used, `FIREBASE_MEASUREMENT_ID` and
   `FIREBASE_APP_CHECK_SITE_KEY`. Set `FIREBASE_TRACKING_ENABLED=true` to turn
   on analytics.
4. Generate the browser module before previewing or deploying:

   ```bash
   node --env-file=.env.local scripts/generate-firebase-config.mjs
   ```

   Use Node.js 20.6 or newer. `firebase-config.js` is generated locally, ignored
   by Git, and must be included in the published static site. Do not publish
   before generating it.
5. In your hosting provider's build environment, define the same `FIREBASE_*`
   variables and run `node scripts/generate-firebase-config.mjs` as the build
   command before publishing the site. If using GitHub Actions, define these
   as repository/environment variables and generate the module in the
   deployment workflow. These values are public browser config, not secrets.

### 2. Create the database
- Left menu → **Build → Firestore Database → Create database** → *Production mode*.

### 3. Publish Firestore rules and allowlist admins
In Firestore → **Rules**, publish the contents of **`firestore.rules`**. The
rules restrict public access to validated analytics writes; reads and deletes
require an explicit admin allowlist entry, not merely any signed-in account.

After creating your admin login, copy its UID from Authentication → Users.
In Firestore → **Data**, create `admins/{uid}` using that exact UID as the
document ID and add the boolean field `enabled` with value `true`. Do this for
each trusted dashboard user. Do not create admin entries for visitors.

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
1. **Restrict the browser API key** in Google Cloud Console → APIs & Services →
  Credentials → its Application restrictions → **Websites**. Allow only your
  production domain and any local development origins you actually use.
  Restrict its API access to the Firebase APIs required by this site. The key
  remains visible in browser code; restrictions limit where it can be used.
2. **Enable App Check** in Firebase → App Check. Register the web app with
  reCAPTCHA v3, set its public site key as `FIREBASE_APP_CHECK_SITE_KEY` in the
  environment and add your site domain to the reCAPTCHA allowed domains.
  Confirm both tracking and `admin.html` load correctly, then enable
  enforcement for **Cloud Firestore** and **Authentication**. Do not enable
  enforcement before configuring the site key.
3. **Keep sign-in methods minimal**: enable only **Email/Password**, and add
  only trusted administrators. An account must also have an enabled
  `admins/{uid}` document to read analytics.
4. **Do not commit service-account keys, private reCAPTCHA keys, or other
  secrets.** A Firebase web API key and reCAPTCHA v3 site key are public by
  design and must be protected with restrictions and Firebase security rules.
5. **`admin.html` reads require an allowlisted account**; visitor-supplied text
  is HTML-escaped before display.

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
