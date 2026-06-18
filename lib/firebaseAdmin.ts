import admin from 'firebase-admin';

let app: any = null;
let db: any = null;
let bucket: any = null;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

// We consider Firebase configured if all essential admin authentication credentials are set
const isFirebaseConfigured = !!(projectId && clientEmail && privateKey);

if (isFirebaseConfigured) {
  try {
    const certPrivateKey = privateKey!.replace(/\\n/g, '\n').replace(/"/g, '');
    const adminAny = admin as any;
    if (!adminAny.apps || !adminAny.apps.length) {
      app = adminAny.initializeApp({
        credential: adminAny.credential.cert({
          projectId,
          clientEmail,
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
      console.warn('Real Firebase Storage bucket could not be resolved, using default:', bucketErr);
    }
    console.log('Firebase Admin SDK successfully initialized.');
  } catch (error) {
    console.error('Failed to initialize real Firebase Admin SDK:', error);
  }
} else {
  console.log('Firebase credentials not detected in .env. Falling back to local data store.');
}

export { app, db, bucket, isFirebaseConfigured };
export default admin;
