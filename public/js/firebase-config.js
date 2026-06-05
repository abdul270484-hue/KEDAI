import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCEcCRxMaqbKUJuJwD92HhxkC6QGYoUCHY",
  authDomain: "madep-ngulon.firebaseapp.com",
  databaseURL: "https://madep-ngulon-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "madep-ngulon",
  storageBucket: "madep-ngulon.firebasestorage.app",
  messagingSenderId: "262407590904",
  appId: "1:262407590904:web:e0344a4c223b0cc97e3c0d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// IMPORTANT
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

// EXPORT
export { app, db, auth, googleProvider };