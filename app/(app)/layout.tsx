import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { SidebarBrand } from "@/components/sidebar-brand";
import { SidebarShell } from "@/components/sidebar-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <SidebarShell brand={<SidebarBrand />} nav={<AppNav />}>
      {children}
    </SidebarShell>
  );
}
