import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult,
  signOut as fbSignOut, onAuthStateChanged, deleteUser
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, getDocs, deleteDoc,
  collection, query, where, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
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
  // — Firestore —
  ensureUser: async () => {},
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

api.ensureUser = async function(){
  const u = api.user; if(!u) return;
  const { db, doc, setDoc, serverTimestamp } = api._db;
  await setDoc(doc(db,'users',u.uid), {
    displayName: u.displayName||'Joueur',
    photoURL: u.photoURL||'',
    email: u.email||'',
    createdAt: serverTimestamp()
  }, { merge:true });
};

api.saveScore = async function(ti,di,best,plays){
  const u = api.user; if(!u) return;
  const { db, doc, setDoc, serverTimestamp } = api._db;
  const id = `${u.uid}_${ti}_${di}`;
  await setDoc(doc(db,'scores',id), {
    uid:u.uid, displayName:u.displayName||'Joueur', photoURL:u.photoURL||'',
    ti, di, best, plays, updatedAt: serverTimestamp()
  }, { merge:true });
};

api.fetchMyScores = async function(){
  const u = api.user; if(!u) return {};
  const { db, getDocs, collection, query, where } = api._db;
  const q = query(collection(db,'scores'), where('uid','==',u.uid));
  const snap = await getDocs(q);
  const out = {};
  snap.forEach(d => { const s=d.data(); out[`${s.ti}|${s.di}`] = { best:s.best||0, plays:s.plays||0 }; });
  return out;
};

window.tideFb = api;
window.dispatchEvent(new Event('tidefb-ready'));
