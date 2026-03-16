import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBbGygo0_oyPdVd4xXJX_2gYK-dQ9qPqiI",
  authDomain: "aurastick-8957c.firebaseapp.com",
  projectId: "aurastick-8957c",
  storageBucket: "aurastick-8957c.firebasestorage.app",
  messagingSenderId: "441766684000",
  appId: "1:441766684000:web:8283d6228e03efc55e6a05"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Helper functions for easy access
export { db, storage, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, ref, uploadBytes, getDownloadURL, deleteObject };