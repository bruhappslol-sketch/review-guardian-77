import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookMarked, Eye, Heart, Layers3, PenLine, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { getHomeData } from "@/lib/teachers.functions";

const homeQuery = queryOptions({ queryKey: ["home"], queryFn: () => getHomeData() });

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  head: () => ({
    meta: [
      { title: "Hodnotenie učiteľov | Školská nástenka" },
      { name: "description", content: "Pozri si úprimné hodnotenia učiteľov a pridaj vlastnú recenziu od 0 do 10." },
      { property: "og:title", content: "Hodnotenie učiteľov | Školská nástenka" },
      { property: "og:description", content: "Úprimné hodnotenia učiteľov od študentov na jednom mieste." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data } = useSuspenseQuery(homeQuery);
  const [groupId, setGroupId] = useState<string | null>(null);
  const selected = data.groups.find((group) => group.id === groupId);
  const teachers = groupId ? data.teachers.filter((teacher) => teacher.groupIds.includes(groupId)) : data.teachers;
  const classes = data.groups.filter((group) => group.kind === "trieda");
  const subjects = data.groups.filter((group) => group.kind === "predmet");

  return (
    <div className="min-h-screen bg-background paper-dots">
      <SiteHeader />
      <main>
        <section className="border-b border-border bg-card/70">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <p className="mb-3 text-sm font-bold uppercase text-primary">Školská nástenka</p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-foreground sm:text-6xl">
              Keď učitelia hodnotia teba, hodnoť úprimne aj ty.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Prečítaj si skúsenosti spolužiakov alebo pridaj vlastnú. Každú recenziu pred zverejnením skontrolujeme.
            </p>
            <Button asChild size="lg" className="mt-7">
              <Link to="/recenzia"><PenLine /> Napíš recenziu</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><p className="text-sm font-bold text-secondary">Nájdi svojich učiteľov</p><h2 className="mt-1 text-3xl font-semibold">Triedy a predmety</h2></div>
            {groupId && <Button variant="ghost" onClick={() => setGroupId(null)}>Zobraziť všetkých</Button>}
          </div>
          {data.groups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-6 text-muted-foreground">Triedy a predmety zatiaľ neboli pridané.</div>
          ) : (
            <div className="space-y-5">
              {[{ title: "Triedy", icon: Users, items: classes }, { title: "Predmety", icon: BookMarked, items: subjects }].map(({ title, icon: Icon, items }) => items.length > 0 && (
                <div key={title}>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-muted-foreground"><Icon className="size-4" />{title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {items.map((group) => (
                      <Button key={group.id} variant={groupId === group.id ? "secondary" : "outline"} onClick={() => setGroupId(group.id)}>
                        {group.name}<span className="text-xs opacity-70">{group.teacherCount}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-border bg-muted/45">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="mb-7"><p className="text-sm font-bold text-primary">{selected ? `${selected.kind === "trieda" ? "Trieda" : "Predmet"} · ${selected.name}` : "Prehľad"}</p><h2 className="mt-1 text-3xl font-semibold">{selected ? `Učitelia — ${selected.name}` : "Všetci učitelia"}</h2></div>
            {teachers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-muted-foreground">V tejto skupine zatiaľ nie sú žiadni učitelia.</div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {teachers.map((teacher) => (
                  <article key={teacher.id} className="cozy-card flex min-h-72 flex-col p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div><h3 className="text-2xl font-semibold">{teacher.name}</h3><p className="mt-1 text-sm text-muted-foreground">{teacher.subject || "Učiteľ / učiteľka"}</p></div>
                      <div className="shrink-0 rounded-lg bg-accent px-3 py-2 text-center"><strong className="block font-display text-2xl">{teacher.avgRating ?? "—"}</strong><span className="text-xs">z 10</span></div>
                    </div>
                    <div className="my-5 cozy-stitch" />
                    {teacher.featured ? <blockquote className="flex-1 text-sm leading-6 text-foreground">„{teacher.featured.body}“<footer className="mt-2 flex items-center gap-3 text-xs text-muted-foreground"><span>{teacher.featured.public_classroom || "Anonymne"}</span><span className="flex items-center gap-1"><Heart className="size-3" /> {teacher.featured.likes}</span></footer></blockquote> : <p className="flex-1 text-sm leading-6 text-muted-foreground">Zatiaľ bez recenzií. Môžeš byť prvý.</p>}
                    <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                      <span className="flex items-center gap-3 text-xs text-muted-foreground"><span>{teacher.reviewCount} recenzií</span><span className="flex items-center gap-1"><Eye className="size-3" />{teacher.views}</span></span>
                      <Link to="/ucitel/$id" params={{ id: teacher.id }} className="flex items-center gap-1 text-sm font-bold text-primary">Detail <ArrowRight className="size-4" /></Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <footer className="border-t border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground"><Layers3 className="mx-auto mb-2 size-5" />Školská nástenka pre férovú spätnú väzbu.</footer>
    </div>
  );
}