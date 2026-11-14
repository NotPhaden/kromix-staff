# KROMIX STAFF PANEL — remediere autentificare

## Ce s-a reparat
- Pagina `/staff` afișează acum Autentificare și Înregistrare.
- Înregistrarea folosește nume RP, prenume RP, ID personaj FiveM, telefon fictiv RP și parolă.
- ID-ul FiveM este transformat într-un email intern determinist (`rp-<sha256>@accounts.Kromix-rp.invalid`), compatibil cu mecanismul existent din `Dashboard.tsx`.
- Contul este creat pe server cu `email_confirm: true`; utilizatorul nu trebuie să primească sau să confirme un email și nu se trimite SMS.
- Autentificarea acceptă ID-ul FiveM și parola și încearcă atât formatul vechi, cât și formatul SHA-256.
- Rolurile nu sunt promovate automat. Gradele și accesul continuă să fie gestionate prin `officers`, `ranks` și `user_roles`.

## Configurare obligatorie
1. Păstrează fișierul `.env` existent al proiectului tău; acesta nu este inclus în arhiva reparată pentru a nu expune cheile secrete.
2. Verifică să existe:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` sau `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` sau `SUPABASE_SECRET_KEY`
3. Cheia service/secret trebuie să rămână exclusiv pe server. Nu o pune niciodată într-o variabilă `NEXT_PUBLIC_` și nu o publica.
4. Instalează dependențele și pornește proiectul:
   ```bash
   npm install
   npm run dev
   ```

## Asocierea cu evidența de personal
Crearea contului Auth nu atribuie automat un grad și nu creează un ofițer fictiv. După înregistrare, conducerea trebuie să asocieze contul cu înregistrarea corectă din `public.officers` prin `user_id`, apoi să atribuie gradul/departamentul conform procedurii existente. Nu acorda roluri administrative conturilor noi.

## Fișiere modificate/adăugate
- `components/StaffPanel.tsx`
- `app/globals.css`
- `app/api/auth/register-rp/route.ts` (nou)

Arhiva nu include `.env`, `.next` sau `node_modules`.


## Remediere eroare „This endpoint requires a valid Bearer token”

Ruta de înregistrare folosește `supabase.auth.admin.createUser()`. Endpoint-ul Supabase Auth Admin verifică un JWT cu rol administrativ; cheia nouă `sb_secret_*` nu este un JWT Bearer. Pentru această rută trebuie configurată cheia legacy `service_role` (de regulă începe cu `eyJ`).

1. În Supabase deschide **Settings → API Keys → Legacy API keys**.
2. Copiază cheia **service_role** (nu `anon`, nu `sb_publishable_*`, nu `sb_secret_*`).
3. În hosting (ex. Vercel → Project → Settings → Environment Variables) setează `SUPABASE_SERVICE_ROLE_KEY` cu valoarea copiată.
4. Șterge sau ignoră `SUPABASE_SECRET_KEY` pentru această rută; codul nu o mai folosește.
5. Redeploy/repornește aplicația. Nu pune cheia în `NEXT_PUBLIC_*` și nu o trimite în browser.

Cheia service_role oferă acces administrativ complet și trebuie păstrată exclusiv pe server.
