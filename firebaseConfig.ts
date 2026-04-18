import { initializeApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";
// MUDEI AQUI: Importação específica para evitar o erro "is not a function"
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import * as firebaseAuth from 'firebase/auth';
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAK_i1WT2JaBxMlJKvLQJnMpjA9QtFp1Uo",
    authDomain: "king-2b6c0.firebaseapp.com",
    projectId: "king-2b6c0",
    storageBucket: "king-2b6c0.firebasestorage.app",
    messagingSenderId: "764823350904",
    appId: "1:764823350904:web:5fc8598fb7ce7ecdba878d",
    measurementId: "G-JBHJRBQ21B"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Auth usando a persistência do React Native corretamente
export const auth = initializeAuth(app, {
  persistence: (firebaseAuth as any).getReactNativePersistence ? 
    (firebaseAuth as any).getReactNativePersistence(ReactNativeAsyncStorage) : 
    undefined
});

export const db = getFirestore(app);