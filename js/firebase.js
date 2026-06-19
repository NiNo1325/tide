import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
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
  async signIn(){
    // Popup d'abord (fiable sur le web desktop, contourne le souci de stockage
    // tiers du handler de redirection). Repli en redirect si le popup est bloqué
    // ou non supporté (utile pour la future TWA / Play Store).
    try { return await signInWithPopup(auth, provider); }
    catch(e){
      const code = e && e.code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        return signInWithRedirect(auth, provider);
      }
      throw e; // popup fermé/annulé par l'utilisateur : on ne redirige pas
    }
  },
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

api.addFriend = async function(otherUid, otherName){
  const u = api.user; if(!u || !otherUid || otherUid===u.uid) return;
  const { db, doc, setDoc, serverTimestamp } = api._db;
  const pair = [u.uid, otherUid].sort();
  const id = `${pair[0]}__${pair[1]}`;
  await setDoc(doc(db,'friendships',id), { users: pair, createdAt: serverTimestamp() }, { merge:true });
};

api.friendsLeaderboard = async function(ti,di){
  const u = api.user; if(!u) return [];
  const { db, getDocs, collection, query, where } = api._db;
  // 1) mes amitiés
  const fq = query(collection(db,'friendships'), where('users','array-contains',u.uid));
  const fsnap = await getDocs(fq);
  const ids = new Set([u.uid]);
  fsnap.forEach(d => d.data().users.forEach(x => ids.add(x)));
  const uids = Array.from(ids).slice(0,30); // limite Firestore `in`
  // 2) leurs scores pour (ti,di)
  const sq = query(collection(db,'scores'),
    where('ti','==',ti), where('di','==',di), where('uid','in',uids));
  const ssnap = await getDocs(sq);
  const rows = [];
  ssnap.forEach(d => { const s=d.data(); rows.push({ uid:s.uid, name:s.displayName||'Joueur', photo:s.photoURL||'', best:s.best||0 }); });
  rows.sort((a,b)=>b.best-a.best);
  return rows;
};

api.deleteAccount = async function(){
  const u = api.user; if(!u) return;
  const { db, getDocs, deleteDoc, doc, collection, query, where } = api._db;
  const { deleteUser } = api._auth;
  // scores de l'utilisateur
  const ss = await getDocs(query(collection(db,'scores'), where('uid','==',u.uid)));
  for(const d of ss.docs){ await deleteDoc(d.ref); }
  // amitiés impliquant l'utilisateur
  const fs = await getDocs(query(collection(db,'friendships'), where('users','array-contains',u.uid)));
  for(const d of fs.docs){ await deleteDoc(d.ref); }
  // doc user
  await deleteDoc(doc(db,'users',u.uid));
  // compte Auth
  await deleteUser(u);
};

window.tideFb = api;
window.dispatchEvent(new Event('tidefb-ready'));
