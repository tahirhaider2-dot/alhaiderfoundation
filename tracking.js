/* ========================================================
   Al Haider Foundation — tracking.js
   --------------------------------------------------------
   Smart, privacy-conscious visitor analytics on Firebase.

   What it captures (no sign-in, no location prompt):
     • A stable per-browser visitor ID (localStorage UUID)
     • Visit count + first/last seen  → new vs returning
     • Approximate location from IP (city / region / country)
       — completely silent, no permission popup ever shown
     • VPN / proxy heuristic flag
     • Device / browser / screen / language / timezone + fingerprint
     • Referrer + UTM campaign params (where they came from)
     • Key business events: App download, Donate, WhatsApp,
       Call, contact-form submit, gallery views
     • Time spent on the page (sent when they leave)

   Data is written to Firestore. See README.md for setup
   + security rules + the admin dashboard (admin.html).
   ======================================================== */

import { firebaseConfig, TRACKING_ENABLED } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, collection, addDoc, doc, setDoc,
  serverTimestamp, increment
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/* ── Bail out early if Firebase isn't configured yet ── */
if (!TRACKING_ENABLED) {
  console.info('[tracking] disabled — set TRACKING_ENABLED = true in firebase-config.js after adding your keys.');
}

let db = null;
if (TRACKING_ENABLED) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (err) {
    console.warn('[tracking] Firebase init failed:', err);
  }
}

/* ════════════════════════════════════════
   IDENTITY — stable per-browser visitor id
════════════════════════════════════════ */
const LS = {
  visitorId: 'ahf_visitor_id',
  firstSeen: 'ahf_first_seen',
  visitCount: 'ahf_visit_count',
};

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function getVisitorId() {
  let id = localStorage.getItem(LS.visitorId);
  if (!id) {
    id = uuid();
    localStorage.setItem(LS.visitorId, id);
    localStorage.setItem(LS.firstSeen, new Date().toISOString());
  }
  return id;
}

const visitorId = getVisitorId();
const sessionId = uuid();
const isReturning = !!localStorage.getItem(LS.visitCount);
const visitCount = (parseInt(localStorage.getItem(LS.visitCount) || '0', 10) + 1);
localStorage.setItem(LS.visitCount, String(visitCount));

/* ── OWNER / INTERNAL FLAG ──
   Mark this browser as "yours" so your own frequent visits can be
   filtered out on the dashboard. Set it ONE of two ways:
     • Visit the site once with  ?me=1   in the URL, OR
     • Run  ahfMarkMe()  in the browser console.
   Remove it later with  ahfUnmarkMe().                       */
const OWNER_KEY = 'ahf_owner';
if (new URLSearchParams(location.search).get('me') === '1') {
  localStorage.setItem(OWNER_KEY, '1');
}
const isInternal = localStorage.getItem(OWNER_KEY) === '1';
window.ahfMarkMe = () => { localStorage.setItem(OWNER_KEY, '1'); console.info('[tracking] This browser is now marked as INTERNAL (your own). Future visits are tagged internal:true.'); };
window.ahfUnmarkMe = () => { localStorage.removeItem(OWNER_KEY); console.info('[tracking] Internal mark removed.'); };

/* ════════════════════════════════════════
   DEVICE FINGERPRINT (semi-stable device id)
   NOTE: Browsers do NOT expose a real hardware
   device ID (privacy). This builds a "fingerprint"
   from many device signals + a canvas/WebGL hash,
   which stays fairly stable for the same device
   even if cookies/localStorage are cleared.
════════════════════════════════════════ */
function hashStr(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

function getGpuInfo() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return '';
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  } catch { return ''; }
}

function getCanvasHash() {
  try {
    const c = document.createElement('canvas');
    c.width = 240; c.height = 60;
    const ctx = c.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = "16px 'Arial'";
    ctx.fillStyle = '#0c3b1c';
    ctx.fillRect(2, 2, 200, 24);
    ctx.fillStyle = '#d4a017';
    ctx.fillText('AlHaider-\u0627\u0644\u062d\u06cc\u062f\u0631', 6, 6);
    return hashStr(c.toDataURL());
  } catch { return ''; }
}

function getConnection() {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c) return null;
  return { effectiveType: c.effectiveType || '', downlink: c.downlink || null, rtt: c.rtt || null, saveData: !!c.saveData };
}

function getDeviceFingerprint(extra) {
  const raw = [
    navigator.userAgent, navigator.platform, navigator.language,
    (navigator.languages || []).join(','),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency, navigator.deviceMemory,
    navigator.maxTouchPoints, window.devicePixelRatio,
    extra.gpu, extra.canvas,
  ].join('|');
  return hashStr(raw);
}

/* ════════════════════════════════════════
   DEVICE / BROWSER INFO
════════════════════════════════════════ */
function getDeviceInfo() {
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const gpu = getGpuInfo();
  const canvas = getCanvasHash();
  const deviceFingerprint = getDeviceFingerprint({ gpu, canvas });

  // Persist the fingerprint so it survives even if the localStorage
  // visitor id is cleared but the device stays the same.
  if (!localStorage.getItem('ahf_device_fp')) {
    localStorage.setItem('ahf_device_fp', deviceFingerprint);
  }

  return {
    userAgent: ua,
    deviceType: isMobile ? 'mobile' : 'desktop',
    platform: navigator.platform || '',
    vendor: navigator.vendor || '',
    language: navigator.language || '',
    languages: (navigator.languages || []).join(','),
    screen: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio || 1,
    cpuCores: navigator.hardwareConcurrency || null,
    deviceMemoryGB: navigator.deviceMemory || null,
    touchPoints: navigator.maxTouchPoints || 0,
    gpu,
    deviceFingerprint,
    connection: getConnection(),
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    online: navigator.onLine,
    referrer: document.referrer || 'direct',
    landingPage: location.pathname + location.search,
    siteLang: localStorage.getItem('ahf-lang') || 'en',
  };
}

function getUTM() {
  const p = new URLSearchParams(location.search);
  const utm = {};
  ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid']
    .forEach(k => { const v = p.get(k); if (v) utm[k] = v; });
  return utm;
}

/* ════════════════════════════════════════
   APPROXIMATE LOCATION (IP based, no prompt)
   Tries multiple free providers for reliability.
════════════════════════════════════════ */
async function getIpLocation() {
  const providers = [
    { url: 'https://ipwho.is/', map: d => d.success === false ? null : ({
        ip: d.ip, city: d.city, region: d.region, country: d.country,
        countryCode: d.country_code, lat: d.latitude, lng: d.longitude,
        isp: d.connection?.isp, org: d.connection?.org,
        timezone: d.timezone?.id, type: d.type, source: 'ipwho.is'
      }) },
    { url: 'https://ipapi.co/json/', map: d => d.error ? null : ({
        ip: d.ip, city: d.city, region: d.region, country: d.country_name,
        countryCode: d.country_code, lat: d.latitude, lng: d.longitude,
        isp: d.org, org: d.org, timezone: d.timezone, source: 'ipapi.co'
      }) },
    { url: 'https://get.geojs.io/v1/ip/geo.json', map: d => ({
        ip: d.ip, city: d.city, region: d.region, country: d.country,
        countryCode: d.country_code, lat: parseFloat(d.latitude),
        lng: parseFloat(d.longitude), isp: d.organization_name,
        timezone: d.timezone, source: 'geojs' }) },
  ];
  for (const p of providers) {
    try {
      const res = await fetch(p.url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      const mapped = p.map(data);
      if (mapped && mapped.country) return mapped;
    } catch { /* try next provider */ }
  }
  return null;
}

/* ════════════════════════════════════════
   VPN / PROXY DETECTION (heuristic, free)
   No paid API. Uses two strong signals:
   1) The ISP/org looks like a datacenter/VPN provider
      (real home users are on ISPs, not AWS/OVH/NordVPN).
   2) The IP's timezone (country) doesn't match the
      browser's own timezone → classic VPN giveaway.
   Not 100% (nothing is), but catches most VPN traffic.
════════════════════════════════════════ */
const VPN_KEYWORDS = [
  'hosting','datacenter','data center','colocation','cloud','server',
  'amazon','aws','google llc','google cloud','microsoft','azure','oracle',
  'digitalocean','ovh','vultr','linode','akamai','fastly','cloudflare',
  'm247','leaseweb','choopa','hetzner','contabo','scaleway','hostinger',
  'nordvpn','expressvpn','surfshark','protonvpn','cyberghost','mullvad',
  'private internet','purevpn','ipvanish','windscribe','hidemyass','tunnelbear',
  'vpn','proxy','tor exit','tor network','datapacket','g-core','psychz',
];

/* ── Pakistani Legitimate ISPs whitelist ──
   Prevents false-positive VPN flags on real Pakistani ISP names.
   Any ISP matching here is excluded from the datacenter keyword check. */
const PAKISTAN_LEGITIMATE_ISPS = [
  'ptcl','pakistan telecommunication','paktel','ptml',
  'zong','cmpak','china mobile pakistan',
  'jazz','mobilink','warid','jazztel','jazzconnect',
  'telenor pakistan','telenor pk',
  'ufone','pktelecom','u-fone',
  'nayatel','stormfiber','wateen',
  'worldcall','sco','special communications',
  'transworld','twc','multinet','cybernet','fascom',
  'wi-tribe','brain telecommunication','linkdotnet','supernet',
  'micronet','sharp computing','nexlinx','comsats',
  'beep','ntc','fiberlink','onic',
];

function detectVpn(ipLoc) {
  if (!ipLoc) return { isVpn: false, confidence: 0, reasons: [] };
  const reasons = [];
  let score = 0;

  const org = `${ipLoc.isp || ''} ${ipLoc.org || ''}`.toLowerCase();
  const country = (ipLoc.country || '').toLowerCase();
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const ipTz = ipLoc.timezone || '';

  /* ── Signal 1: Datacenter / VPN ISP ──
     Skip check if ISP is a known legitimate Pakistani provider
     to eliminate false positives on PTCL, Jazz, Zong, etc. */
  const isPakistaniLegitISP = PAKISTAN_LEGITIMATE_ISPS.some(k => org.includes(k));
  if (!isPakistaniLegitISP && org && VPN_KEYWORDS.some(k => org.includes(k))) {
    reasons.push('datacenter/VPN ISP');
    score += 55;
  }

  /* ── Signal 2: Timezone mismatch ── */
  if (ipTz && browserTz && ipTz !== browserTz) {
    const ipRegion = ipTz.split('/')[0];
    const brRegion = browserTz.split('/')[0];
    if (ipRegion && brRegion && ipRegion !== brRegion) {
      // Different continent (e.g., Asia vs Europe) — strong signal
      reasons.push('IP timezone ≠ browser timezone');
      score += 40;
    } else {
      // Same continent, different city (e.g., Asia/Karachi vs Asia/Dubai)
      reasons.push('IP city timezone ≠ browser timezone');
      score += 18;
    }
  }

  /* ── Signal 3: Pakistan-specific — IP says PK but browser TZ is not PKT ──
     Pakistan Standard Time = Asia/Karachi (UTC+5:00).
     Real Pakistani users almost always have Asia/Karachi in their browser. */
  if (country === 'pakistan' && browserTz && browserTz !== 'Asia/Karachi') {
    reasons.push('Pakistan IP but non-PKT browser timezone');
    score += 28;
  }

  /* ── Signal 4: IP type field (if returned by API) ── */
  const ipType = (ipLoc.type || '').toLowerCase();
  if (ipType && (ipType.includes('datacenter') || ipType.includes('hosting') || ipType.includes('vpn'))) {
    reasons.push('datacenter IP type flag');
    score += 45;
  }

  const confidence = Math.min(score, 100);
  return {
    isVpn: confidence >= 40,
    confidence,
    reasons,
  };
}

/* ════════════════════════════════════════
   FIRESTORE WRITES
════════════════════════════════════════ */
let visitDocId = null;   // id of THIS visit's document (for later updates)

async function saveVisit() {
  const device = getDeviceInfo();
  const utm = getUTM();
  const ipLocation = await getIpLocation();
  const vpn = detectVpn(ipLocation);

  // 1) Upsert a per-visitor profile doc (aggregate view of this person).
  if (db) {
    try {
      await setDoc(doc(db, 'visitors', visitorId), {
        visitorId,
        lastSeen: serverTimestamp(),
        lastCity: ipLocation?.city || null,
        lastCountry: ipLocation?.country || null,
        totalVisits: increment(1),
        deviceType: device.deviceType,
        internal: isInternal,
        firstSeen: localStorage.getItem(LS.firstSeen) || new Date().toISOString(),
      }, { merge: true });
    } catch (e) { console.warn('[tracking] visitor upsert failed', e); }

    // 2) Add a detailed record for THIS individual visit.
    try {
      const ref = await addDoc(collection(db, 'visits'), {
        visitorId, sessionId,
        isReturning, visitCount,
        internal: isInternal,
        isVpn: vpn.isVpn,
        vpnConfidence: vpn.confidence,
        vpnReasons: vpn.reasons,
        createdAt: serverTimestamp(),
        clientTime: new Date().toISOString(),
        ...device,
        utm,
        ipLocation: ipLocation || null,
      });
      visitDocId = ref.id;
    } catch (e) { console.warn('[tracking] visit save failed', e); }
  } else {
    // Firebase not configured — log locally so you can still verify it works.
    console.info('[tracking] (demo) visit', { visitorId, isReturning, visitCount, ipLocation, device, utm });
  }

  return ipLocation;
}

/* ════════════════════════════════════════
   EVENT TRACKING (business actions)
════════════════════════════════════════ */
async function trackEvent(name, extra = {}) {
  const payload = {
    event: name, visitorId, sessionId,
    page: location.pathname, createdAt: serverTimestamp(),
    clientTime: new Date().toISOString(), ...extra,
  };
  if (!db) { console.info('[tracking] (demo) event', name, extra); return; }
  try { await addDoc(collection(db, 'events'), payload); }
  catch (e) { console.warn('[tracking] event failed', e); }
}
// expose for inline handlers / other scripts if needed
window.ahfTrack = trackEvent;

function wireEventListeners() {
  const map = [
    ['.btn-download-app', 'app_download_click'],
    ['[href$=".apk"]',    'apk_click'],
    ['.btn-donate-hero, .btn-donate-nav, .btn-footer-donate, [href="donate.html"]', 'donate_click'],
    ['[href^="https://wa.me"], .whatsapp-float', 'whatsapp_click'],
    ['[href^="tel:"]',    'call_click'],
    ['[href^="mailto:"]', 'email_click'],
    ['.gallery-card',     'gallery_view'],
  ];
  document.addEventListener('click', e => {
    for (const [sel, name] of map) {
      if (e.target.closest(sel)) { trackEvent(name); break; }
    }
  }, { capture: true });

  // Form submissions (contact + donate)
  const contact = document.getElementById('contact-form');
  if (contact) contact.addEventListener('submit', () => trackEvent('contact_form_submit'));
  const donate = document.getElementById('donate-form');
  if (donate) donate.addEventListener('submit', () => trackEvent('donate_form_submit', {
    amount: donate.amount?.value || null,
    purpose: donate.purpose?.value || null,
  }));
}

/* ════════════════════════════════════════
   TIME ON PAGE — sent when the user leaves
════════════════════════════════════════ */
function wireTimeOnPage() {
  const start = Date.now();
  const send = () => {
    const seconds = Math.round((Date.now() - start) / 1000);
    if (seconds < 2) return;
    // keepalive lets the request survive the page unloading
    if (db && visitDocId) {
      setDoc(doc(db, 'visits', visitDocId), { secondsOnPage: seconds }, { merge: true })
        .catch(() => {});
    } else {
      console.info('[tracking] (demo) secondsOnPage', seconds);
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') send();
  });
}

/* ════════════════════════════════════════
   BOOTSTRAP
════════════════════════════════════════ */
(async function init() {
  try {
    wireEventListeners();
    wireTimeOnPage();
    await saveVisit();     // approx (IP) location + full visit record
  } catch (e) {
    console.warn('[tracking] init error', e);
  }
})();
