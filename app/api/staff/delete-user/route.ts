import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const service=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!service)return NextResponse.json({error:"Lipsește configurarea serverului Supabase."},{status:500});
 const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
 if(!token)return NextResponse.json({error:"Autentificare necesară."},{status:401});
 const authClient=createClient(url,anon,{auth:{persistSession:false}});
 const {data:{user},error:authError}=await authClient.auth.getUser(token);
 if(authError||!user)return NextResponse.json({error:"Sesiune invalidă."},{status:401});
 const admin=createClient(url,service,{auth:{persistSession:false}});
 const [{data:role},{data:officer}]=await Promise.all([
  admin.from("user_roles").select("role").eq("user_id",user.id).maybeSingle(),
  admin.from("officers").select("id,ranks(name)").eq("user_id",user.id).maybeSingle()
 ]);
 const rank=(officer as any)?.ranks?.name;
 if(!["super_admin","commander"].includes(role?.role||"")&&!["Fondatoare","Co-Fondator","Manager Staff"].includes(rank||""))
  return NextResponse.json({error:"Nu ai permisiunea necesară."},{status:403});
 const body=await req.json().catch(()=>({}));
 const target=String(body.userId||"");
 if(!target||target===user.id)return NextResponse.json({error:"Cont țintă invalid."},{status:400});
 const {error}=await admin.auth.admin.deleteUser(target);
 if(error)return NextResponse.json({error:error.message},{status:400});
 return NextResponse.json({ok:true});
}
