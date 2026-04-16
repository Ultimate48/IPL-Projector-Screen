import { initializeApp } from "firebase/app"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyAhXiV7uxQLOJhBiUXYhKa0GlxzGJlnNYE",
  authDomain: "ipl-dashboard-9ae5b.firebaseapp.com",
  databaseURL: "https://ipl-dashboard-9ae5b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ipl-dashboard-9ae5b",
  storageBucket: "ipl-dashboard-9ae5b.firebasestorage.app",
  messagingSenderId: "602680058814",
  appId: "1:602680058814:web:3e9159c9af17f136514fef",
  measurementId: "G-TZB7BHZXGW"
};

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)