export type TosSection = { title: string; paragraphs: string[] };

const core: TosSection[] = [
  {
    title: "Článok 1 — Úvodné ustanovenia",
    paragraphs: [
      "Podpísaním svojím plným menom pri prvom vstupe na web návštevník schvaľuje a prijíma tieto Podmienky používania (ďalej len „ToS“).",
      "Návštevník vyhlasuje, že nie je plnoletý a že web navštevuje výlučne ako študent, ktorý sa zúčastňuje vyučovania na danej škole.",
      "Návštevník vyhlasuje, že všetky ním napísané recenzie sú reálne, nie sú vymyslené ani klamlivé.",
    ],
  },
  {
    title: "Článok 2 — Porušenie ToS",
    paragraphs: [
      "Ak na web vstúpi plnoletá osoba, alebo ak neplnoletý študent ukáže web učiteľovi, učiteľke či rodičom, porušuje tieto ToS.",
      "Podpísaním platia tieto ToS pre každú osobu, aj plnoletú, ktorá web uvidí.",
    ],
  },
  {
    title: "Článok 3 — Ochrana majiteľa (ANONYM)",
    paragraphs: [
      "Ak sa osoba, ktorá web uvidí, pokúsi majiteľa (ANONYM) potrestať v prípade, že sa zúčastňuje danej školy, má zakázané:",
      "a) dať mu zápis; b) dať mu akýkoľvek stupeň poznámky; c) dať mu akýkoľvek stupeň zápisu; d) udeliť akékoľvek napomenutie triedneho učiteľa či riaditeľa; e) udeliť akékoľvek pokarhanie triedneho učiteľa či riaditeľa.",
      "Je zakázané volať rodičom majiteľa alebo akokoľvek kontaktovať jeho či jeho rodinu.",
      "Je zakázané volať si majiteľa k učiteľom, riaditeľovi či triednemu učiteľovi, ktorých sa web týka.",
    ],
  },
  {
    title: "Článok 4 — Sankcie",
    paragraphs: [
      "Pri každom porušení platí ten, kto ho porušil, a škola zmluvnú pokutu 1000 eur.",
      "Majiteľ si vyhradzuje právo vec riešiť aj právnou cestou.",
    ],
  },
];

const topics = [
  "recenzií", "hodnotení", "podpisov", "zobrazovania obsahu", "lajkov", "tried a predmetov",
  "anonymity", "zhliadnutí", "moderovania", "prístupu na web", "zdieľania obrazovky", "snímok obrazovky",
];
const subjects = [
  "Návštevník", "Podpisujúca osoba", "Každá osoba, ktorá web uvidí", "Študent", "Akákoľvek tretia strana",
  "Pedagogický zamestnanec", "Zákonný zástupca",
];
const verbs = [
  "berie na vedomie, že ustanovenia o", "súhlasí s tým, že pravidlá týkajúce sa", "sa zaväzuje dodržiavať zásady",
  "nesmie obchádzať pravidlá", "potvrdzuje, že rozumie podmienkam", "prijíma všetky dôsledky porušenia pravidiel",
];
const tails = [
  "platia bez časového obmedzenia a vzťahujú sa aj na všetky budúce verzie webu.",
  "sa vykladajú v prospech majiteľa (ANONYM) v plnom rozsahu, v akom to dovoľujú tieto ToS.",
  "zostávajú v platnosti aj v prípade, že by niektoré iné ustanovenie bolo neplatné.",
  "sa uplatnia primerane aj na každý pokus o ich obídenie, priamy alebo nepriamy.",
  "nie je možné jednostranne zrušiť, odvolať ani zmeniť bez súhlasu majiteľa.",
  "sú neoddeliteľnou súčasťou súhlasu udeleného podpisom pri prvej návšteve.",
];

/** Dlhé ToS: hlavné články + stovky odvodených podčlánkov. */
export function buildTos(): TosSection[] {
  const extra: TosSection[] = [];
  let n = 5;
  for (let i = 0; i < topics.length; i++) {
    for (let part = 0; part < 12; part++) {
      const paragraphs: string[] = [];
      for (let k = 0; k < 6; k++) {
        const s = subjects[(i + part + k) % subjects.length];
        const v = verbs[(i * 3 + part + k) % verbs.length];
        const t = tails[(i + part * 2 + k) % tails.length];
        paragraphs.push(`§ ${n}.${k + 1} ${s} ${v} ${topics[i]} ${t}`);
      }
      extra.push({ title: `Článok ${n} — Podrobné ustanovenia o ${topics[i]}, časť ${part + 1}`, paragraphs });
      n++;
    }
  }
  return [...core, ...extra, {
    title: `Článok ${n} — Záverečné ustanovenia`,
    paragraphs: ["Podpisom pri prvej návšteve návštevník tieto ToS potvrdzuje a súhlasí so všetkými podmienkami uvedenými vyššie."],
  }];
}
