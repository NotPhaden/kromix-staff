"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Save, FileText } from "lucide-react";

export default function StaffDocument({kind, canEdit, onNotice}:{kind:"regulament"|"sanctiuni";canEdit:boolean;onNotice:(s:string)=>void}){
 const [content,setContent]=useState("");
 const [draft,setDraft]=useState("");
 const [busy,setBusy]=useState(false);
 const title=kind==="regulament"?"Regulament intern":"Lista sancțiuni";
 useEffect(()=>{let live=true;(async()=>{if(!supabase)return;const {data,error}=await supabase.from("staff_documents").select("content").eq("slug",kind).maybeSingle();if(!live)return;if(error){onNotice("Nu s-a putut încărca pagina. Aplică migrarea SQL: "+error.message);return;}setContent(data?.content||"");setDraft(data?.content||"");})();return()=>{live=false};},[kind]);
 async function save(e:React.FormEvent){e.preventDefault();if(!supabase||!canEdit)return;setBusy(true);const {error}=await supabase.from("staff_documents").upsert({slug:kind,title,content:draft,updated_at:new Date().toISOString()},{onConflict:"slug"});setBusy(false);if(error)onNotice("Documentul nu a putut fi salvat: "+error.message);else{setContent(draft);onNotice("Pagina a fost actualizată.");}}
 return <div className="registry-page"><div className="page-heading"><div><div className="eyebrow">KROMIX • INFORMAȚII STAFF</div><h1>{title}</h1><p>{kind==="regulament"?"Regulile și procedurile interne ale echipei staff.":"Sancțiunile care pot fi acordate jucătorilor și condițiile aplicării lor."}</p></div></div>
 {canEdit?<form className="surface form-card" onSubmit={save}><div className="section-head"><div><h2>Editează conținutul</h2><p>Doar Fondatorul, Co-Fondatorul și Manager Staff pot modifica textul. Toți membrii îl pot consulta.</p></div><FileText/></div><textarea className="field textarea" style={{minHeight:360}} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Scrie conținutul paginii aici…"/><button className="primary-btn" disabled={busy}>{busy?"Se salvează…":"Salvează pagina"} <Save size={16}/></button></form>:<article className="surface registry-list" style={{whiteSpace:"pre-wrap",lineHeight:1.8}}>{content||"Conținutul nu a fost adăugat încă de conducere."}</article>}
 </div>;
}
