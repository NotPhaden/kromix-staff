# KROMIX STAFF PANEL — actualizare

## Ce s-a modificat
- Identitate vizuală apropiată de referință: fundal navy, accente violet/neon, carduri și logo KROMIX.
- Logo-ul extras din imagine este folosit ca marcă în sidebar și favicon; crop-ul coroanei este folosit ca decor pentru zona de întâmpinare.
- Pagina Blacklist și pagina Sancțiuni sunt vizibile doar conducerii (Fondator, Co-Fondator, Manager Staff / rolurile administrative echivalente).
- Warn-uri / Jail permite personalului să înregistreze Jail-uri date în joc: ID jucător, motiv și link către filmare.
- Reclamații Staff: fiecare membru poate depune reclamație pentru un ID, poate adăuga motiv și dovadă și poate urmări statusul. Conducerea poate prelua reclamația; reclamantul și conducerea pot discuta în chat-ul reclamației. Se salvează numele/gradul celui care a preluat.
- Cererile de concediu/inactivitate pot fi aprobate sau respinse de conducere.
- Evidența de tickete per membru și dată este afișată în profil; conducerea poate adăuga/actualiza numărul pentru fiecare dată.
- Manager Staff poate face UP/DOWN, dar nu poate promova un membru peste propriul grad și nu poate modifica grade egale/superioare.
- Profilul are suport pentru poză și banner. A fost adăugat bucket-ul Storage și permisiunile necesare în migrare.
- Profilul este accesibil din meniul utilizatorului din bara de sus; nu există intrare separată în sidebar.

## Migrare Supabase obligatorie
Nu am acces direct la proiectul tău Supabase, deci migrarea nu a fost aplicată bazei live. Rulează, în această ordine, în Supabase → SQL Editor:

1. `supabase/kromix-panel-update.sql`

Aceasta adaugă:
- bucket-ul `staff-avatars` și politicile de upload/citire;
- coloana `officers.banner_url` și permisiunea de actualizare;
- tabelul `staff_ticket_stats`;
- coloana `staff_complaints.reviewer_rank`;
- tabelul `staff_complaint_messages` și politicile pentru chat-ul privat al reclamației;
- politica prin care fiecare membru staff poate înregistra propriile evidențe Jail.

Păstrează politicile RLS existente și verifică după migrare că rolurile staff sunt recunoscute de funcțiile `is_kromix_staff()` și `is_kromix_staff_manager()`.

## Pornire locală
1. Copiază `.env.example` în `.env.local` și completează cheile Supabase.
2. Rulează `npm ci`.
3. Rulează `npm run dev`.

## Notă despre verificare
Am verificat sintaxa fișierelor modificate, însă instalarea dependențelor din mediul de lucru a expirat, deci nu am putut executa un build Next.js complet. Migrarea SQL trebuie aplicată înainte ca noile secțiuni să poată salva date.
