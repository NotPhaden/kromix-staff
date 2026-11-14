import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export async function POST(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!service)return NextResponse.json({error:"Lipsește configurarea serverului Supabase."},{status:500});
 const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");if(!token)return NextResponse.json({error:"Autentificare necesară."},{status:401});
 const auth=createClient(url,anon,{auth:{persistSession:false}});const {data:{user},error:authErr}=await auth.auth.getUser(token);
 if(authErr||!user)return NextResponse.json({error:"Sesiune invalidă."},{status:401});
 const admin=createClient(url,service,{auth:{persistSession:false}});
 const [{data:role},{data:officer}]=await Promise.all([
  admin.from("user_roles").select("role").eq("user_id",user.id).maybeSingle(),
  admin.from("officers").select("id,ranks(name)").eq("user_id",user.id).maybeSingle()
 ]);
 const rank=(officer as any)?.ranks?.name;
 if(!["super_admin","commander"].includes(role?.role||"")&&!["Fondator","Fondatoare","Co-Fondator","Manager Staff"].includes(rank||""))
  return NextResponse.json({error:"Nu ai permisiunea necesară."},{status:403});
 const body=await req.json().catch(()=>({}));const id=String(body.officerId||"");const p=body.profile||{};
 if(!id)return NextResponse.json({error:"Membru invalid."},{status:400});
 const update:any={full_name:String(p.full_name||"").trim(),avatar_url:p.avatar_url||null,discord_name:p.discord_name||null,discord_id:p.discord_id||null,game_id:p.game_id||null,age:p.age?Number(p.age):null,gender:p.gender||null};
 if(p.rank_name){const {data:r}=await admin.from("ranks").select("id").eq("name",p.rank_name).maybeSingle();if(!r)return NextResponse.json({error:"Gradul selectat nu există în tabela ranks. Adaugă gradele în Supabase înainte."},{status:400});update.rank_id=r.id;}
 if(!update.full_name)return NextResponse.json({error:"Numele nu poate fi gol."},{status:400});
 const {error}=await admin.from("officers").update(update).eq("id",id);
 if(error)return NextResponse.json({error:error.message},{status:400});
 return NextResponse.json({ok:true});
}
