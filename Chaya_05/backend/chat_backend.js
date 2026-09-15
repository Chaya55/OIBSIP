/*
 Browser-side backend for the Go Live edition.
 Uses IndexedDB for persistence and BroadcastChannel for realtime events.
*/

const DB_NAME = "GoLiveChatDB";
const DB_VERSION = 1;
const CHANNEL_NAME = "GoLiveRealtimeChat";

const EMOJI = {
  ":smile:":"😄", ":heart:":"❤️", ":thumbsup:":"👍", ":laugh:":"😂",
  ":sad:":"😢", ":fire:":"🔥", ":rocket:":"🚀", ":wave:":"👋",
  ":ok:":"👌", ":party:":"🥳", ":cry:":"😭", ":wink:":"😉", ":clap:":"👏"
};

export function emoji(text) {
  Object.entries(EMOJI).forEach(([k,v]) => text = text.split(k).join(v));
  return text;
}

function openDB() {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("users")) {
        db.createObjectStore("users", {keyPath:"username"});
      }
      if (!db.objectStoreNames.contains("rooms")) {
        db.createObjectStore("rooms", {keyPath:"name"});
      }
      if (!db.objectStoreNames.contains("messages")) {
        const s = db.createObjectStore("messages", {keyPath:"id", autoIncrement:true});
        s.createIndex("room", "room", {unique:false});
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function tx(store, mode, fn) {
  const db = await openDB();
  return new Promise((resolve,reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    try { result = fn(s); } catch(e) { reject(e); return; }
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
  });
}

function randomBytes(n=16) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

function hex(a) {
  return [...a].map(x=>x.toString(16).padStart(2,"0")).join("");
}

async function derive(password, saltHex) {
  const salt = new Uint8Array(saltHex.match(/../g).map(x=>parseInt(x,16)));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {name:"PBKDF2", salt, iterations:100000, hash:"SHA-256"}, key, 256
  );
  return [...new Uint8Array(bits)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

export async function register(username,password) {
  username = username.trim();
  if (!/^[A-Za-z0-9_]{3,24}$/.test(username))
    throw new Error("Username must be 3–24 characters.");
  if (password.length < 4)
    throw new Error("Password must be at least 4 characters.");

  const exists = await getUser(username);
  if (exists) throw new Error("Username already exists.");

  const salt = hex(randomBytes());
  const hash = await derive(password,salt);
  await tx("users","readwrite",s => s.put({
    username, salt, hash, createdAt:new Date().toISOString()
  }));
  return true;
}

async function getUser(username) {
  const db = await openDB();
  return new Promise((resolve,reject) => {
    const r=db.transaction("users","readonly").objectStore("users").get(username);
    r.onsuccess=()=>resolve(r.result);
    r.onerror=()=>reject(r.error);
  });
}

export async function login(username,password) {
  const user = await getUser(username.trim());
  if (!user) throw new Error("Invalid username or password.");
  const hash = await derive(password,user.salt);
  if (hash !== user.hash) throw new Error("Invalid username or password.");
  return user.username;
}

export async function ensureRoom(name) {
  name = name.trim();
  if (!name || name.length > 40) throw new Error("Room name must be 1–40 characters.");
  await tx("rooms","readwrite",s => s.put({name,createdAt:new Date().toISOString()}));
  return name;
}

export async function rooms() {
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const r=db.transaction("rooms","readonly").objectStore("rooms").getAll();
    r.onsuccess=()=>resolve(r.result.map(x=>x.name).sort((a,b)=>a.localeCompare(b)));
    r.onerror=()=>reject(r.error);
  });
}

export async function history(room) {
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const r=db.transaction("messages","readonly").objectStore("messages").index("room").getAll(room);
    r.onsuccess=()=>resolve(r.result.slice(-100));
    r.onerror=()=>reject(r.error);
  });
}

export async function saveMessage(room,username,message) {
  const item={
    room,username,message:emoji(message),
    time:new Date().toISOString()
  };
  await tx("messages","readwrite",s=>s.add(item));
  return item;
}

export async function init() {
  await openDB();
  await ensureRoom("General");
}

export function realtime() {
  const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;
  return {
    send(data) { channel?.postMessage(data); },
    on(fn) { if(channel) channel.onmessage=e=>fn(e.data); },
    close() { channel?.close(); }
  };
}
