import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const KEY = "nastenka-signed";

export function SignatureGate() {
  const { pathname } = useLocation();
  const [needs, setNeeds] = useState(false);
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setNeeds(!window.localStorage.getItem(KEY)); }, []);

  if (!needs || pathname.startsWith("/admin") || pathname.startsWith("/podmienky")) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const full = name.trim().replace(/\s+/g, " ");
    if (full.length < 3 || !full.includes(" ")) return setError("Zadaj svoje plné meno (meno aj priezvisko).");
    if (!agree) return setError("Musíš súhlasiť s podmienkami (ToS).");
    setBusy(true);
    let vid = window.localStorage.getItem("nastenka-visitor-id");
    if (!vid) { vid = crypto.randomUUID(); window.localStorage.setItem("nastenka-visitor-id", vid); }
    const { error: err } = await supabase.from("visitor_signatures").insert({ full_name: full, visitor_id: vid });
    setBusy(false);
    if (err) return setError("Podpis sa nepodarilo uložiť, skús znova.");
    window.localStorage.setItem(KEY, "1");
    setNeeds(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 paper-dots">
      <form onSubmit={submit} className="cozy-card w-full max-w-md space-y-4 p-6">
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold"><PenLine className="size-5" /> Podpíš sa svojím plným menom</h2>
        <p className="text-sm text-muted-foreground">Podpis uvidí iba admin a dá ti prístup na web.</p>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meno Priezvisko" maxLength={100} autoFocus />
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
          <span>Podpisom súhlasím s <Link to="/podmienky" target="_blank" className="font-bold text-primary underline">Terms of Service (ToS)</Link>: nie som plnoletý, som študent tejto školy a moje recenzie sú reálne.</span>
        </label>
        {error && <p className="text-sm font-bold text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>Podpísať a vstúpiť</Button>
      </form>
    </div>
  );
}
