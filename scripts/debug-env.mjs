import { readFileSync } from 'fs';

const loadEnv = (p) => {
  const c = readFileSync(p, 'utf-8');
  const e = {};
  let curKey = null, curVal = '';
  for (const l of c.split(/\r?\n/)) {
    if (curKey) {
      const endM = l.match(/^(.+?)"$/);
      if (endM) { curVal += endM[1]; e[curKey] = curVal; curKey = null; curVal = ''; }
      else curVal += l + '\n';
    } else {
      const m = l.match(/^([^=]+)="(.+)/);
      if (m) { curKey = m[1].trim(); curVal = m[2] + '\n'; }
      else { const sm = l.match(/^([^=]+)="?(.+?)"?$/); if (sm) e[sm[1].trim()] = sm[2].trim(); }
    }
  }
  return e;
};

const eaEnv = loadEnv('C:/Users/Bank Yan/e-arsip-pegawai-sekolah-negeri/.env');
console.log('projectId:', JSON.stringify(eaEnv['FIREBASE_PROJECT_ID']));
console.log('clientEmail:', JSON.stringify(eaEnv['FIREBASE_CLIENT_EMAIL']));
console.log('privateKey length:', eaEnv['FIREBASE_PRIVATE_KEY']?.length);
console.log('privateKey start:', eaEnv['FIREBASE_PRIVATE_KEY']?.substring(0, 60));
console.log('storageBucket:', JSON.stringify(eaEnv['FIREBASE_STORAGE_BUCKET']));

// Also check simpeg-tim env
const seEnv = loadEnv('C:/Users/Bank Yan/simpeg-tim/.env');
console.log('\nTURSO URL:', seEnv['TURSO_DATABASE_URL']);
console.log('TURSO TOKEN:', seEnv['TURSO_AUTH_TOKEN']?.substring(0, 30) + '...');
