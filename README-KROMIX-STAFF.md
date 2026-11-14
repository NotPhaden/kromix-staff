# KROMIX STAFF PANEL

Interfața Staff Panel este pagina principală a proiectului (`/` redirecționează către `/staff`). Proiectul original Next.js și clientul Supabase au fost păstrate; modulele vechi rămân în `components/` pentru referință.

## Funcționalități incluse

- Dashboard cu membri, sancțiuni active, personal în serviciu și mesaje.
- Director de membri cu căutare, grad, ultimul UP/DOWN și numărul sancțiunilor.
- Profil propriu și profiluri publice interne: avatar, nume Discord, Discord ID, ID joc, vârstă, gen, grad, activitate și sancțiuni.
- Editarea profilului propriu; editarea completă a profilului altui membru pentru Fondator, Fondatoare, Co-Fondator, Manager Staff și rolurile `super_admin` / `commander`.
- Chat staff cu actualizare Supabase Realtime și avatar + grad.
- Registru de sancțiuni Warn / Down / Strike / etc., motiv și link opțional pentru dovadă; managerii pot edita sau dezactiva sancțiuni.
- Pontaj UP/DOWN folosind tabela `attendance`.
- Raport zilnic cu UP, DOWN, sancțiuni și tickete create/asignate în data selectată.
- Instrumente manageriale: mute/unmute chat, ban/unban pe site și ștergerea contului Auth prin API server-side.

## Instalare

1. Instalează dependențele: `npm ci`.
2. Creează `.env.local` în rădăcina proiectului:
   - `NEXT_PUBLIC_SUPABASE_URL=...`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
   - `SUPABASE_SERVICE_ROLE_KEY=...` (doar server-side; nu folosi prefixul `NEXT_PUBLIC_`).
3. În Supabase SQL Editor rulează mai întâi schema existentă dacă baza este goală (`supabase/schema.sql`), apoi `supabase/kromix_staff_panel_migration.sql`.
4. Asigură-te că tabela `ranks` conține gradele folosite de echipă, cu numele scrise exact ca în interfață. Pentru acces managerial, numele gradului trebuie să fie `Fondator`, `Fondatoare`, `Co-Fondator` sau `Manager Staff`; alternativ, rolul Supabase poate fi `super_admin` sau `commander`.
5. Configurează Supabase Auth pentru conturile staff și asociază fiecare cont cu un rând `officers.user_id`.
6. Pornește proiectul: `npm run dev`.

## Note importante

- Cheia `SUPABASE_SERVICE_ROLE_KEY` este folosită exclusiv de rutele server-side pentru editarea administrativă și ștergerea conturilor Auth. Nu o introduce în codul browserului și nu o publica.
- Pentru avataruri, migrarea creează bucket-ul `staff-avatars`, cu citire publică și upload în folderul UUID-ului utilizatorului.
- Tabela `staff_tickets` este adăugată de migrare. Sistemul de ticketing existent trebuie să scrie în această tabelă sau să sincronizeze câmpurile `created_by`, `assigned_to`, `created_at`; altfel raportul va afișa zero tickete.
- RLS trebuie verificat pe proiectul Supabase înainte de lansare. Rulează migrarea mai întâi pe o bază de test și verifică permisiunile pentru fiecare grad.
- Dacă variabilele Supabase nu sunt configurate, interfața afișează date demo pentru previzualizarea designului; autentificarea și operațiile reale necesită Supabase configurat.
- Verificarea TypeScript/build nu a putut fi confirmată în acest mediu deoarece pachetele npm nu sunt instalate local. Rulează `npm ci` și `npm run build` înainte de deploy.
