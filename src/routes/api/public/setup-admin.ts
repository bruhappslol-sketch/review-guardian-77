import { createFileRoute } from "@tanstack/react-router";

/** Jednorazové vytvorenie správcu. Chránené tajným tokenom. */
export const Route = createFileRoute("/api/public/setup-admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env["ADMIN_SETUP_TOKEN"];
        if (!token || request.headers.get("x-setup-token") !== token) {
          return new Response("Unauthorized", { status: 401 });
        }
        const payload = (await request.json()) as { email?: string; password?: string };
        if (!payload.email || !payload.password) {
          return new Response("Bad request", { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const created = await supabaseAdmin.auth.admin.createUser({
          email: payload.email,
          password: payload.password,
          email_confirm: true,
        });
        let userId = created.data.user?.id;
        if (!userId) {
          const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
          userId = list.data.users.find((u) => u.email === payload.email)?.id;
          if (!userId) {
            return new Response(created.error?.message ?? "create failed", { status: 500 });
          }
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: payload.password,
            email_confirm: true,
          });
        }
        const { error } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
        if (error) return new Response(error.message, { status: 500 });
        return new Response("ok");
      },
    },
  },
});
