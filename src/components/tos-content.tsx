import { buildTos } from "@/lib/tos";

export function TosContent() {
  return (
    <div className="space-y-6 text-sm leading-6">
      {buildTos().map((s) => (
        <section key={s.title}>
          <h3 className="font-display text-lg font-semibold">{s.title}</h3>
          {s.paragraphs.map((p, i) => <p key={i} className="mt-2 text-muted-foreground">{p}</p>)}
        </section>
      ))}
    </div>
  );
}
