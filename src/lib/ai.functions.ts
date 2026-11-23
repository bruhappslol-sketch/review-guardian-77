import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const improveReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ body: z.string().min(1).max(1000), rating: z.number().min(0).max(10), teacher: z.string().max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!ok) throw new Error("Len správca môže používať túto funkciu.");
    const { expandReviewText } = await import("./ai.server");
    return { text: await expandReviewText(data.body, data.rating, data.teacher) };
  });
