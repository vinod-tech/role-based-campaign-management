import { ObjectId } from "mongodb";
import { z } from "zod";
import { col, ensureIndexes } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { handle, rxQ, paging } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { sponsorBase } from "@/lib/validation";

export const dynamic = "force-dynamic";

const createSchema = z.object({ ...sponsorBase, password: z.string().min(6, "Password must be at least 6 characters").max(72) });

export const GET = handle(async (req: Request) => {
  await requireAdmin();
  await ensureIndexes();
  const { page, pageSize, q, offset } = paging(req);
  const where: Record<string, unknown> = {};
  if (q) {
    const rx = { $regex: rxQ(q), $options: "i" };
    const users = await col.users.find({ username: rx }, { projection: { sponsorId: 1 } }).toArray();
    const sponsorIds = users.map((u) => u.sponsorId).filter((x): x is ObjectId => !!x);
    where.$or = [
      { name: rx },
      { contactPerson: rx },
      { contactNo: rx },
      { email: rx },
      ...(sponsorIds.length ? [{ _id: { $in: sponsorIds } }] : []),
    ];
  }
  const [total, items] = await Promise.all([
    col.sponsors.countDocuments(where),
    col.sponsors
      .aggregate<{ id: string; name: string; username: string | null; email: string | null; contactNo: string | null; contactPerson: string | null; campaignCount: number }>([
        { $match: where },
        { $sort: { _id: -1 } },
        { $skip: offset },
        { $limit: pageSize },
        {
          $lookup: {
            from: "users",
            let: { sid: "$_id" },
            pipeline: [{ $match: { $expr: { $eq: ["$sponsorId", "$$sid"] } } }, { $project: { _id: 0, username: 1 } }],
            as: "u",
          },
        },
        {
          $lookup: {
            from: "campaigns",
            let: { sid: "$_id" },
            pipeline: [{ $match: { $expr: { $eq: ["$sponsorId", "$$sid"] } } }, { $count: "n" }],
            as: "c",
          },
        },
        {
          $project: {
            _id: 0,
            id: { $toString: "$_id" },
            name: 1,
            username: { $ifNull: [{ $arrayElemAt: ["$u.username", 0] }, null] },
            email: 1,
            contactNo: 1,
            contactPerson: 1,
            campaignCount: { $ifNull: [{ $arrayElemAt: ["$c.n", 0] }, 0] },
          },
        },
      ])
      .toArray(),
  ]);
  return Response.json({ items, total, page, pageSize });
});

export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const { username, password, ...fields } = createSchema.parse(await req.json());
  const _id = new ObjectId();
  await col.sponsors.insertOne({
    _id,
    name: fields.name,
    email: fields.email,
    contactNo: fields.contactNo,
    contactPerson: fields.contactPerson,
    createdAt: new Date(),
  });
  await col.users.insertOne({
    _id: new ObjectId(),
    username,
    passwordHash: hashPassword(password),
    name: fields.contactPerson ?? fields.name,
    role: "sponsor",
    sponsorId: _id,
  });
  return Response.json({ id: _id.toHexString() }, { status: 201 });
});
