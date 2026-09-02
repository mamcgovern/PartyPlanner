import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBmfFJbiTwyolCd2j6QqjsxVlI3k9yVPcM",
  authDomain: "party-planner-4c775.firebaseapp.com",
  projectId: "party-planner-4c775",
  storageBucket: "party-planner-4c775.firebasestorage.app",
  messagingSenderId: "624015006333",
  appId: "1:624015006333:web:6fb56c6a1525d624cb6f14",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);