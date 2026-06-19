import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult,
  signOut as fbSignOut, onAuthStateChanged, deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, getDocs, deleteDoc,
  collection, query, where, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let listeners = [];
const api = {
  user: null,
  ready: null,            // Promise résolue au 1er état d'auth connu
  onChange(cb){ listeners.push(cb); if (api._known) cb(api.user); },
  signIn(){ return signInWithRedirect(auth, provider); },
  signOut(){ return fbSignOut(auth); },
  // — Firestore (implémentés dans les tâches suivantes) —
  saveScore: async () => {},
  fetchMyScores: async () => ({}),
  addFriend: async () => {},
  friendsLeaderboard: async () => [],
  deleteAccount: async () => {}
};
api._known = false;
api._db = { db, doc, setDoc, getDoc, getDocs, deleteDoc, collection, query, where, orderBy, limit, serverTimestamp };
api._auth = { auth, deleteUser };

api.ready = new Promise(resolve => {
  // Capture le retour de redirection (sinon onAuthStateChanged suffit).
  getRedirectResult(auth).catch(() => {});
  onAuthStateChanged(auth, u => {
    api.user = u;
    api._known = true;
    listeners.forEach(cb => { try { cb(u); } catch(e){} });
    resolve(u);
  });
});

window.tideFb = api;
window.dispatchEvent(new Event('tidefb-ready'));
