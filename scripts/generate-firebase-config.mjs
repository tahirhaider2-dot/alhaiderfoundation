import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const requiredVariables = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
];
const missingVariables = requiredVariables.filter(name => !process.env[name]?.trim());

if (missingVariables.length) {
  throw new Error(`Missing required Firebase environment variables: ${missingVariables.join(', ')}`);
}

const trackingEnabled = process.env.FIREBASE_TRACKING_ENABLED?.trim() || 'true';
if (trackingEnabled !== 'true' && trackingEnabled !== 'false') {
  throw new Error('FIREBASE_TRACKING_ENABLED must be either "true" or "false".');
}

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY.trim(),
  authDomain: process.env.FIREBASE_AUTH_DOMAIN.trim(),
  projectId: process.env.FIREBASE_PROJECT_ID.trim(),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET.trim(),
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID.trim(),
  appId: process.env.FIREBASE_APP_ID.trim(),
  measurementId: process.env.FIREBASE_MEASUREMENT_ID?.trim() || '',
};
const appCheckSiteKey = process.env.FIREBASE_APP_CHECK_SITE_KEY?.trim() || '';
const outputPath = fileURLToPath(new URL('../firebase-config.js', import.meta.url));
const generatedModule = [
  `export const firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};`,
  `export const firebaseAppCheckSiteKey = ${JSON.stringify(appCheckSiteKey)};`,
  `export const TRACKING_ENABLED = ${trackingEnabled};`,
  '',
].join('\n');

await writeFile(outputPath, generatedModule, 'utf8');
console.info('Generated firebase-config.js from environment variables.');
