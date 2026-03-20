import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireRole(allowedRoles: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();

  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect("/dashboard");
  }

  return {
    user,
    profile,
    supabase,
  };
}
