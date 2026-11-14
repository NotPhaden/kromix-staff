import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Supabase Auth Admin endpoints require a JWT carrying the service_role claim.
  // The newer sb_secret_* API key is not a JWT Bearer token for this Auth endpoint.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json({
      error: "Lipsește SUPABASE_SERVICE_ROLE_KEY. Adaugă cheia legacy service_role (JWT care începe de regulă cu eyJ) în variabilele serverului și repornește aplicația. Nu folosi sb_secret_* aici."
    }, { status: 500 });
  }
  if (!serviceRoleKey.startsWith("eyJ")) {
    return NextResponse.json({
      error: "SUPABASE_SERVICE_ROLE_KEY nu pare să fie cheia JWT service_role. Copiază cheia service_role din Supabase → Settings → API Keys (Legacy API keys). Nu folosi cheia sb_secret_* sau sb_publishable_* pentru acest endpoint Auth."
    }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const characterId = String(body?.character_id || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const firstName = String(body?.rp_first_name || "").trim();
  const lastName = String(body?.rp_last_name || "").trim();
  const phone = String(body?.rp_phone || "").trim();

  if (!/^[a-z0-9._-]{3,40}$/.test(characterId)) {
    return NextResponse.json({ error: "ID invalid. Folosește 3–40 caractere: litere, cifre, punct, _ sau -." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: "Parola trebuie să aibă între 8 și 72 de caractere." }, { status: 400 });
  }
  if (!firstName || !lastName || !phone) {
    return NextResponse.json({ error: "Completează numele, prenumele și telefonul RP." }, { status: 400 });
  }

  const digest = createHash("sha256").update(characterId, "utf8").digest("hex");
  const email = `rp-${digest}@accounts.Kromix-rp.invalid`;
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      character_id: characterId,
      rp_first_name: firstName,
      rp_last_name: lastName,
      rp_phone: phone
    }
  });

  if (error) {
    const message = /already|registered|exists/i.test(error.message)
      ? "Acest ID FiveM este deja înregistrat."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, user_id: data.user.id }, { status: 201 });
}
