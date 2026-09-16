import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeft, Eye, Heart, MessageSquareText, PenLine } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { getTeacherDetail, likeReview, recordTeacherView } from "@/lib/teachers.functions";
import { useVisitorId } from "@/hooks/use-visitor-id";

const teacherQuery = (id: string) => queryOptions({ queryKey: ["teacher", id], queryFn: () => getTeacherDetail({ data: { id } }) });

export const Route = createFileRoute("/ucitel/$id")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(teacherQuery(params.id));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({ meta: [
    { title: `${loaderData?.teacher.name ?? "Učiteľ"} | Hodnotenie učiteľov` },
    { name: "description", content: `Prečítaj si hodnotenia učiteľa ${loaderData?.teacher.name ?? ""} a pridaj vlastnú recenziu.` },
    { property: "og:title", content: `${loaderData?.teacher.name ?? "Učiteľ"} | Hodnotenia` },
    { property: "og:description", content: "Úprimné hodnotenia učiteľov od študentov." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: TeacherPage,
});

function TeacherPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(teacherQuery(id));
  const visitorId = useVisitorId();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState<Set<string>>(() => new Set());

  useEffect(() => { void recordTeacherView({ data: { teacherId: id } }); }, [id]);
  const like = useMutation({ mutationFn: (reviewId: string) => likeReview({ data: { reviewId, visitorId } }), onSuccess: (_result, reviewId) => { setLiked((old) => new Set(old).add(reviewId)); void queryClient.invalidateQueries({ queryKey: ["teacher", id] }); } });
  if (!data) return null;

  return <div className="min-h-screen bg-background paper-dots"><SiteHeader /><main>
    <section className="border-b border-border bg-card/75"><div className="mx-auto max-w-5xl px-4 py-9 sm:px-6 sm:py-12">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-primary"><ChevronLeft className="size-4" />Všetci učitelia</Link>
      <div className="mt-6 flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="text-sm font-bold text-secondary">{data.teacher.subject || "Učiteľ / učiteľka"}</p><h1 className="mt-1 text-4xl font-semibold sm:text-5xl">{data.teacher.name}</h1><div className="mt-3 flex flex-wrap gap-2">{data.groups.map((group) => <span key={group.id} className="rounded-md border border-border bg-muted px-2 py-1 text-xs">{group.name}</span>)}</div></div>
        <div className="flex items-center gap-4"><div className="rounded-lg bg-accent px-5 py-3 text-center"><strong className="block font-display text-4xl">{data.avgRating ?? "—"}</strong><span className="text-xs">z 10</span></div><div className="text-sm text-muted-foreground"><p>{data.reviews.length} recenzií</p><p className="mt-1 flex items-center gap-1"><Eye className="size-4" />{data.teacher.views} pozretí</p></div></div>
      </div><Button asChild className="mt-7"><Link to="/recenzia" search={{ teacher: id }}><PenLine />Recenzovať učiteľa</Link></Button>
    </div></section>
    <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><div className="mb-6 flex items-center gap-3"><MessageSquareText className="size-6 text-primary" /><h2 className="text-3xl font-semibold">Recenzie študentov</h2></div>
      {data.reviews.length === 0 ? <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center"><p className="text-muted-foreground">Tento učiteľ zatiaľ nemá schválenú recenziu.</p><Button asChild variant="outline" className="mt-4"><Link to="/recenzia" search={{ teacher: id }}>Napíš prvú</Link></Button></div> : <div className="space-y-4">{data.reviews.map((review) => <article key={review.id} className="cozy-card p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div className="rounded-md bg-accent px-3 py-1 font-display text-xl font-semibold">{review.rating} / 10</div><span className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("sk-SK", { dateStyle: "medium" }).format(new Date(review.created_at))}</span></div><p className="mt-5 whitespace-pre-wrap leading-7">{review.body}</p><div className="mt-5 flex items-center justify-between border-t border-border pt-4"><span className="text-sm text-muted-foreground">{review.public_classroom ? `Trieda ${review.public_classroom}` : "Anonymná recenzia"}</span><Button size="sm" variant="ghost" disabled={liked.has(review.id) || like.isPending} onClick={() => like.mutate(review.id)} aria-label="Páči sa mi táto recenzia"><Heart className={liked.has(review.id) ? "fill-current" : ""} />{review.likes}</Button></div></article>)}</div>}
    </section>
  </main></div>;
}