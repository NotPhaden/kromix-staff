# KROMIX STAFF PANEL – remediere autentificare și înregistrare

## Modificări
- Reparată autentificarea cu ID FiveM: încearcă formatul vechi de cont, apoi formatul nou cu email intern SHA-256.
- Adăugată funcția `authEmailForCharacterId` în `StaffPanel.tsx`, astfel încât să nu mai apară `ReferenceError: authEmailForCharacterId is not defined`.
- Adăugat formular de înregistrare direct în `/staff`.
- Formularul cere Nume, Prenume, ID personaj FiveM, Parolă și Confirmă parola.
- Eliminat câmpul de telefon.
- ID-ul FiveM nu are o limită minimă numerică sau de lungime; trebuie doar completat.
- Numele și prenumele sunt salvate în metadata Auth ca `first_name`, `last_name`, `rp_first_name`, `rp_last_name` și `full_name`.
- Sincronizat formularul din `Dashboard.tsx` cu aceleași câmpuri, fără telefon.

## Instalare
1. Fă backup proiectului actual.
2. Dezarhivează arhiva și înlocuiește fișierele proiectului cu cele incluse.
3. Păstrează propriul fișier `.env` în rădăcina proiectului. Nu este inclus în arhivă.
4. Rulează `npm install` dacă este necesar.
5. Rulează `npm run build`, apoi redeploy/restart.

## Important
- Păstrează cheile Supabase doar în variabilele de mediu corespunzătoare. Nu adăuga `service_role` sau `sb_secret` în variabile `NEXT_PUBLIC_*`.
- Înregistrarea folosește un email intern fictiv derivat determinist din ID-ul FiveM; utilizatorul nu introduce email și nu primește SMS.
- Conturile deja create în formatul vechi sunt acceptate de login prin fallback.
- Nu există o validare de lungime minimă pentru ID-ul FiveM. ID-ul trebuie să fie unic în Supabase Auth.
- Dacă Supabase Auth are activată confirmarea emailului, dezactiveaz-o pentru acest flux cu email intern fictiv, altfel utilizatorul nu poate confirma adresa internă.
- Conturile noi nu primesc automat grad sau permisiuni privilegiate.

## Verificare
`npx tsc --noEmit` a trecut cu succes în mediul de lucru. Build-ul Next.js nu a putut fi finalizat aici deoarece mediul nu a putut descărca binarul SWC necesar (conexiune externă indisponibilă).
