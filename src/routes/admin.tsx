import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, FormEvent } from "react";
import { LockKeyhole, LogOut, Plus, Check, X, Save, Users2, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Správa nástenky | Školská nástenka" },
      { name: "description", content: "Interná správa učiteľov, tried a recenzií." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

type Teacher = { id: string; name: string; subject: string | null };
type Group = { id: string; name: string; kind: "trieda" | "predmet" };
type Review = {
  id: string;
  teacher_id: string;
  rating: number;
  body: string;
  classroom: string;
  anonymous: boolean;
  status: "pending" | "approved" | "declined";
  created_at: string;
};
type Link = { teacher_id: string; group_id: string };

function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: ok } = await supabase.rpc("has_role", {
          _user_id: data.user.id,
          _role: "admin",
        });
        setIsAdmin(Boolean(ok));
      }
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        Načítavam…
      </div>
    );
  }
  if (!isAdmin) return <LoginCard onSignedIn={() => setIsAdmin(true)} />;
  return <AdminConsole onSignOut={() => setIsAdmin(false)} />;
}

function LoginCard({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError || !data.user) {
      setError("Nesprávny e-mail alebo heslo.");
      setBusy(false);
      return;
    }
    const { data: ok } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (!ok) {
      await supabase.auth.signOut();
      setError("Tento účet nemá práva správcu.");
      setBusy(false);
      return;
    }
    onSignedIn();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background paper-dots px-4">
      <form onSubmit={handleSubmit} className="cozy-card w-full max-w-sm space-y-5 p-6 sm:p-8">
        <div className="text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <LockKeyhole className="size-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold">Správa nástenky</h1>
          <p className="mt-2 text-sm text-muted-foreground">Prihlás sa e-mailom a heslom.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 bg-card"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Heslo</Label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 bg-card"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm font-bold text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy ? "Prihlasujem…" : "Prihlásiť sa"}
        </Button>
      </form>
    </div>
  );
}

function AdminConsole({ onSignOut }: { onSignOut: () => void }) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [message, setMessage] = useState("");

  async function reload() {
    const [t, g, r, l] = await Promise.all([
      supabase.from("teachers").select("id, name, subject").order("name"),
      supabase.from("groups").select("id, name, kind").order("kind").order("name"),
      supabase
        .from("reviews")
        .select("id, teacher_id, rating, body, classroom, anonymous, status, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("teacher_groups").select("teacher_id, group_id"),
    ]);
    setTeachers(t.data ?? []);
    setGroups(g.data ?? []);
    setReviews((r.data ?? []) as Review[]);
    setLinks(l.data ?? []);
  }

  useEffect(() => {
    void reload();
  }, []);

  const teacherName = useMemo(
    () => new Map(teachers.map((t) => [t.id, t.name])),
    [teachers],
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    onSignOut();
  }

  return (
    <div className="min-h-screen bg-background paper-dots">
      <header className="border-b border-border bg-card/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <h1 className="font-display text-xl font-semibold">Správa nástenky</h1>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut aria-hidden="true" />
            Odhlásiť
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        {message && (
          <p className="cozy-card p-4 text-sm font-bold text-secondary-foreground">{message}</p>
        )}

        <NewTeacher
          onDone={async (text) => {
            setMessage(text);
            await reload();
          }}
        />
        <NewGroup
          onDone={async (text) => {
            setMessage(text);
            await reload();
          }}
        />
        <Assignments
          teachers={teachers}
          groups={groups}
          links={links}
          onDone={async (text) => {
            setMessage(text);
            await reload();
          }}
        />
        <Moderation reviews={reviews} teacherName={teacherName} onDone={reload} />
      </main>
    </div>
  );
}

function NewTeacher({ onDone }: { onDone: (message: string) => void | Promise<void> }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const { error } = await supabase
      .from("teachers")
      .insert({ name: name.trim(), subject: subject.trim() || null });
    if (error) {
      void onDone(`Učiteľa sa nepodarilo pridať: ${error.message}`);
      return;
    }
    setName("");
    setSubject("");
    void onDone("Učiteľ bol pridaný.");
  }

  return (
    <section className="cozy-card p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <GraduationCap className="size-5 text-primary" aria-hidden="true" />
        Pridať učiteľa
      </h2>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Input
          required
          placeholder="Meno a priezvisko"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 bg-card"
        />
        <Input
          placeholder="Predmet (nepovinné)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="h-11 bg-card"
        />
        <Button type="submit" className="h-11">
          <Plus aria-hidden="true" />
          Pridať
        </Button>
      </form>
    </section>
  );
}

function NewGroup({ onDone }: { onDone: (message: string) => void | Promise<void> }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"trieda" | "predmet">("trieda");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const { error } = await supabase.from("groups").insert({ name: name.trim(), kind });
    if (error) {
      void onDone(`Skupinu sa nepodarilo vytvoriť: ${error.message}`);
      return;
    }
    setName("");
    void onDone("Skupina bola vytvorená.");
  }

  return (
    <section className="cozy-card p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <Users2 className="size-5 text-primary" aria-hidden="true" />
        Vytvoriť triedu alebo predmet
      </h2>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
        <Input
          required
          placeholder="Napríklad 7.B alebo Matematika"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 bg-card"
        />
        <Select value={kind} onValueChange={(value) => setKind(value as "trieda" | "predmet")}>
          <SelectTrigger className="h-11 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trieda">Trieda</SelectItem>
            <SelectItem value="predmet">Predmet</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" className="h-11">
          <Plus aria-hidden="true" />
          Vytvoriť
        </Button>
      </form>
    </section>
  );
}

function Assignments({
  teachers,
  groups,
  links,
  onDone,
}: {
  teachers: Teacher[];
  groups: Group[];
  links: Link[];
  onDone: (message: string) => void | Promise<void>;
}) {
  const [groupId, setGroupId] = useState("");
  const assigned = new Set(links.filter((l) => l.group_id === groupId).map((l) => l.teacher_id));

  async function toggle(teacherId: string) {
    if (!groupId) return;
    if (assigned.has(teacherId)) {
      const { error } = await supabase
        .from("teacher_groups")
        .delete()
        .eq("group_id", groupId)
        .eq("teacher_id", teacherId);
      void onDone(error ? `Chyba: ${error.message}` : "Učiteľ bol odobraný zo skupiny.");
    } else {
      const { error } = await supabase
        .from("teacher_groups")
        .insert({ group_id: groupId, teacher_id: teacherId });
      void onDone(error ? `Chyba: ${error.message}` : "Učiteľ bol priradený do skupiny.");
    }
  }

  return (
    <section className="cozy-card p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold">Priradiť učiteľov do skupiny</h2>
      <div className="mt-4 max-w-sm">
        <Select value={groupId} onValueChange={setGroupId}>
          <SelectTrigger className="h-11 bg-card">
            <SelectValue placeholder="Vyber triedu alebo predmet" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name} ({group.kind})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {groupId && (
        <div className="mt-4 flex flex-wrap gap-2">
          {teachers.map((teacher) => (
            <Button
              key={teacher.id}
              type="button"
              size="sm"
              variant={assigned.has(teacher.id) ? "default" : "outline"}
              onClick={() => void toggle(teacher.id)}
            >
              {assigned.has(teacher.id) && <Check aria-hidden="true" />}
              {teacher.name}
            </Button>
          ))}
          {teachers.length === 0 && (
            <p className="text-sm text-muted-foreground">Najprv pridaj učiteľov.</p>
          )}
        </div>
      )}
    </section>
  );
}

const statusLabels: Record<Review["status"], string> = {
  pending: "Čaká na schválenie",
  approved: "Schválená",
  declined: "Odmietnutá",
};

function Moderation({
  reviews,
  teacherName,
  onDone,
}: {
  reviews: Review[];
  teacherName: Map<string, string>;
  onDone: () => void | Promise<void>;
}) {
  const pending = reviews.filter((r) => r.status === "pending");
  const rest = reviews.filter((r) => r.status !== "pending");

  return (
    <section className="space-y-4">
      <h2 className="font-display text-lg font-semibold">
        Recenzie {pending.length > 0 && <span className="text-primary">({pending.length} čaká)</span>}
      </h2>
      {reviews.length === 0 && (
        <p className="cozy-card p-5 text-sm text-muted-foreground">Zatiaľ žiadne recenzie.</p>
      )}
      {[...pending, ...rest].map((review) => (
        <ReviewRow
          key={review.id}
          review={review}
          teacher={teacherName.get(review.teacher_id) ?? "Neznámy učiteľ"}
          onDone={onDone}
        />
      ))}
    </section>
  );
}

function ReviewRow({
  review,
  teacher,
  onDone,
}: {
  review: Review;
  teacher: string;
  onDone: () => void | Promise<void>;
}) {
  const [body, setBody] = useState(review.body);
  const [rating, setRating] = useState(review.rating);
  const [busy, setBusy] = useState(false);

  async function update(patch: Partial<Review>) {
    setBusy(true);
    await supabase.from("reviews").update(patch).eq("id", review.id);
    setBusy(false);
    void onDone();
  }

  return (
    <article className="cozy-card space-y-4 p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-base font-semibold">{teacher}</p>
          <p className="text-xs text-muted-foreground">
            Trieda žiaka: <strong>{review.classroom}</strong>
            {review.anonymous ? " · anonymná (trieda skrytá verejnosti)" : " · trieda zverejnená"}
            {" · "}
            {new Date(review.created_at).toLocaleDateString("sk-SK")}
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">
          {statusLabels[review.status]}
        </span>
      </header>
      <Textarea
        value={body}
        maxLength={1000}
        onChange={(e) => setBody(e.target.value)}
        className="min-h-24 bg-card"
      />
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          Hodnotenie
          <Input
            type="number"
            min={0}
            max={10}
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="h-10 w-20 bg-card"
          />
          <span className="text-muted-foreground">/ 10</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void update({ body, rating })}
          >
            <Save aria-hidden="true" />
            Uložiť úpravy
          </Button>
          <Button
            size="sm"
            disabled={busy || review.status === "approved"}
            onClick={() => void update({ body, rating, status: "approved" })}
          >
            <Check aria-hidden="true" />
            Schváliť
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy || review.status === "declined"}
            onClick={() => void update({ status: "declined" })}
          >
            <X aria-hidden="true" />
            Odmietnuť
          </Button>
        </div>
      </div>
    </article>
  );
}
