import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDFWFRaoKLgTJyCB7QQVRIQIDBG_U_7Lo0',
  authDomain: 'daily-100.firebaseapp.com',
  projectId: 'daily-100',
  storageBucket: 'daily-100.firebasestorage.app',
  messagingSenderId: '238608869210',
  appId: '1:238608869210:web:c60db1eef1a155f1b7f563',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

