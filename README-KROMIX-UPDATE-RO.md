# KROMIX STAFF PANEL — actualizare

## Ce este nou
- Interfață dark cu accente violet/neon, panouri și badge-uri luminoase.
- Pagini noi: Evidență CK-Wipe, Inactivitate / Concedii, Warn-uri / Jail, Reclamații Staff și Blacklist.
- Reacție unică per utilizator la fiecare reclamație (De acord / Nu sunt de acord). Baza de date respinge voturile duplicate.
- Concedii cu aprobare/respingere de către conducere.
- Blacklist și evidența CK/Wipe limitate la conducere.
- Chei Supabase moderne: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` și `SUPABASE_SECRET_KEY`; sunt acceptate și variabilele legacy.

## Instalare bază de date nouă
Într-un proiect Supabase complet gol:
1. Deschide SQL Editor → New query.
2. Rulează `supabase/KROMIX_FRESH_DATABASE_COMPLETE.sql` o singură dată.
3. Creează utilizatorul în Authentication → Users.
4. Creează profilul staff asociat utilizatorului în `public.officers`, apoi setează gradul în `public.ranks`.
5. Pentru contul inițial de Fondator, după ce ai creat profilul, acordă și rolul `super_admin` în `public.user_roles` doar dacă acel cont trebuie să administreze întreaga platformă.

Nu rula scriptul complet peste o bază de date care are deja tabele/date. Pentru o bază existentă, folosește doar migrarea de extensii potrivită după verificarea schemei.

## Variabile de mediu
Copiază `.env.example` în `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` — doar server-side, necesar pentru endpoint-ul de ștergere cont.

Nu pune niciodată cheia secretă într-o variabilă `NEXT_PUBLIC_`, în codul client, în GitHub sau într-un mesaj public.

## Pornire
```bash
npm install
npm run dev
```

## Observații
- Tabelul de vot are `UNIQUE(complaint_id,user_id)` și nu are politici UPDATE/DELETE: un utilizator votează o singură dată per reclamație.
- Cheia secretă Supabase ocolește RLS. Endpoint-ul de ștergere verifică sesiunea și dreptul managerului înainte de a apela Admin API.
- Chatul, avatarurile și datele reale necesită configurarea Supabase și înregistrarea conturilor/profilurilor staff.
