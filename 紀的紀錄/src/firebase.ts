import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAqsz7QZ5I8VmlkIvWxsN_BTT6Pr4gy6bA",
  authDomain: "chi-6e58d.firebaseapp.com",
  databaseURL: "https://chi-6e58d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chi-6e58d",
  storageBucket: "chi-6e58d.firebasestorage.app",
  messagingSenderId: "611580908346",
  appId: "1:611580908346:web:bc4f98cab34ff0b9b83603",
  measurementId: "G-5C01LRE5GT"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
