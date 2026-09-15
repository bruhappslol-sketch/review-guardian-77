# Školská nástenka — web na hodnotenie učiteľov

Koordinátový prehľad: útulný web v slovenčine, kde študenti hodnotia učiteľov známkou 0–10, recenzie sa moderujú v skrytom paneli `/admin`, a triedy aj predmety (obojie vytvára admin) sú na vrchu domovskej stránky.

## Požiadavky od používateľa

- Celý web aj admin panel výhradne po **slovensky**.
- Dizajn: **útulný (cozy)**, nie príliš moderný — teplé krémové tóny, mäkké zaoblenia, serif písmo, žiadny tech/moderný glassmorphism.
- Domovská stránka: **na vrchu triedy a predmety** (napr. 7.B, Matematika, Angličtina — admin vytvára oba typy a priraďuje učiteľov; učiteľ môže byť vo viacerých skupinách). Klik na triedu/predmet zobrazí jeho učiteľov. Pod tým **všetci učitelia** s celkovým hodnotením a jedným zvýrazneným výrokom.
- Zvýraznená recenzia pod učiteľom: **najviac videná, potom najviac lajknutá**, ak žiadne pravidlo nesedí → náhodná schválená.
- Klik na učiteľa → detail so všetkými recenziami + tlačidlo **Recenzovať**.
- Recenzovať sa dá aj bez kliknutia na učiteľa — formulár má výber učiteľa, ktorý sa dá kedykoľvek zmeniť.
- Recenzia: hodnotenie **0–10**, text, **trieda žiaka (povinná vždy)**, prepínač **anonymita (štandardne zapnutá)**:
  - Zapnutá: varovanie „Recenzia je anonymizovaná — nikto nevie, kto ste."
  - Vypnutá: trieda žiaka sa zobrazí verejne pri recenzii (meno nie).
  - Anonymizovanú triedu vidí **len admin** v moderácii.
- Admin panel `/admin`: prihlásenie e-mailom a heslom, **pridávanie učiteľov**, **vytváranie tried/predmetov a priradenie učiteľov**, **schválenie / odmietnutie / úprava recenzií** (text aj hodnotenie).

## Dizajnový systém (útulný, slovenský)

- Farby (oklch tokeny v `src/styles.css`): krémové pozadie, teplý papier, **terakotová primárna**, mechovo-zelená doplnková, hnedý text, jemné „stitch" okraje.
- Písma: Fraunces (nadpisy, serif) + Karla (text) cez `<link>` v `__root.tsx`.
- Zaoblené karty s mäkkým tieňom, hodnotenie 0–10 ako veľké číslo, žiadne hviezdičky, žiadne fialové gradienty.

## Databáza (Lovable Cloud, jediná migrácia)

- `teachers`: meno, predmet (popis), počet zhliadnutí, created_at.
- `groups`: názov, typ (`trieda` | `predmet`), created_at.
- `teacher_groups`: viazba učiteľ–skupina (učiteľ môže byť vo viacerých).
- `reviews`: teacher_id, rating 0–10, text, classroom (trieda žiaka — vždy uložená), `public_classroom` (vyplnené len ak nie je anonymizovaná, inak NULL), anonymous bool, status (`pending` | `approved` | `declined`), views, likes, created_at.
- `review_likes`: recenzia + ID návštevníka (jedna lajkovosť na zariadenie).
- RLS + GRANT: verejné SELECT len schválené recenzie / učitelia / skupiny (slúpec classroom sa verejne nikdy neposkytuje — len `public_classroom`), INSERT recenzií ako `pending` (trigger vynúti status), lajky pre všetkých; admin operácie cez `has_role` (samostatná tabuľka `user_roles`, security-definer funkcia).
- SQL funkcie `record_review_views` a `like_review` (security definer) pre anon návštevníkov.
- Email auth zapnúť (`enable_email_auth`), vytvoriť admin účet **info@picore.eu** s počiatočným heslom a priradiť rolu `admin`.

## Stránky (route arch)

- `/` — triedy + predmety na vrchu, sekcia „Všetci učitelia", CTA na recenziu.
- `/ucitel/$id` — detail učiteľa, zoznam schválených recenzií, počítadlo zhliadnutí, tlačidlo Recenzovať.
- `/recenzia` — formulár: výber učiteľa (meniteľný), 0–10, text, trieda žiaka (povinná), prepínač anonymity s varovaniami, po odoslaní hlásenie „Čaká na schválenie".
- `/admin` — prihlásenie; po prihlásení: moderácia (schváliť/odmietnúť/upraviť text aj hodnotenie), pridanie učiteľa, vytváranie tried/predmetov a priradzovanie učiteľov. Čokoľvek citlivé beží v server funkciách s kontrolou `has_role`.

## Průbeh práce

1. Migrácia (schéma + RLS + funkcie + admin účet a rola).
2. Dizajnový systém v `src/styles.css` + fonty.
3. Server funkcie: verejné čítanie (učitelia, skupiny, recenzie), nahrávanie recenzií, lajky, zhliadnutia; admin funkcie s `has_role`.
4. Stránky `/`, `/ucitel/$id`, `/recenzia`, `/admin` — všetko po slovensky.
5. Overenie cez Playwright (domovská stránka, detail, formulár, admin login) + konzola/build.
