import { getApp, getApps, initializeApp } from 'firebase/app';
// @ts-expect-error Firebase 12 React Native export is available at runtime but missing from TypeScript declarations
import { Auth, getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';

import { Firestore, getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
const firebaseConfig = {
  apiKey: 'AIzaSyDIhlDhwyVgxyL5-5gKeA9Xl8__aDFPVVY',
  authDomain: 'smart-ent-endoscope.firebaseapp.com',
  projectId: 'smart-ent-endoscope',
  storageBucket: 'smart-ent-endoscope.firebasestorage.app',
  messagingSenderId: '333437101862',
  appId: '1:333437101862:web:ba85651fd3b703556203e7',
};

const app = getApps().length > 0
  ? getApp()
  : initializeApp(firebaseConfig);

let auth: Auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db: Firestore = getFirestore(app);

export { app, auth, db, firebaseConfig };

export default app;