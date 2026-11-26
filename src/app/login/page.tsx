import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect(user.role === "admin" ? "/dashboard" : "/my-campaigns");
  return <LoginForm />;
}
