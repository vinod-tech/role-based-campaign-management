import { z } from "zod";
import { col } from "@/db";
import { seedIfEmpty } from "@/db/seed";
import { startSession } from "@/lib/auth";
import { handle, HttpError } from "@/lib/http";
import { verifyPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

const schema = z.object({ username: z.string().trim().min(1, "Username is required"), password: z.string().min(1, "Password is required") });

export const POST = handle(async (req: Request) => {
  const body = schema.parse(await req.json().catch(() => ({})));
  await seedIfEmpty().catch(() => undefined);
  const u = await col.users.findOne({ username: body.username });
  if (!u || !verifyPassword(body.password, u.passwordHash)) throw new HttpError(401, "Invalid username or password.");
  await startSession(u._id.toHexString());
  return Response.json({ id: u._id.toHexString(), name: u.name, role: u.role });
});
