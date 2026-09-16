import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { CheckCircle2, ChevronLeft, LockKeyhole, Send, Users } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/site-header";
import { getHomeData, submitReview } from "@/lib/teachers.functions";

const teachersQuery = queryOptions({ queryKey: ["home"], queryFn: () => getHomeData() });

export const Route = createFileRoute("/recenzia")({
  validateSearch: (search: Record<string, unknown>) => ({ teacher: typeof search["teacher"] === "string" ? search["teacher"] : "" }),
  loader: ({ context }) => context.queryClient.ensureQueryData(teachersQuery),
  head: () => ({ meta: [
    { title: "Napíš recenziu učiteľa | Školská nástenka" },
    { name: "description", content: "Ohodnoť učiteľa známkou od 0 do 10 a zdieľaj svoju skúsenosť." },
    { property: "og:title", content: "Napíš recenziu učiteľa" },
    { property: "og:description", content: "Férová a bezpečná spätná väzba pre učiteľov." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: ReviewPage,
});

function ReviewPage() {
  const { data } = useSuspenseQuery(teachersQuery);
  const search = useSearch({ from: "/recenzia" });
  const queryClient = useQueryClient();
  const [teacherId, setTeacherId] = useState(search.teacher);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [classroom, setClassroom] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!teacherId) { setError("Vyber učiteľa."); return; }
    setStatus("sending");
    try {
      await submitReview({ data: { teacherId, rating, body, classroom, anonymous } });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
      setStatus("done");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Recenziu sa nepodarilo odoslať."); setStatus("idle");
    }
  }

  return <div className="min-h-screen bg-background paper-dots"><SiteHeader /><main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
    <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm font-bold text-primary"><ChevronLeft className="size-4" />Späť na učiteľov</Link>
    {status === "done" ? <section className="cozy-card p-7 text-center sm:p-10"><CheckCircle2 className="mx-auto size-12 text-secondary" /><h1 className="mt-4 text-3xl font-semibold">Ďakujeme za úprimnosť</h1><p className="mt-3 text-muted-foreground">Tvoja recenzia čaká na schválenie. Po kontrole sa zobrazí pri učiteľovi.</p><Button asChild className="mt-6"><Link to="/">Späť na nástenku</Link></Button></section> :
    <section><p className="text-sm font-bold text-primary">Tvoj názor sa počíta</p><h1 className="mt-1 text-4xl font-semibold">Napíš recenziu</h1><p className="mt-3 text-muted-foreground">Buď vecný, slušný a úprimný. Recenziu pred zverejnením skontrolujeme.</p>
      <form onSubmit={handleSubmit} className="cozy-card mt-7 space-y-6 p-5 sm:p-7">
        <div className="space-y-2"><Label htmlFor="teacher">Učiteľ</Label><Select value={teacherId} onValueChange={setTeacherId}><SelectTrigger id="teacher" className="h-11 bg-card"><SelectValue placeholder="Vyber učiteľa" /></SelectTrigger><SelectContent>{data.teachers.map((teacher) => <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}{teacher.subject ? ` — ${teacher.subject}` : ""}</SelectItem>)}</SelectContent></Select></div>
        <div><div className="flex items-end justify-between"><Label htmlFor="rating">Hodnotenie</Label><strong className="font-display text-3xl text-primary">{rating}<span className="text-base text-muted-foreground"> / 10</span></strong></div><input id="rating" type="range" min="0" max="10" step="1" value={rating} onChange={(e) => setRating(Number(e.target.value))} className="mt-3 w-full accent-primary" /><div className="flex justify-between text-xs text-muted-foreground"><span>0 — veľmi zlé</span><span>10 — výborné</span></div></div>
        <div className="space-y-2"><Label htmlFor="body">Tvoja skúsenosť</Label><Textarea id="body" required minLength={1} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} className="min-h-36 bg-card" placeholder="Čo sa ti páčilo? Čo by sa mohlo zlepšiť?" /><p className="text-right text-xs text-muted-foreground">{body.length} / 1000</p></div>
        <div className="space-y-2"><Label htmlFor="classroom">Tvoja trieda</Label><Input id="classroom" required maxLength={40} value={classroom} onChange={(e) => setClassroom(e.target.value)} className="h-11 bg-card" placeholder="Napríklad 7.B" /></div>
        <div className="rounded-lg border border-border bg-muted p-4"><div className="flex items-center justify-between gap-4"><Label htmlFor="anonymous" className="flex items-center gap-2 text-base"><LockKeyhole className="size-4" />Anonymná recenzia</Label><Switch id="anonymous" checked={anonymous} onCheckedChange={setAnonymous} /></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{anonymous ? "Recenzia je anonymizovaná — nikto nevie, kto si. Tvoju triedu uvidí iba správca." : "Recenzia nebude anonymná. Verejne sa zobrazí iba tvoja trieda, nikdy nie tvoje meno."}</p></div>
        {error && <p role="alert" className="text-sm font-bold text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={status === "sending" || data.teachers.length === 0}>{status === "sending" ? "Odosielam…" : <><Send />Odoslať na schválenie</>}</Button>
        <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><Users className="size-4" />Tvoja spätná väzba pomáha celej škole.</p>
      </form>
    </section>}
  </main></div>;
}