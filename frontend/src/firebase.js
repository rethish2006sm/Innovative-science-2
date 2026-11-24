import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDIBOjJ7LZNlA_eMvWt0FGE79W_b0CCbxY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'innovativescience2-f988a.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'innovativescience2-f988a',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'innovativescience2-f988a.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '605010557704',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:605010557704:web:475eca505c870fe8a28abd',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-LK2JF1S3PE',
}

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const firebaseAuth = getAuth(firebaseApp)
export const googleProvider = new GoogleAuthProvider()

