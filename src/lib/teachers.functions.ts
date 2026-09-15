import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Verejný server klient — číta len dáta povolené RLS politikami (anon).
 * Nové kľúče sb_publishable nie sú JWT; posielame len apikey hlavičku.
 */
function getPublicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type FeaturedReview = {
  id: string;
  rating: number;
  body: string;
  public_classroom: string | null;
  likes: number;
};

export type HomeTeacher = {
  id: string;
  name: string;
  subject: string | null;
  views: number;
  groupIds: string[];
  avgRating: number | null;
  reviewCount: number;
  featured: FeaturedReview | null;
};

export type HomeGroup = {
  id: string;
  name: string;
  kind: "trieda" | "predmet";
  teacherCount: number;
};

export type HomeData = {
  groups: HomeGroup[];
  teachers: HomeTeacher[];
};

/** Údaje pre domovskú stránku: skupiny + učitelia + zvýraznená recenzia. */
export const getHomeData = createServerFn({ method: "GET" }).handler(async (): Promise<HomeData> => {
  const supabase = getPublicClient();

  const [teachersRes, groupsRes, linksRes, reviewsRes] = await Promise.all([
    supabase.from("teachers").select("id, name, subject, views").order("name"),
    supabase.from("groups").select("id, name, kind").order("kind").order("name"),
    supabase.from("teacher_groups").select("teacher_id, group_id"),
    supabase
      .from("reviews")
      .select("id, teacher_id, rating, body, public_classroom, likes, views, created_at")
      .eq("status", "approved"),
  ]);

  if (teachersRes.error) throw teachersRes.error;
  if (groupsRes.error) throw groupsRes.error;
  if (linksRes.error) throw linksRes.error;
  if (reviewsRes.error) throw reviewsRes.error;

  const teachers = teachersRes.data ?? [];
  const links = linksRes.data ?? [];
  const reviews = reviewsRes.data ?? [];

  const teacherGroups = new Map<string, string[]>();
  for (const l of links) {
    const list = teacherGroups.get(l.teacher_id) ?? [];
    list.push(l.group_id);
    teacherGroups.set(l.teacher_id, list);
  }

  const reviewsByTeacher = new Map<string, typeof reviews>();
  for (const r of reviews) {
    const list = reviewsByTeacher.get(r.teacher_id) ?? [];
    list.push(r);
    reviewsByTeacher.set(r.teacher_id, list);
  }

  const groupCounts = new Map<string, number>();
  for (const l of links) {
    groupCounts.set(l.group_id, (groupCounts.get(l.group_id) ?? 0) + 1);
  }

  const homeTeachers: HomeTeacher[] = teachers.map((t) => {
    const list = reviewsByTeacher.get(t.id) ?? [];
    const avg =
      list.length > 0 ? list.reduce((sum, r) => sum + r.rating, 0) / list.length : null;

    // Zvýraznená recenzia: najviac lajkov, pri remíze najviac zhliadnutí,
    // keď žiadne pravidlo nerozhodne, náhodná schválená recenzia.
    const maxLikes = Math.max(0, ...list.map((r) => r.likes));
    const maxViews = Math.max(0, ...list.map((r) => r.views));
    let featured = list[0] ?? null;
    if (list.length > 0 && (maxLikes > 0 || maxViews > 0)) {
      featured = [...list].sort(
        (a, b) => b.likes - a.likes || b.views - a.views || a.created_at.localeCompare(b.created_at),
      )[0];
    } else if (list.length > 0) {
      featured = list[Math.floor(Math.random() * list.length)];
    }

    return {
      id: t.id,
      name: t.name,
      subject: t.subject,
      views: t.views,
      groupIds: teacherGroups.get(t.id) ?? [],
      avgRating: avg === null ? null : Math.round(avg * 10) / 10,
      reviewCount: list.length,
      featured: featured
        ? {
            id: featured.id,
            rating: featured.rating,
            body: featured.body,
            public_classroom: featured.public_classroom,
            likes: featured.likes,
          }
        : null,
    };
  });

  const groups: HomeGroup[] = (groupsRes.data ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    kind: g.kind,
    teacherCount: groupCounts.get(g.id) ?? 0,
  }));

  return { groups, teachers: homeTeachers };
});

export type TeacherReview = {
  id: string;
  rating: number;
  body: string;
  public_classroom: string | null;
  likes: number;
  created_at: string;
};

export type TeacherDetail = {
  teacher: { id: string; name: string; subject: string | null; views: number };
  groups: { id: string; name: string; kind: "trieda" | "predmet" }[];
  reviews: TeacherReview[];
  avgRating: number | null;
};

/** Detail učiteľa so všetkými schválenými recenziami. */
export const getTeacherDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<TeacherDetail | null> => {
    const supabase = getPublicClient();

    const teacherRes = await supabase
      .from("teachers")
      .select("id, name, subject, views")
      .eq("id", data.id)
      .maybeSingle();
    if (teacherRes.error) throw teacherRes.error;
    if (!teacherRes.data) return null;

    const [linksRes, reviewsRes] = await Promise.all([
      supabase
        .from("teacher_groups")
        .select("group_id, groups(id, name, kind)")
        .eq("teacher_id", data.id),
      supabase
        .from("reviews")
        .select("id, rating, body, public_classroom, likes, created_at")
        .eq("teacher_id", data.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false }),
    ]);
    if (linksRes.error) throw linksRes.error;
    if (reviewsRes.error) throw reviewsRes.error;

    const reviews = (reviewsRes.data ?? []).map((r) => ({ ...r, views: 0 }));
    const avg =
      reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

    return {
      teacher: teacherRes.data,
      groups: (linksRes.data ?? []).map((l) => l.groups).filter(Boolean) as TeacherDetail["groups"],
      reviews: reviews.map(({ views: _views, ...r }) => r),
      avgRating: avg === null ? null : Math.round(avg * 10) / 10,
    };
  });

const submitReviewSchema = z.object({
  teacherId: z.string().uuid(),
  rating: z.number().int().min(0).max(10),
  body: z.string().trim().min(1, "Napíš recenziu.").max(1000, "Recenzia je pridlhá (max. 1000 znakov)."),
  classroom: z
    .string()
    .trim()
    .min(1, "Zadaj svoju triedu.")
    .max(40, "Trieda môže mať najviac 40 znakov."),
  anonymous: z.boolean(),
});

/** Odoslanie recenzie — vždy čaká na schválenie admina. */
export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submitReviewSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = getPublicClient();
    const { error } = await supabase.from("reviews").insert({
      teacher_id: data.teacherId,
      rating: data.rating,
      body: data.body,
      classroom: data.classroom,
      anonymous: data.anonymous,
    });
    if (error) throw error;
    return { ok: true };
  });

/** Lajk recenzie z tohto zariadenia (jedna lajkovosť na zariadenie). */
export const likeReview = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ reviewId: z.string().uuid(), visitorId: z.string().min(1).max(64) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const supabase = getPublicClient();
    const { data: likes, error } = await supabase.rpc("like_review", {
      p_review_id: data.reviewId,
      p_visitor_id: data.visitorId,
    });
    if (error) throw error;
    return { likes: likes ?? 0 };
  });

/** Zarátanie zhliadnutia detailu učiteľa a jeho recenzií. */
export const recordTeacherView = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ teacherId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const supabase = getPublicClient();
    await supabase.rpc("record_teacher_view", { p_teacher_id: data.teacherId });
    await supabase.rpc("record_review_views", { p_teacher_id: data.teacherId });
    return { ok: true };
  });
