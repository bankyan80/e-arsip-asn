import admin from 'firebase-admin';

let app: any = null;
let db: any = null;
let bucket: any = null;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
const apiKey = process.env.FIREBASE_API_KEY;
const authDomain = process.env.FIREBASE_AUTH_DOMAIN;
const messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.FIREBASE_APP_ID;

const hasAdminCreds = !!(projectId && clientEmail && privateKey);
const hasClientCreds = !!(apiKey && projectId);
const isFirebaseConfigured = hasAdminCreds || hasClientCreds;

async function init() {
  if (hasAdminCreds) {
    const certPrivateKey = privateKey!.replace(/\\n/g, '\n').replace(/"/g, '');
    const adminAny = admin as any;
    if (!adminAny.apps || !adminAny.apps.length) {
      app = adminAny.initializeApp({
        credential: adminAny.credential.cert({
          projectId, clientEmail,
          privateKey: certPrivateKey,
        }),
        storageBucket: storageBucket || `${projectId}.appspot.com`,
      });
    } else {
      app = adminAny.apps[0];
    }
    db = adminAny.firestore();
    try {
      bucket = adminAny.storage().bucket();
    } catch (bucketErr) {
      console.warn('Firebase Storage bucket could not be resolved:', bucketErr);
    }
    console.log('Firebase Admin SDK initialized.');
  } else if (hasClientCreds) {
    try {
      const mod = await import('firebase/compat/app');
      await import('firebase/compat/firestore');
      const firebase = mod.default || mod;
      const config: Record<string, any> = { apiKey, authDomain, projectId, messagingSenderId, appId };
      if (storageBucket) config.storageBucket = storageBucket;
      app = firebase.initializeApp(config);
      db = app.firestore();
      console.log('Firebase Client SDK (compat) initialized. Storage falls back to local.');
    } catch (error: any) {
      console.error('Firebase Client SDK init failed, will use local DB:', error?.message || error);
    }
  }
}

if (isFirebaseConfigured) {
  init().catch(e => console.error('Firebase init error:', e));
} else {
  console.log('Firebase credentials not detected. Using local data store.');
}

export { app, db, bucket, isFirebaseConfigured };
export default admin;
