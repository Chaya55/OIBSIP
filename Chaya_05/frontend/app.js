import {
  init, register, login, ensureRoom, rooms, history, saveMessage, realtime
} from "../backend/chat_backend.js";

const $=id=>document.getElementById(id);
let mode="login", user=localStorage.getItem("golive_user"), currentRoom="General";
let bus=null;

$("loginTab").onclick=()=>setMode("login");
$("registerTab").onclick=()=>setMode("register");
$("authButton").onclick=auth;
$("password").onkeydown=e=>{if(e.key==="Enter")auth()};
$("username").onkeydown=e=>{if(e.key==="Enter")auth()};

function setMode(m){
  mode=m;
  $("loginTab").classList.toggle("active",m==="login");
  $("registerTab").classList.toggle("active",m==="register");
  $("authButton").textContent=m==="login"?"Login":"Register";
  $("authMessage").textContent="";
}

async function auth(){
  $("authMessage").textContent="";
  try{
    if(mode==="register"){
      await register($("username").value,$("password").value);
      $("authMessage").style.color="#25804a";
      $("authMessage").textContent="Registered successfully. Please log in.";
      setMode("login");
    }else{
      user=await login($("username").value,$("password").value);
      localStorage.setItem("golive_user",user);
      openApp();
    }
  }catch(e){
    $("authMessage").style.color="#c43e3e";
    $("authMessage").textContent=e.message;
  }
}

async function openApp(){
  $("auth").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("me").textContent="@"+user;
  await init();
  bus=realtime();
  bus.on(handleEvent);
  await joinRoom("General");
  renderRooms();
}

async function renderRooms(){
  const list=await rooms();
  $("roomList").innerHTML="";
  list.forEach(r=>{
    const el=document.createElement("div");
    el.className="room"+(r.toLowerCase()===currentRoom.toLowerCase()?" active":"");
    el.textContent="# "+r;
    el.onclick=()=>joinRoom(r);
    $("roomList").appendChild(el);
  });
}

async function joinRoom(room,broadcast=true){
  room=await ensureRoom(room);
  if(currentRoom!==room && broadcast && bus)
    bus.send({type:"left",user,room:currentRoom});
  currentRoom=room;
  $("roomName").textContent=room;
  const items=await history(room);
  $("messages").innerHTML="";
  items.forEach(addMessage);
  renderRooms();
  if(broadcast && bus) bus.send({type:"joined",user,room});
}

$("createRoom").onclick=async()=>{
  try{
    const name=$("roomInput").value.trim();
    if(!name)return;
    await ensureRoom(name);
    $("roomInput").value="";
    await renderRooms();
    await joinRoom(name);
  }catch(e){addSystem(e.message)}
};
$("roomInput").onkeydown=e=>{if(e.key==="Enter")$("createRoom").click()};

$("composer").onsubmit=async e=>{
  e.preventDefault();
  const input=$("message"), text=input.value.trim();
  if(!text)return;
  const item=await saveMessage(currentRoom,user,text);
  addMessage(item);
  bus?.send({type:"message",item});
  input.value="";input.focus();
};

function addMessage(item){
  const d=document.createElement("div");
  d.className="msg"+(item.username===user?" mine":"");
  const date=new Date(item.time);
  d.innerHTML=`<div class="meta">[${date.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}] ${escapeHtml(item.username)}</div><div class="bubble">${escapeHtml(item.message)}</div>`;
  $("messages").appendChild(d);
  $("messages").scrollTop=$("messages").scrollHeight;
}

function addSystem(text){
  const d=document.createElement("div");d.className="system";d.textContent=text;
  $("messages").appendChild(d);$("messages").scrollTop=$("messages").scrollHeight;
}

function handleEvent(e){
  if(e.type==="message" && e.item.room===currentRoom && e.item.username!==user){
    addMessage(e.item);
    if(document.hidden)notifyUser(e.item.username,e.item.message);
  }
  if(e.type==="joined" && e.room===currentRoom && e.user!==user)addSystem(`${e.user} joined the room.`);
  if(e.type==="left" && e.room===currentRoom && e.user!==user)addSystem(`${e.user} left the room.`);
}

$("notify").onclick=async()=>{
  if(!("Notification"in window)){addSystem("Notifications are not supported by this browser.");return}
  const p=await Notification.requestPermission();
  $("notify").textContent=p==="granted"?"Notifications enabled":"Notifications blocked";
};

function notifyUser(title,body){
  if("Notification"in window && Notification.permission==="granted")
    new Notification(title,{body});
}

$("logout").onclick=()=>{
  bus?.close();bus=null;localStorage.removeItem("golive_user");
  user=null;$("app").classList.add("hidden");$("auth").classList.remove("hidden");
};

function escapeHtml(s){
  return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

window.addEventListener("beforeunload",()=>bus?.send({type:"left",user,room:currentRoom}));

if(user)openApp();
