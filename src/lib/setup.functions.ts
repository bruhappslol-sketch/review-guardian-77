import { createServerFn } from "@tanstack/react-start";

/**
 * Jednorazové vytvorenie správcovského účtu. Spúšťa sa iba interne (nasadenie),
 * heslo sa nikdy nevracia klientovi.
 */
export const ensureAdminUser = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string; secret: string }) => data)
  .handler(async ({ data }) => {
    if (data.secret !== process.env["LOVABLE_CRON_SECRET"]) {
      throw new Error("Forbidden");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    let userId = created.data.user?.id;
    if (!userId) {
      const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = list.data.users.find((u) => u.email === data.email)?.id;
      if (!userId) throw new Error(created.error?.message ?? "Účet sa nepodarilo vytvoriť.");
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: data.password,
        email_confirm: true,
      });
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw error;

    return { ok: true };
  });
