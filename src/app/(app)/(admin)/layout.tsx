import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Everything under (admin) is admin-only. Sponsors are sent to their campaign view.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/my-campaigns");
  return <>{children}</>;
}
