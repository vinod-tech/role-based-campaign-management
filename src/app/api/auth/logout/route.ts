import { endSession } from "@/lib/auth";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

export const POST = handle(async () => {
  await endSession();
  return Response.json({ ok: true });
});
