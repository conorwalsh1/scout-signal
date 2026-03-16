import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { SidebarBrand } from "@/components/sidebar-brand";

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
    <div className="min-h-screen flex bg-background">
      <aside className="w-56 border-r border-sidebar-border flex flex-col bg-sidebar">
        <div className="p-4 border-b border-sidebar-border">
          <SidebarBrand />
        </div>
        <AppNav />
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
