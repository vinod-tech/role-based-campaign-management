import { ObjectId } from "mongodb";
import { z } from "zod";
import { col, ensureIndexes } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { handle, rxQ, paging } from "@/lib/http";

export const dynamic = "force-dynamic";

const stateSchema = z.object({ name: z.string().trim().min(2, "Name is too short").max(80) });

export const GET = handle(async (req: Request) => {
  await requireAdmin();
  await ensureIndexes();
  const { page, pageSize, q, offset } = paging(req);
  const where = q ? { name: { $regex: rxQ(q), $options: "i" } } : {};
  const [total, items] = await Promise.all([
    col.states.countDocuments(where),
    col.states
      .aggregate<{ id: string; name: string; districtCount: number }>([
        { $match: where },
        { $sort: { name: 1 } },
        { $skip: offset },
        { $limit: pageSize },
        {
          $lookup: { from: "districts", localField: "_id", foreignField: "stateId", as: "d" },
        },
        { $project: { _id: 0, id: { $toString: "$_id" }, name: 1, districtCount: { $size: "$d" } } },
      ])
      .toArray(),
  ]);
  return Response.json({ items, total, page, pageSize });
});

export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const body = stateSchema.parse(await req.json());
  const _id = new ObjectId();
  await col.states.insertOne({ _id, name: body.name });
  return Response.json({ id: _id.toHexString(), name: body.name }, { status: 201 });
});
