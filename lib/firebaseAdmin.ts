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
    try {
      const mod = await import('firebase-admin');
      const admin = (mod.default || mod) as any;
      const certPrivateKey = privateKey!.replace(/\\n/g, '\n').replace(/"/g, '');
      if (!admin.apps || !admin.apps.length) {
        app = admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey: certPrivateKey }),
          storageBucket: storageBucket || `${projectId}.appspot.com`,
        });
      } else {
        app = admin.apps[0];
      }
      db = admin.firestore();
      try { bucket = admin.storage().bucket(); } catch {}
      console.log('Firebase Admin SDK initialized.');
    } catch (error: any) {
      console.error('Admin SDK init failed:', error?.message || error);
    }
  }
  if (!db && hasClientCreds) {
    try {
      const compat = await import('firebase/compat/app');
      await import('firebase/compat/firestore');
      const firebase = compat.default || compat;
      const config: Record<string, any> = { apiKey, authDomain, projectId, messagingSenderId, appId };
      if (storageBucket) config.storageBucket = storageBucket;
      app = firebase.initializeApp(config);
      db = app.firestore();
      console.log('Firebase Client SDK (compat) initialized. Storage falls back to local.');
    } catch (error: any) {
      console.error('Client SDK init failed, will use local DB:', error?.message || error);
    }
  }
}

if (isFirebaseConfigured) {
  init().catch(e => console.error('Firebase init error:', e));
}

const _defaultAdmin: any = null;
export { app, db, bucket, isFirebaseConfigured };
export default _defaultAdmin;
