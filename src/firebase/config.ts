// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

// ✅ Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyANawOTR26N6Qbgia_PuFKoZkSpa6XfxoU",
  authDomain: "entorno-raff.firebaseapp.com",
  databaseURL: "https://entorno-raff-default-rtdb.firebaseio.com",
  projectId: "entorno-raff",
  storageBucket: "entorno-raff.firebasestorage.app",
  messagingSenderId: "359499848371",
  appId: "1:359499848371:web:f2e7d858ae90e345dfaec6",
};

// 🔹 Inicializamos Firebase
export const app = initializeApp(firebaseConfig);

// 🔹 Exportamos la referencia a la base de datos Realtime
export const db = getDatabase(app);

// 🔹 Autenticación
export const auth = getAuth(app);

// 🔹 Functions
export const functions = getFunctions(app, "us-central1");

// 🔹 Storage
export const storage = getStorage(app);
