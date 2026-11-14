"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowUpFromLine, Award, Ban, Bell, CalendarDays,
  Check, ChevronDown, Clock3, FileText, Gavel, LayoutDashboard, LogOut, Menu,
  MessageCircle, MoreHorizontal, Pencil, Plus, Search, Send, Settings, Shield,
  ShieldCheck, ShieldAlert, Trash2, UserRound, Users, X, Image as ImageIcon, Paperclip,
  Crown, Ticket, Camera, RefreshCw, Filter, Eye, AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import KromixRegisters from "@/components/KromixRegisters";
import StaffDocument from "@/components/StaffDocument";

type Officer = {
 id:string; user_id:string|null; full_name:string; banner_url?:string|null; badge_number:string|null; rank_name:string;
 rank_level:number; avatar_url:string|null; discord_name:string|null; discord_id:string|null;
 game_id:string|null; age:number|null; gender:string|null; last_up:string|null; last_down:string|null;
 status:string; sanctions_count?:number;
};
type Sanction = {id:string;officer_id:string;sanction_type:string;reason:string;issued_at:string;details?:string|null;proof_url?:string|null;active?:boolean;officer?:Officer};
type Message = {id:string;user_id:string;content:string;created_at:string;author?:Officer};
const RANKS=["Junior Helper","Helper","Junior Moderator","Moderator","Junior Admin","Admin","Head Admin","Manager Helper","Manager Admin","Alex M.","Co-Fondator","Fondatoare","Fondator","Manager Staff"];
const RANK_COLORS:Record<string,string>={"Junior Helper":"#8ba7ff","Helper":"#63c9b0","Junior Moderator":"#62b8ed","Moderator":"#9c8cff","Junior Admin":"#e6b45c","Admin":"#f29b63","Head Admin":"#f07878","Manager Helper":"#e1a1e8","Manager Admin":"#e8c66b","Alex M.":"#8ed2ff","Co-Fondator":"#f4a5c5","Fondatoare":"#ff7eb6","Fondator":"#ff7eb6","Manager Staff":"#f2c36d"};
const canManage=(rank:string)=>["Fondator","Fondatoare","Co-Fondator","Manager Staff"].includes(rank);
const initials=(name:string)=>name.split(" ").filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"K";
const date=(v:string|null)=>v?new Date(v).toLocaleString("ro-RO",{dateStyle:"medium",timeStyle:"short"}):"Niciodată";
// Must match the account identifier used by the registration flow in Dashboard.tsx.
async function authEmailForCharacterId(value:string){
 const normalized=value.trim().toLowerCase();
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(normalized));
 const hash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
 return `rp-${hash}@accounts.kromix-rp.invalid`;
}
function legacyAuthEmailForCharacterId(value:string){
 return `${value.trim().toLowerCase().replace(/[^a-z0-9._-]/g,"")}@accounts.Kromix-rp.invalid`;
}
const demo:Officer[]=[
 {id:"d1",user_id:null,full_name:"Alex M.",badge_number:"KX-001",rank_name:"Co-Fondator",rank_level:11,avatar_url:null,discord_name:"alexm",discord_id:"108274930182736491",game_id:"48291",age:24,gender:"Masculin",last_up:new Date(Date.now()-3600000*2).toISOString(),last_down:new Date(Date.now()-3600000*5).toISOString(),status:"Activ"},
 {id:"d2",user_id:null,full_name:"Mara Ionescu",badge_number:"KX-014",rank_name:"Admin",rank_level:5,avatar_url:null,discord_name:"mara.ix",discord_id:"119283746501928374",game_id:"51208",age:21,gender:"Feminin",last_up:new Date(Date.now()-86400000).toISOString(),last_down:new Date(Date.now()-80000000).toISOString(),status:"Activ"},
 {id:"d3",user_id:null,full_name:"Andrei Pop",badge_number:"KX-021",rank_name:"Moderator",rank_level:3,avatar_url:null,discord_name:"andrei.p",discord_id:"102938475610293847",game_id:"61023",age:19,gender:"Masculin",last_up:null,last_down:new Date(Date.now()-86400000*2).toISOString(),status:"Liber"},
 {id:"d4",user_id:null,full_name:"Daria C.",badge_number:"KX-032",rank_name:"Helper",rank_level:1,avatar_url:null,discord_name:"daria",discord_id:"109283746501928374",game_id:"73821",age:18,gender:"Feminin",last_up:new Date(Date.now()-3600000*6).toISOString(),last_down:null,status:"În serviciu"},
];
const nav=[["Overview",LayoutDashboard],["Membri",Users],["Chat staff",MessageCircle],["Evidență CK-Wipe",ShieldAlert],["Inactivitate / Concedii",CalendarDays],["Jaill",Gavel],["Reclamații Staff",MessageCircle],["Blacklist",Ban],["Sancțiuni",Gavel],["Regulament intern",FileText],["Lista sancțiuni",Gavel],["Setări",Settings]] as const;

export default function StaffPanel(){
 const [section,setSection]=useState("Overview"),[userId,setUserId]=useState<string|null>(null),[myOfficer,setMyOfficer]=useState<Officer|null>(null);
 const [officers,setOfficers]=useState<Officer[]>(demo),[sanctions,setSanctions]=useState<Sanction[]>([]),[ticketStats,setTicketStats]=useState<any[]>([]),[ticketDate,setTicketDate]=useState(new Date().toISOString().slice(0,10)),[ticketCount,setTicketCount]=useState("0"),[messages,setMessages]=useState<Message[]>([]),[tickets,setTickets]=useState<any[]>([]);
 const [selected,setSelected]=useState<Officer|null>(null),[search,setSearch]=useState(""),[notice,setNotice]=useState(""),[loading,setLoading]=useState(true);
 const [draft,setDraft]=useState(""),[sanctionType,setSanctionType]=useState("Warn"),[reason,setReason]=useState(""),[proof,setProof]=useState(""),[target,setTarget]=useState("");
 const [edit,setEdit]=useState(false),[editingOfficerId,setEditingOfficerId]=useState<string|null>(null),[profile,setProfile]=useState<any>({}),[mobile,setMobile]=useState(false),[filter,setFilter]=useState("Toți");
 const [reportDate,setReportDate]=useState(new Date().toISOString().slice(0,10)),[loginEmail,setLoginEmail]=useState(""),[loginPassword,setLoginPassword]=useState("");
 const [authMode,setAuthMode]=useState<"login"|"register">("login");
 const [registerForm,setRegisterForm]=useState({lastName:"",firstName:"",characterId:"",password:"",confirmPassword:""});
 const [avatarFile,setAvatarFile]=useState<File|null>(null),[bannerFile,setBannerFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[managerAccess,setManagerAccess]=useState(false);
 const me= myOfficer || demo[0];
 const isManager=canManage(me.rank_name)||managerAccess;
 const isFounder=["Fondator","Fondatoare","Co-Fondator"].includes(me.rank_name)||managerAccess;
 const canOpenManagement= isManager;
 const flash=(s:string)=>{setNotice(s);setTimeout(()=>setNotice(""),4200);};
 const load=useCallback(async()=>{
  if(!supabase){setLoading(false);return;}
  const {data:session}=await supabase.auth.getSession(); const uid=session.session?.user.id||null;setUserId(uid);
  if(!uid){setLoading(false);return;}
  const {data:isBanned}=await supabase.rpc("is_kromix_staff_banned");
  if(isBanned){await supabase.auth.signOut();setUserId(null);setLoading(false);flash("Accesul pe site este suspendat.");return;}
  const {data:rows,error}=await supabase.from("officers").select("id,user_id,full_name,badge_number,avatar_url,banner_url,discord_name,discord_id,game_id,age,gender,last_up,last_down,status,ranks(name,level)").order("full_name");
  if(error){flash("Nu s-au putut încărca membrii: "+error.message);setLoading(false);return;}
  const mapped=(rows||[]).map((r:any)=>({...r,rank_name:r.ranks?.name||"Grad neatribuit",rank_level:Number(r.ranks?.level||0)})) as Officer[];
  if(mapped.length)setOfficers(mapped);
  const mine=mapped.find(o=>o.user_id===uid)||null;setMyOfficer(mine);
  const {data:roleRow}=await supabase.from("user_roles").select("role").eq("user_id",uid).maybeSingle();
  setManagerAccess(["super_admin","commander"].includes(roleRow?.role||""));
  if(mine)setProfile({...mine});
  const {data:ss}=await supabase.from("sanctions").select("*").order("issued_at",{ascending:false});
  if(ss)setSanctions(ss as Sanction[]);
  const {data:ts}=await supabase.from("staff_tickets").select("id,created_by,assigned_to,created_at,closed_at,status");
  if(ts)setTickets(ts);
   const {data:monthlyTickets}=await supabase.from("staff_ticket_stats").select("*").order("period_date",{ascending:false});if(monthlyTickets)setTicketStats(monthlyTickets);
  const {data:chat}=await supabase.from("staff_messages").select("*").order("created_at",{ascending:true}).limit(150);
  if(chat){
   const ids=Array.from(new Set(chat.map((m:any)=>m.user_id)));
   const authors=mapped.filter(o=>ids.includes(o.user_id||""));
   setMessages(chat.map((m:any)=>({...m,author:authors.find(o=>o.user_id===m.user_id)})));
  }
  setLoading(false);
 },[]);
 useEffect(()=>{load();},[load]);
 useEffect(()=>{
  if(!supabase||!userId)return;
  const channel=supabase.channel("staff-live").on("postgres_changes",{event:"*",schema:"public",table:"staff_messages"},()=>load()).subscribe();
  return()=>{supabase?.removeChannel(channel);};
 },[userId,load]);
 const activeSanctions=useMemo(()=>sanctions.filter(s=>s.active!==false),[sanctions]);
 const filtered=useMemo(()=>officers.filter(o=>(filter==="Toți"||o.rank_name===filter)&&`${o.full_name} ${o.discord_name||""} ${o.discord_id||""}`.toLowerCase().includes(search.toLowerCase())),[officers,filter,search]);
 const rankStyle=(rank:string)=>({color:RANK_COLORS[rank]||"#aab6c7",borderColor:(RANK_COLORS[rank]||"#aab6c7")+"55",background:(RANK_COLORS[rank]||"#aab6c7")+"13"});
 async function login(e:React.FormEvent){
  e.preventDefault();if(!supabase)return;
  const characterId=loginEmail.trim();if(!characterId){flash("Introdu ID-ul FiveM.");return;}
  setBusy(true);
  try{
   // Support both older accounts and the current hashed RP account format.
   const legacyEmail=legacyAuthEmailForCharacterId(characterId);
   const legacy=await supabase.auth.signInWithPassword({email:legacyEmail,password:loginPassword});
   if(!legacy.error){await load();return;}
   const hashedEmail=await authEmailForCharacterId(characterId);
   const current=await supabase.auth.signInWithPassword({email:hashedEmail,password:loginPassword});
   if(current.error)flash("Autentificare nereușită: verifică ID-ul FiveM și parola.");
   else await load();
  }catch(err:any){flash("Eroare la autentificare: "+(err?.message||"încearcă din nou."));}
  finally{setBusy(false);}
 }
 async function register(e:React.FormEvent){
  e.preventDefault();if(!supabase)return;
  const f=registerForm;const firstName=f.firstName.trim();const lastName=f.lastName.trim();const characterId=f.characterId.trim();
  if(!firstName||!lastName||!characterId){flash("Completează numele, prenumele și ID-ul FiveM.");return;}
  if(f.password.length<8){flash("Parola trebuie să aibă minimum 8 caractere.");return;}
  if(f.password!==f.confirmPassword){flash("Parolele nu coincid.");return;}
  setBusy(true);
  try{
   const email=await authEmailForCharacterId(characterId);
   const {error}=await supabase.auth.signUp({email,password:f.password,options:{data:{character_id:characterId,rp_first_name:firstName,rp_last_name:lastName,first_name:firstName,last_name:lastName,full_name:`${firstName} ${lastName}`}}});
   if(error){flash("Înregistrare nereușită: "+error.message);return;}
   flash("Cont creat. Te poți autentifica folosind ID-ul FiveM și parola.");
   setLoginEmail(characterId);setLoginPassword("");setAuthMode("login");
   setRegisterForm({lastName:"",firstName:"",characterId:"",password:"",confirmPassword:""});
  }catch(err:any){flash("Eroare la înregistrare: "+(err?.message||"încearcă din nou."));}
  finally{setBusy(false);}
 }
 async function logout(){await supabase?.auth.signOut();setUserId(null);setMyOfficer(null);flash("Te-ai deconectat.");}
 async function saveProfile(e:React.FormEvent){
  e.preventDefault();if(!supabase)return;
  setBusy(true);
  if(editingOfficerId){
   const {data}=await supabase.auth.getSession();const token=data.session?.access_token;
   const response=await fetch("/api/staff/update-officer",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${token||""}`},body:JSON.stringify({officerId:editingOfficerId,profile})});
   const result=await response.json();setBusy(false);
   if(!response.ok){flash(result.error||"Profilul nu a putut fi actualizat.");return;}
   flash("Profilul membrului a fost actualizat.");setEdit(false);setEditingOfficerId(null);load();return;
  }
  if(!myOfficer){setBusy(false);return;}
  let avatar=profile.avatar_url;
  if(avatarFile){const ext=avatarFile.name.split(".").pop()||"png";const path=`${userId}/${Date.now()}.${ext}`;const bucket=supabase.storage.from("staff-avatars");const {error:upErr}=await bucket.upload(path,avatarFile,{upsert:true,contentType:avatarFile.type,cacheControl:"3600"});if(upErr){flash("Imaginea nu a putut fi încărcată. Verifică existența bucket-ului public staff-avatars și permisiunile Storage: "+upErr.message);setBusy(false);return;}avatar=bucket.getPublicUrl(path).data.publicUrl;}let banner=profile.banner_url||null;if(bannerFile){const ext=bannerFile.name.split(".").pop()||"png";const path=`${userId}/banner-${Date.now()}.${ext}`;const bucket=supabase.storage.from("staff-avatars");const {error:upErr}=await bucket.upload(path,bannerFile,{upsert:true,contentType:bannerFile.type,cacheControl:"3600"});if(upErr){flash("Bannerul nu a putut fi încărcat: "+upErr.message);setBusy(false);return;}banner=bucket.getPublicUrl(path).data.publicUrl;}
  const values={full_name:profile.full_name,avatar_url:avatar,banner_url:banner,discord_name:profile.discord_name,discord_id:profile.discord_id,game_id:profile.game_id,age:profile.age?Number(profile.age):null,gender:profile.gender};
  const {error}=await supabase.from("officers").update(values).eq("id",myOfficer.id);
  setBusy(false);if(error)flash("Profilul nu a putut fi salvat: "+error.message);else{flash("Profil actualizat.");setEdit(false);setAvatarFile(null);setBannerFile(null);load();}
 }
 async function sendMessage(e:React.FormEvent){e.preventDefault();if(!supabase||!userId||!draft.trim())return;const {error}=await supabase.from("staff_messages").insert({user_id:userId,content:draft.trim()});if(error)flash("Mesajul nu a putut fi trimis: "+error.message);else{setDraft("");load();}}
 async function addSanction(e:React.FormEvent){e.preventDefault();if(!supabase||!target||!reason.trim())return;const officer=officers.find(o=>o.id===target);const {error}=await supabase.from("sanctions").insert({officer_id:target,sanction_type:sanctionType,reason:reason.trim(),proof_url:proof.trim()||null,issued_by:myOfficer?.id||null,active:true});if(error)flash("Sancțiunea nu a putut fi salvată: "+error.message);else{flash(`Sancțiune adăugată pentru ${officer?.full_name}.`);setReason("");setProof("");load();}}
 async function sanctionAction(s:Sanction,action:"edit"|"remove"){
  if(!supabase||!isManager)return;
  if(action==="remove"){if(!confirm("Elimini această sancțiune?"))return;const {error}=await supabase.from("sanctions").update({active:false}).eq("id",s.id);if(error)flash(error.message);else{flash("Sancțiune eliminată.");load();}}
  else{const next=prompt("Motivul actualizat:",s.reason);if(next===null)return;const {error}=await supabase.from("sanctions").update({reason:next}).eq("id",s.id);if(error)flash(error.message);else{flash("Sancțiune editată.");load();}}
 }
 async function setShift(kind:"UP"|"DOWN"){
  if(!supabase||!myOfficer)return;
  const now=new Date().toISOString();
  if(kind==="UP"){
   const {data:open}=await supabase.from("attendance").select("id").eq("officer_id",myOfficer.id).is("shift_end",null).limit(1);
   if(open?.length){flash("Ai deja un UP activ.");return;}
   const {error}=await supabase.from("attendance").insert({officer_id:myOfficer.id,shift_start:now});
   if(error)flash(error.message);else{await supabase.from("officers").update({last_up:now,status:"În serviciu"}).eq("id",myOfficer.id);flash("UP înregistrat.");load();}
  }else{
   const {data:open}=await supabase.from("attendance").select("id").eq("officer_id",myOfficer.id).is("shift_end",null).order("shift_start",{ascending:false}).limit(1);
   if(!open?.length){flash("Nu ai un UP activ.");return;}
   const {error}=await supabase.from("attendance").update({shift_end:now}).eq("id",open[0].id);
   if(error)flash(error.message);else{await supabase.from("officers").update({last_down:now,status:"Activ"}).eq("id",myOfficer.id);flash("DOWN înregistrat.");load();}
  }
 }
 async function updateMember(o:Officer,field:string,value:any){if(!supabase||!isManager)return;const {error}=await supabase.from("officers").update({[field]:value}).eq("id",o.id);if(error)flash(error.message);else{flash("Datele membrului au fost actualizate.");load();}}
 async function changeRank(o:Officer,kind:"UP"|"DOWN"){
  if(!supabase||!isManager||!myOfficer)return;
  const actorIsFounder=["Fondator","Fondatoare","Co-Fondator"].includes(myOfficer.rank_name)||managerAccess;
  if(!actorIsFounder&&o.rank_level>=myOfficer.rank_level){flash("Manager Staff poate modifica doar gradele aflate sub propriul grad.");return;}
  const {data:ranks,error:rankError}=await supabase.from("ranks").select("id,name,level").order("level",{ascending:true});
  if(rankError||!ranks?.length){flash("Nu s-au putut încărca gradele: "+(rankError?.message||"lista este goală"));return;}
  const current=ranks.findIndex((r:any)=>r.id===(o as any).rank_id||Number(r.level)===o.rank_level);
  if(current<0){flash("Gradul actual nu a fost găsit.");return;}
  const nextIndex=kind==="UP"?current+1:current-1;
  if(nextIndex<0||nextIndex>=ranks.length){flash("Nu există un grad disponibil în această direcție.");return;}
  const next=ranks[nextIndex];
  if(!actorIsFounder&&(Number(next.level)>myOfficer.rank_level||next.name==="Manager Staff")){flash("Manager Staff nu poate promova peste propriul grad sau acorda gradul Manager Staff.");return;}
  const {error}=await supabase.from("officers").update({rank_id:next.id}).eq("id",o.id);
  if(error)flash("Gradul nu a putut fi modificat: "+error.message);
  else{flash(`${o.full_name}: ${kind} → ${next.name}.`);load();}
 }
 async function assignRank(o:Officer,name:string){
  if(!supabase||!isManager||!myOfficer)return;
  const founder=["Fondator","Fondatoare","Co-Fondator"].includes(myOfficer.rank_name)||managerAccess;
  if(!founder&&o.rank_level>=myOfficer.rank_level){flash("Manager Staff poate modifica doar gradele aflate sub propriul grad.");return;}
  const {data:ranks,error}=await supabase.from("ranks").select("id,name,level");
  if(error||!ranks){flash("Nu s-au putut încărca gradele.");return;}
  const next=ranks.find((x:any)=>x.name===name);
  if(!next){flash("Gradul selectat nu există în lista de grade.");return;}
  if(!founder&&(Number(next.level)>myOfficer.rank_level||name==="Manager Staff")){flash("Manager Staff nu poate acorda grade egale/superioare propriului grad.");return;}
  const {error:updateError}=await supabase.from("officers").update({rank_id:next.id}).eq("id",o.id);
  if(updateError)flash("Gradul nu a putut fi modificat: "+updateError.message);
  else{flash(`Gradul lui ${o.full_name} a fost actualizat: ${name}.`);setSelected({...o,rank_name:name,rank_level:Number(next.level)});load();}
 }
 async function banMember(o:Officer){if(!supabase||!isManager||!o.user_id)return;const {data:existing}=await supabase.from("staff_site_bans").select("user_id").eq("user_id",o.user_id).maybeSingle();if(existing){const {error}=await supabase.from("staff_site_bans").delete().eq("user_id",o.user_id);if(error)flash(error.message);else flash("Ban-ul de pe site a fost ridicat.");return;}const why=prompt("Motivul banului pe site:");if(why===null)return;const {error}=await supabase.from("staff_site_bans").upsert({user_id:o.user_id,reason:why,banned_by:userId},{onConflict:"user_id"});if(error)flash(error.message);else flash("Accesul pe site a fost blocat.");}
 async function deleteMember(o:Officer){if(!supabase||!isManager||!o.user_id)return;if(!confirm(`Ștergi definitiv contul ${o.full_name}? Acțiunea nu poate fi anulată.`))return;const {data}=await supabase.auth.getSession();const token=data.session?.access_token;if(!token)return;const response=await fetch("/api/staff/delete-user",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},body:JSON.stringify({userId:o.user_id})});const result=await response.json();if(!response.ok)flash(result.error||"Contul nu a putut fi șters.");else{flash("Contul a fost șters.");setSection("Membri");load();}}
 async function toggleMute(o:Officer){if(!supabase||!isManager||!o.user_id)return;const {data:existing}=await supabase.from("staff_chat_mutes").select("user_id").eq("user_id",o.user_id).maybeSingle();if(existing){const {error}=await supabase.from("staff_chat_mutes").delete().eq("user_id",o.user_id);if(error)flash(error.message);else flash("Mute-ul a fost ridicat.");}else{const why=prompt("Motiv mute (opțional):")||null;const {error}=await supabase.from("staff_chat_mutes").insert({user_id:o.user_id,reason:why,muted_by:userId});if(error)flash(error.message);else flash("Membrul a primit mute pe chat.");}}
 const openProfile=(o:Officer)=>{setSelected(o);setSection("Profil membru");};
 const stat=(label:string,value:string,icon:any,accent:string)=>{const Icon=icon;return <div className="stat-card"><div className="stat-icon" style={{color:accent,background:accent+"18"}}><Icon size={19}/></div><div><div className="stat-label">{label}</div><div className="stat-value">{value}</div></div></div>;};
 if(!userId&&supabase)return <main className="login-shell"><div className="login-card"><div className="brand-mark"><img src="/kromix-mark.png" alt="KROMIX"/></div><div className="eyebrow">KROMIX • STAFF ACCESS</div><h1>Staff Panel</h1><p className="muted">Intră folosind ID-ul personajului FiveM. Nu ai nevoie de email sau număr de telefon.</p>
 <div className="auth-tabs"><button type="button" className={authMode==="login"?"auth-tab active":"auth-tab"} onClick={()=>{setAuthMode("login");setNotice("");}}>Autentificare</button><button type="button" className={authMode==="register"?"auth-tab active":"auth-tab"} onClick={()=>{setAuthMode("register");setNotice("");}}>Înregistrare</button></div>
 {authMode==="login"?<form onSubmit={login} className="stack"><label>ID personaj FiveM<input className="field" type="text" required autoComplete="username" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="Introdu ID-ul FiveM"/></label><label>Parolă<input className="field" type="password" required autoComplete="current-password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="••••••••"/></label><button className="primary-btn" disabled={busy}>{busy?"Se conectează…":"Intră în cont"} <span>→</span></button></form>:
 <form onSubmit={register} className="stack"><label>Nume<input className="field" type="text" required autoComplete="family-name" value={registerForm.lastName} onChange={e=>setRegisterForm(v=>({...v,lastName:e.target.value}))} placeholder="Numele real"/></label><label>Prenume<input className="field" type="text" required autoComplete="given-name" value={registerForm.firstName} onChange={e=>setRegisterForm(v=>({...v,firstName:e.target.value}))} placeholder="Prenumele real"/></label><label>ID personaj FiveM<input className="field" type="text" required value={registerForm.characterId} onChange={e=>setRegisterForm(v=>({...v,characterId:e.target.value}))} placeholder="ID-ul tău FiveM"/></label><label>Parolă<input className="field" type="password" required minLength={8} autoComplete="new-password" value={registerForm.password} onChange={e=>setRegisterForm(v=>({...v,password:e.target.value}))} placeholder="Minimum 8 caractere"/></label><label>Confirmă parola<input className="field" type="password" required minLength={8} autoComplete="new-password" value={registerForm.confirmPassword} onChange={e=>setRegisterForm(v=>({...v,confirmPassword:e.target.value}))} placeholder="Repetă parola"/></label><button className="primary-btn" disabled={busy}>{busy?"Se creează contul…":"Creează cont"} <span>→</span></button></form>}
 {notice&&<p className="auth-notice" role="alert">{notice}</p>}<small>Autentificare securizată prin Supabase Auth. Gradul și permisiunile sunt atribuite separat de conducere.</small></div></main>;
  async function saveTicketStat(e:React.FormEvent){
   e.preventDefault();if(!supabase||!isManager||!selected||!userId)return;
   const {error}=await supabase.from("staff_ticket_stats").upsert({officer_id:selected.id,period_date:ticketDate,ticket_count:Math.max(0,Number(ticketCount)||0),created_by:userId},{onConflict:"officer_id,period_date"});
   if(error)flash("Nu s-a putut salva evidența ticketelor: "+error.message);else{flash("Evidența ticketelor a fost actualizată.");const {data}=await supabase.from("staff_ticket_stats").select("*").order("period_date",{ascending:false});setTicketStats(data||[]);}
  }
 return <div className="app-shell">
  <aside className={`sidebar ${mobile?"sidebar-open":""}`}><div className="brand"><div className="brand-mark"><img src="/kromix-mark.png" alt="KROMIX"/></div><div><b>KROMIX</b><span>STAFF PANEL</span></div><button className="mobile-close" onClick={()=>setMobile(false)}><X/></button></div>
   <div className="workspace"><span className="online-dot"/> STAFF WORKSPACE <ChevronDown size={14}/></div>
   <div className="nav-caption">MENIU PRINCIPAL</div><nav>{nav.filter(([label])=>!["Blacklist","Sancțiuni"].includes(label)||canOpenManagement).map(([label,Icon])=><button key={label} className={`nav-link ${section===label?"active":""}`} onClick={()=>{setSection(label);setSelected(null);setMobile(false);}}><Icon size={17}/><span>{label}</span>{label==="Chat staff"&&<i className="nav-live"/>}</button>)}</nav>
   <div className="sidebar-bottom"><div className="mini-profile"><Avatar officer={me}/><div className="mini-info"><b>{me.full_name}</b><span>{me.rank_name}</span></div><button title="Deconectare" onClick={logout}><LogOut size={16}/></button></div><div className="version">KROMIX STAFF • v1.0.0</div></div>
  </aside>
  <main className="main-area"><header className="topbar"><div className="top-left"><button className="mobile-menu" onClick={()=>setMobile(true)}><Menu/></button><div><div className="breadcrumb">KROMIX <span>/</span> {section.toUpperCase()}</div><div className="top-title">{section==="Overview"?"Bun venit în staff panel":section}</div></div></div><div className="top-actions"><span className="secure-label"><Shield size={14}/> Conexiune securizată</span><button className="icon-button" onClick={()=>load()} title="Reîncarcă"><RefreshCw size={17}/></button><button className="top-user" onClick={()=>setSection("Profilul meu")}><Avatar officer={me}/><div><b>{me.full_name}</b><span>{me.rank_name}</span></div><ChevronDown size={14}/></button></div></header>
  <div className="content">
  {section==="Overview"&&<><div className="welcome-row"><div><h1>Salut, {me.full_name.split(" ")[0]} <span>✦</span></h1><p className="muted">Aici ai tot ce se întâmplă în echipa Kromix, într-un singur loc.</p></div><button className="outline-btn" onClick={()=>setSection("Profilul meu")}><UserRound size={16}/> Profilul meu</button></div>
   <div className="stats-grid">{stat("Membri staff",String(officers.length),Users,"#8b9cff")}{stat("Sancțiuni active",String(activeSanctions.length),Gavel,"#f0a66d")}{stat("Mesaje chat",String(messages.length),MessageCircle,"#bd91f7")}</div>
   <div className="dashboard-grid"><section className="surface"><div className="section-head"><div><h2>Activitate recentă</h2><p>Ultimele modificări din echipă</p></div></div><div className="activity-list">{officers.slice(0,5).map(o=><div className="activity-item" key={o.id}><Avatar officer={o}/><div className="activity-copy"><b>{o.full_name}</b><span>{o.last_up?"Ultimul UP: "+date(o.last_up):"Nu are încă un UP înregistrat"}</span></div><Rank rank={o.rank_name}/></div>)}</div></section>
   <section className="surface quick-panel"><div className="section-head"><div><h2>Acțiuni rapide</h2><p>Scurtături pentru activitatea ta</p></div></div><div className="quick-actions">{isManager&&<button onClick={()=>setSection("Sancțiuni")}><span className="quick-icon orange"><Gavel/></span><b>Adaugă sancțiune</b><small>Registru sancțiuni staff</small></button>}<button onClick={()=>setSection("Chat staff")}><span className="quick-icon purple"><MessageCircle/></span><b>Deschide chat-ul</b><small>Discută cu echipa</small></button></div></section></div>
   <section className="surface"><div className="section-head"><div><h2>Echipa ta</h2><p>O privire rapidă asupra membrilor staff</p></div><button className="text-btn" onClick={()=>setSection("Membri")}>Toți membrii →</button></div><div className="member-strip">{officers.slice(0,6).map(o=><button className="member-chip" key={o.id} onClick={()=>openProfile(o)}><Avatar officer={o}/><span><b>{o.full_name}</b><small>{o.rank_name}</small></span><i className={o.status==="În serviciu"?"status-dot on":"status-dot"}/></button>)}</div></section>
  </>}
  {section==="Membri"&&<><PageHeading title="Membrii staff" desc="Toți membrii echipei, gradele și activitatea lor."/><div className="surface"><div className="toolbar"><div className="searchbox"><Search size={17}/><input placeholder="Caută după nume sau Discord ID…" value={search} onChange={e=>setSearch(e.target.value)}/></div><select className="select" value={filter} onChange={e=>setFilter(e.target.value)}><option>Toți</option>{RANKS.map(r=><option key={r}>{r}</option>)}</select><span className="result-count">{filtered.length} membri</span></div><div className="members-table"><div className="table-head"><span>MEMBRU</span><span>GRAD</span><span>ULTIMUL UP</span><span>ULTIMUL DOWN</span><span>SANCȚIUNI</span><span/></div>{filtered.map(o=><div className="table-row" key={o.id}><div className="person-cell"><Avatar officer={o}/><div><b>{o.full_name}</b><small>{o.discord_name||"Discord nesetat"} · {o.badge_number||"Fără cod"}</small></div></div><div><Rank rank={o.rank_name}/></div><div className="date-cell">{date(o.last_up)}</div><div className="date-cell">{date(o.last_down)}</div><div><span className="count-pill">{sanctions.filter(s=>s.officer_id===o.id&&s.active!==false).length}</span></div><div className="row-actions"><button className="icon-button" title="Vezi profil" onClick={()=>openProfile(o)}><Eye size={16}/></button>{isManager&&<><button className="icon-button" title="UP grad" onClick={()=>changeRank(o,"UP")}><ArrowUpFromLine size={15}/></button><button className="icon-button" title="DOWN grad" onClick={()=>changeRank(o,"DOWN")}><ArrowDownToLine size={15}/></button></>}</div></div>)}</div></div></>}
  {section==="Profilul meu"&&<ProfileView officer={myOfficer||me} sanctions={sanctions} ticketStats={ticketStats.filter(x=>x.officer_id===(myOfficer||me).id)} own onEdit={()=>{setProfile({...me});setEdit(true);}} onSanction={()=>setSection("Sancțiuni")}/>}
  {section==="Profil membru"&&selected&&<><button className="back-link" onClick={()=>setSection("Membri")}>← Înapoi la membri</button><ProfileView officer={selected} sanctions={sanctions} ticketStats={ticketStats.filter(x=>x.officer_id===selected.id)} onSanction={()=>setSection("Sancțiuni")}/>{isManager&&<form className="surface form-card admin-tools" onSubmit={saveTicketStat}><h3>Evidență tickete lunară / zilnică</h3><label>Data evidenței<input className="field" type="date" value={ticketDate} onChange={e=>setTicketDate(e.target.value)}/></label><label>Număr tickete<input className="field" type="number" min="0" value={ticketCount} onChange={e=>setTicketCount(e.target.value)}/></label><button className="primary-btn">Salvează ticketele</button></form>}{isManager&&<div className="surface admin-tools"><h3>Instrumente de administrare</h3><label>Grad staff<select className="field" value={selected.rank_name} onChange={e=>assignRank(selected,e.target.value)}>{RANKS.map(r=><option key={r}>{r}</option>)}</select></label><div className="admin-actions"><button className="outline-btn" onClick={()=>{const v=prompt("Nume nou:",selected.full_name);if(v)updateMember(selected,"full_name",v);}}><Pencil size={15}/> Editează numele</button><button className="outline-btn" onClick={()=>changeRank(selected,"UP")}><ArrowUpFromLine size={15}/> UP grad</button><button className="outline-btn" onClick={()=>changeRank(selected,"DOWN")}><ArrowDownToLine size={15}/> DOWN grad</button><button className="outline-btn" onClick={()=>toggleMute(selected)}><MessageCircle size={15}/> Mute / Unmute chat</button><button className="outline-btn danger" onClick={()=>banMember(selected)}><Ban size={15}/> Ban / Unban site</button><button className="outline-btn danger" onClick={()=>deleteMember(selected)}><Trash2 size={15}/> Șterge contul</button></div></div>}</>}
  {section==="Chat staff"&&<><PageHeading title="Chat staff" desc="Conversații în timp real cu toată echipa."/><div className="chat-shell surface"><div className="chat-top"><div className="chat-room-icon"><MessageCircle/></div><div><b>Camera generală</b><span><i className="status-dot on"/> Toată echipa • mesaje live</span></div><span className="chat-secure"><ShieldCheck size={14}/> Staff only</span></div><div className="chat-messages">{messages.length?messages.map(m=><div className={`chat-message ${m.user_id===userId?"mine":""}`} key={m.id}><Avatar officer={m.author||me}/><div className="bubble-wrap"><div className="bubble-meta"><b>{m.author?.full_name||"Membru staff"}</b><Rank rank={m.author?.rank_name||"Staff"}/><time>{date(m.created_at)}</time></div><div className="bubble">{m.content}</div></div></div>):<div className="empty-chat"><MessageCircle size={30}/><b>Chat-ul e pregătit</b><span>Fii primul care trimite un mesaj echipei.</span></div>}</div><form className="chat-compose" onSubmit={sendMessage}><button type="button" className="icon-button" title="Atașamente indisponibile momentan"><Paperclip size={18}/></button><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Scrie un mesaj pentru staff…" maxLength={2000}/><button className="send-btn" disabled={!draft.trim()}><Send size={17}/></button></form></div></>}
  {section==="Sancțiuni"&&isManager&&<><PageHeading title="Registrul sancțiunilor" desc="Evidență transparentă pentru warn-uri, down-uri și alte măsuri."/><div className="two-col"><form className="surface form-card" onSubmit={addSanction}><div className="section-head"><div><h2>Adaugă sancțiune</h2><p>Completează detaliile măsurii.</p></div><div className="form-icon"><Gavel/></div></div><label>Membru<select className="field" required value={target} onChange={e=>setTarget(e.target.value)}><option value="">Selectează membrul…</option>{officers.map(o=><option key={o.id} value={o.id}>{o.full_name} — {o.rank_name}</option>)}</select></label><label>Tip sancțiune<select className="field" value={sanctionType} onChange={e=>setSanctionType(e.target.value)}>{["Warn","Down","Strike","Avertisment verbal","Suspendare","Altă sancțiune"].map(x=><option key={x}>{x}</option>)}</select></label><label>Motiv<textarea className="field textarea" required value={reason} onChange={e=>setReason(e.target.value)} placeholder="Descrie clar motivul sancțiunii…"/></label><label>Dovadă (link opțional)<input className="field" value={proof} onChange={e=>setProof(e.target.value)} placeholder="https://…"/></label><button className="primary-btn" disabled={!target||!reason.trim()||!supabase}>Înregistrează sancțiunea <Plus size={16}/></button>{!isManager&&<small className="muted">Adăugarea sancțiunilor este permisă conform politicilor bazei de date.</small>}</form><section className="surface"><div className="section-head"><div><h2>Sancțiuni active</h2><p>{activeSanctions.length} înregistrări active</p></div><span className="count-pill">{activeSanctions.length}</span></div><div className="sanction-list">{activeSanctions.map(s=><SanctionCard key={s.id} sanction={s} officer={officers.find(o=>o.id===s.officer_id)} manager={isManager} onEdit={()=>sanctionAction(s,"edit")} onRemove={()=>sanctionAction(s,"remove")}/>) }{!activeSanctions.length&&<Empty title="Nicio sancțiune activă" desc="Registrul este curat momentan."/>}</div></section></div></>}
  {["Evidență CK-Wipe","Inactivitate / Concedii","Jaill","Reclamații Staff","Blacklist"].includes(section)&& (section!=="Blacklist"||isManager)&&<KromixRegisters section={section} officers={officers} userId={userId} myOfficerId={myOfficer?.id||null} manager={isManager} onNotice={flash}/>}
  {(section==="Regulament intern"||section==="Lista sancțiuni")&&<StaffDocument kind={section==="Regulament intern"?"regulament":"sanctiuni"} canEdit={isFounder||me.rank_name==="Manager Staff"} onNotice={flash}/>}
  {section==="Setări"&&<><PageHeading title="Setări" desc="Preferințe și informații despre platformă."/><div className="surface settings-card"><div className="settings-row"><div><b>Cont și autentificare</b><span>Conectat prin Supabase Auth</span></div><span className="pill-success">Securizat</span></div><div className="settings-row"><div><b>Rol curent</b><span>{me.rank_name}</span></div><Rank rank={me.rank_name}/></div><div className="settings-row"><div><b>Actualizare date</b><span>Reîncarcă datele membrilor, chat-ul și sancțiunile.</span></div><button className="outline-btn" onClick={load}><RefreshCw size={15}/> Reîncarcă</button></div><div className="settings-row"><div><b>Sesiune</b><span>Închide sesiunea curentă.</span></div><button className="outline-btn danger" onClick={logout}><LogOut size={15}/> Deconectare</button></div></div></>}
  </div></main>
  {edit&&<div className="modal-backdrop" onClick={()=>setEdit(false)}><form className="edit-modal" onClick={e=>e.stopPropagation()} onSubmit={saveProfile}><div className="modal-head"><div><h2>Editează profilul</h2><p>Actualizează informațiile tale publice.</p></div><button type="button" className="icon-button" onClick={()=>{setEdit(false);setEditingOfficerId(null);}}><X/></button></div><label>Fotografie de profil<div className="avatar-upload"><Avatar officer={{...me,avatar_url:profile.avatar_url}}/><label className="outline-btn upload-btn"><Camera size={15}/> Alege imagine<input type="file" accept="image/*" onChange={e=>setAvatarFile(e.target.files?.[0]||null)} hidden/></label><small>{avatarFile?.name||"JPG, PNG sau WEBP"}</small></div></label><label>Banner profil<div className="avatar-upload"><span className="muted">Imagine de copertă</span><label className="outline-btn upload-btn"><Camera size={15}/> Alege banner<input type="file" accept="image/*" onChange={e=>setBannerFile(e.target.files?.[0]||null)} hidden/></label><small>{bannerFile?.name||"JPG, PNG sau WEBP"}</small></div></label>{[["full_name","Nume afișat"],["discord_name","Nume de pe Discord"],["discord_id","ID Discord"],["game_id","ID joc"],["age","Vârstă"]].map(([key,label])=><label key={key}>{label}<input className="field" value={profile[key]??""} onChange={e=>setProfile((p:any)=>({...p,[key]:e.target.value}))}/></label>)}{editingOfficerId&&<label>Grad staff<select className="field" value={profile.rank_name||""} onChange={e=>setProfile((p:any)=>({...p,rank_name:e.target.value}))}>{RANKS.map(r=><option key={r}>{r}</option>)}</select></label>}<label>Gen<select className="field" value={profile.gender||""} onChange={e=>setProfile((p:any)=>({...p,gender:e.target.value}))}><option value="">Nespecificat</option><option>Masculin</option><option>Feminin</option><option>Prefer să nu spun</option></select></label><div className="modal-actions"><button type="button" className="outline-btn" onClick={()=>{setEdit(false);setEditingOfficerId(null);}}>Anulează</button><button className="primary-btn" disabled={busy}>{busy?"Se salvează…":"Salvează profilul"}</button></div></form></div>}
  {notice&&<div className="toast"><Check size={17}/>{notice}<button onClick={()=>setNotice("")}><X size={15}/></button></div>}
  {loading&&<div className="loading-indicator">Se sincronizează cu Supabase…</div>}
 </div>;
}

function Avatar({officer,size="normal"}:{officer:Partial<Officer>;size?:"normal"|"large"}){return officer.avatar_url?<img className={`avatar ${size==="large"?"avatar-large":""}`} src={officer.avatar_url} alt={officer.full_name||"Avatar"}/>:<div className={`avatar avatar-fallback ${size==="large"?"avatar-large":""}`}>{initials(officer.full_name||"Kromix")}</div>;}
function Rank({rank}:{rank:string}){return <span className="rank-badge" style={{color:RANK_COLORS[rank]||"#aab6c7",borderColor:(RANK_COLORS[rank]||"#aab6c7")+"55",background:(RANK_COLORS[rank]||"#aab6c7")+"13"}}><span/> {rank}</span>;}
function PageHeading({title,desc}:{title:string;desc:string}){return <div className="page-heading"><div><div className="eyebrow">KROMIX STAFF • MANAGEMENT</div><h1>{title}</h1><p>{desc}</p></div></div>;}
function Empty({title,desc}:{title:string;desc:string}){return <div className="empty-state"><ShieldCheck size={25}/><b>{title}</b><span>{desc}</span></div>;}
function ProfileView({officer,sanctions,own,onEdit,onSanction,ticketStats=[]}:{officer:Officer;sanctions:Sanction[];own?:boolean;onEdit?:()=>void;onSanction:()=>void;ticketStats?:any[]}){
 const mine=sanctions.filter(s=>s.officer_id===officer.id&&s.active!==false);
 return <div className="profile-layout"><section className="profile-hero surface"><div className="profile-cover" style={officer.banner_url?{backgroundImage:`linear-gradient(90deg,#090d1dcc,#090d1d55),url(${officer.banner_url})`,backgroundSize:"cover",backgroundPosition:"center"}:undefined}><div className="cover-grid"/></div><div className="profile-main"><Avatar officer={officer} size="large"/><div className="profile-name"><h1>{officer.full_name}</h1><Rank rank={officer.rank_name}/><p>{officer.discord_name?`@${officer.discord_name}`:"Cont Discord nesetat"} • {officer.badge_number||"Membru staff"}</p></div>{own&&<button className="outline-btn edit-profile" onClick={onEdit}><Pencil size={15}/> Editează profilul</button>}</div><div className="profile-details"><Info label="Nume de pe Discord" value={officer.discord_name}/><Info label="ID de pe Discord" value={officer.discord_id}/><Info label="ID de joc" value={officer.game_id}/><Info label="Vârstă" value={officer.age?`${officer.age} ani`:null}/><Info label="Gen" value={officer.gender}/><Info label="Grad staff" value={officer.rank_name}/></div></section><div className="profile-side"><section className="surface profile-stats"><h3>Tickete înregistrate</h3>{ticketStats.length?ticketStats.map((x:any)=><div className="profile-stat" key={x.id}><span>{new Date(x.period_date+"T12:00:00").toLocaleDateString("ro-RO")}</span><b>{x.ticket_count} tickete</b></div>):<p className="muted">Nu există evidențe de tickete.</p>}</section><section className="surface profile-stats"><h3>Activitate</h3><div className="profile-stat"><span><ArrowUpFromLine size={16}/> Ultimul UP</span><b>{date(officer.last_up)}</b></div><div className="profile-stat"><span><ArrowDownToLine size={16}/> Ultimul DOWN</span><b>{date(officer.last_down)}</b></div><div className="profile-stat"><span><Gavel size={16}/> Sancțiuni active</span><b>{mine.length}</b></div><div className="profile-stat"><span><Activity size={16}/> Status</span><b>{officer.status}</b></div></section><section className="surface profile-sanctions"><div className="section-head"><div><h3>Istoric sancțiuni</h3><p>Vizibil pentru membrii staff</p></div><span className="count-pill">{mine.length}</span></div>{mine.length?mine.map(s=><div className="mini-sanction" key={s.id}><span className="sanction-dot"/><div><b>{s.sanction_type}</b><p>{s.reason}</p><small>{date(s.issued_at)}</small>{s.proof_url&&<a href={s.proof_url} target="_blank" rel="noreferrer">Vezi dovada ↗</a>}</div></div>):<Empty title="Fără sancțiuni" desc="Acest membru nu are sancțiuni active."/>}</section></div></div>;
}
function Info({label,value}:{label:string;value:any}){return <div className="info-item"><span>{label}</span><b>{value||"—"}</b></div>;}
function SanctionCard({sanction,officer,manager,onEdit,onRemove}:{sanction:Sanction;officer?:Officer;manager:boolean;onEdit:()=>void;onRemove:()=>void}){return <article className="sanction-card"><div className="sanction-card-top"><div><span className="sanction-type">{sanction.sanction_type}</span><small>{officer?.full_name||"Membru"} • {date(sanction.issued_at)}</small></div>{manager&&<div className="sanction-actions"><button className="icon-button" onClick={onEdit} title="Editează"><Pencil size={15}/></button><button className="icon-button" onClick={onRemove} title="Elimină"><Trash2 size={15}/></button></div>}</div><p>{sanction.reason}</p>{sanction.proof_url&&<a href={sanction.proof_url} target="_blank" rel="noreferrer">Deschide dovada ↗</a>}</article>;}
