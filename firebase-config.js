/* ========================================================
   Al Haider Foundation — Firebase configuration
   --------------------------------------------------------
   NOTE: These keys are NOT secret — they are meant to live
   in the browser. Your data is protected by Firestore
   security rules, not by hiding these keys.

   Do NOT add `import ... from "firebase/app"` lines here.
   Those only work with a build tool (npm). This site loads
   Firebase straight from the browser via CDN in tracking.js,
   so this file only needs to EXPORT the config + the flag.
   ======================================================== */

export const firebaseConfig = {
  apiKey: "AIzaSyCkbXqFEJM-YVETBzPpxdwNW7N3DoVDDIg",
  authDomain: "alhaider-53e84.firebaseapp.com",
  projectId: "alhaider-53e84",
  storageBucket: "alhaider-53e84.firebasestorage.app",
  messagingSenderId: "758110784077",
  appId: "1:758110784077:web:258e4abcc00414cbfa2a04",
  measurementId: "G-CZ2X8516TR"
};

/* Tracking is now ON. */
export const TRACKING_ENABLED = true;
