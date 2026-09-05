import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseOptions,
} from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

/** Web app config for the shared "lostlink-b1e1a" Firebase project. */
export const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDVouWBj1L9XX3_fvlyOcmlAg4JMi3Czl0",
  authDomain: "lostlink-b1e1a.firebaseapp.com",
  projectId: "lostlink-b1e1a",
  storageBucket: "lostlink-b1e1a.firebasestorage.app",
  messagingSenderId: "1017721943617",
  appId: "1:1017721943617:web:09eb32d98fb16e0a6c38c0",
  measurementId: "G-QFQ5Y0BPPP",
};

/**
 * Lazily initialises the Firebase app on first use (client side only).
 * Photos live on Cloudinary, so Firebase Storage is intentionally not wired.
 */
export function getFirebaseServices() {
  if (
    !firebaseConfig.apiKey ||
    !firebaseConfig.projectId ||
    !firebaseConfig.appId
  ) {
    throw new Error(
      "Firebase is not configured. Complete src/lib/firebase.ts first.",
    );
  }
  const fresh = !getApps().length;
  const app = fresh ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  // Local development only: `NEXT_PUBLIC_FIREBASE_EMULATORS=1 npm run dev`
  // points Auth and Firestore at the Firebase emulator suite. The variable is
  // never set on Vercel, so production always talks to the live project.
  if (fresh && process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1") {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  return { app, auth, db };
}
