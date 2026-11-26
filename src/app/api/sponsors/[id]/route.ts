import { ObjectId } from "mongodb";
import { z } from "zod";
import { col } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { handle, HttpError, idFrom } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { sponsorBase } from "@/lib/validation";

export const dynamic = "force-dynamic";

const schema = z.object({
  ...sponsorBase,
  password: z.union([z.literal(""), z.string().min(6, "Password must be at least 6 characters").max(72)]).optional(),
});
type Ctx = { params: Promise<{ id: string }> };

export const PUT = handle(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const id = await idFrom(ctx);
  const { username, password, ...fields } = schema.parse(await req.json());
  const res = await col.sponsors.updateOne(
    { _id: id },
    { $set: { name: fields.name, email: fields.email, contactNo: fields.contactNo, contactPerson: fields.contactPerson } },
  );
  if (res.matchedCount === 0) throw new HttpError(404, "Sponsor not found");
  const name = fields.contactPerson ?? fields.name;
  const userPatch: Record<string, unknown> = { username, name };
  if (password) userPatch.passwordHash = hashPassword(password);
  const userRes = await col.users.updateOne({ sponsorId: id }, { $set: userPatch });
  if (userRes.matchedCount === 0) {
    await col.users.insertOne({
      _id: new ObjectId(),
      username,
      passwordHash: hashPassword(password || "changeme123"),
      name,
      role: "sponsor",
      sponsorId: id,
    });
  }
  return Response.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const id = await idFrom(ctx);
  // Cascade: sponsor's login and all of their campaigns.
  await col.users.deleteMany({ sponsorId: id });
  await col.campaigns.deleteMany({ sponsorId: id });
  await col.sponsors.deleteOne({ _id: id });
  return Response.json({ ok: true });
});
