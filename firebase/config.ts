import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAQrwrP4-TOti8iqu6sDFeSgQkbnlOCuNc",
  authDomain: "trpg-eec54.firebaseapp.com",
  projectId: "trpg-eec54",
  storageBucket: "trpg-eec54.firebasestorage.app",
  messagingSenderId: "433827114950",
  appId: "1:433827114950:web:78ad2ea3a78f3b5cb54cc7",
};

// 이미 켜져 있으면 다시 켜지 않고, 없으면 새로 켜는 코드
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);