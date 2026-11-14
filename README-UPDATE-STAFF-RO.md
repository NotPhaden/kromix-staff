# Actualizare KROMIX Staff Panel

## Modificări incluse
- Gradul membrilor poate fi schimbat direct din profilul membrului, de către conducere.
- Pagina „Warn-uri / Jail” a fost redenumită „Jaill”; formularul cere ID JUCĂTOR, DURATĂ JAILL, MOTIV și DOVADĂ.
- CK/Wipe folosește selectarea unui membru staff existent (UUID valid), nu un text introdus manual.
- Cererile de inactivitate/concediu acceptă doar tipurile Concediu și Inactivitate și verifică intervalul datelor înainte de salvare.
- Au fost adăugate paginile „Regulament intern” și „Lista sancțiuni”. Toți membrii staff le pot vedea; editarea este permisă Fondatorului, Co-Fondatorului și Manager Staff.

## Migrare Supabase obligatorie
Rulează fișierul `supabase/kromix-fixes-documents-migration.sql` în Supabase → SQL Editor → New query → Run.
Migrarea adaugă `player_id` și `jail_duration` în `staff_disciplinary_records` și creează tabelul `staff_documents` cu politici RLS pentru citire și editare.

După migrare, reîncarcă pagina. Dacă schema cache încă raportează coloane lipsă, așteaptă câteva secunde și reîncarcă din nou.

## Observație
Modificările din cod nu pot modifica automat proiectul Supabase găzduit. Migrarea SQL trebuie aplicată în baza de date conectată la aplicație.
