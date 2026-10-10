# La Scuderia – Create your drink

Site unde clientul își compune băutura pas cu pas, vede prețul și trimite comanda la bar.

| Pagină | Pentru cine | Ce face |
|---|---|---|
| `/` | clienți | Două butoane: **Create your drink** și **Our menu** (link la smart-menu) |
| `/create` | clienți | Wizard-ul pe pași, cu prețul live. `?masa=5` completează masa (pentru QR), `?kiosk=1` activează modul tabletă (revine la început după inactivitate) |
| `/bar` | barmani | Dashboard live cu comenzile de azi, sunet la comandă nouă, statusuri (Noi → În preparare → Gata → Trecut în POS) |
| `/admin` | Alexandra | Tipuri de băutură, pași, ingrediente, prețuri, stoc, istoric comenzi |

Stack: **Next.js** (React) + **Supabase** (Postgres, Auth, Realtime), găzduit pe **Netlify**.

Prețul final se calculează **în baza de date** (funcția `create_order`), nu în browser, așa că nu poate fi modificat de client.

## Setup (o singură dată)

1. **Supabase**: în proiect deschizi **SQL Editor** și rulezi, în ordine:
   1. `supabase/migrations/0001_init.sql` (tabelele, regulile de securitate și funcția de comandă)
   2. `supabase/seed.sql` (opțional: date de exemplu, pe care Alexandra le modifică după)
2. **Conturi pentru staff**:
   - Mergi la Supabase → **Authentication → Users → Add user** și creezi userul cu email și parolă, bifând „Auto confirm”.
   - Copiezi UID-ul userului și rulezi în SQL Editor:
     ```sql
     insert into staff (user_id, role) values ('<UID-ul Alexandrei>', 'admin');
     insert into staff (user_id, role) values ('<UID-ul contului de bar>', 'bar');
     ```
   - `admin` are acces și la `/bar`. `bar` are acces doar la `/bar`.
   - Recomandare: dezactivează înscrierile publice din Authentication → Sign In / Providers → „Allow new users to sign up” = off.
3. **Variabile de mediu**: copiezi `.env.example` în `.env.local` și pui URL-ul și cheia `anon`/`publishable` din Supabase → Project Settings → API. Pe Netlify pui aceleași două variabile la Site configuration → Environment variables.

## Dezvoltare locală

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run build
```

## QR-uri pe mese

Câte un QR pentru fiecare masă, cu link de forma `https://<domeniu>/create?masa=5`. Pentru tableta de la bar se folosește `https://<domeniu>/create?kiosk=1`.

## Branding

Culorile sunt definite în `src/app/globals.css` (`:root`). Fonturile se setează în `src/app/layout.tsx`. Când primim logo-ul, îl punem în `public/` și îl afișăm în `src/components/Home.tsx`.
