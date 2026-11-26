import { getSessionFresh } from "@/lib/auth";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const user = await getSessionFresh();
  if (!user) return Response.json({ error: "Please sign in to continue." }, { status: 401 });
  return Response.json(user);
});
