import { ObjectId } from "mongodb";
import { col } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { handle } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await requireAdmin();
  const [stateRows, districtRows, msoRows, sponsorRows, channelRows] = await Promise.all([
    col.states.find({}, { projection: { name: 1 } }).sort({ name: 1 }).toArray(),
    col.districts.find({}, { projection: { name: 1, stateId: 1 } }).sort({ name: 1 }).toArray(),
    col.msos.find({}, { projection: { name: 1, stateId: 1, districtId: 1 } }).sort({ name: 1 }).toArray(),
    col.sponsors.find({}, { projection: { name: 1 } }).sort({ name: 1 }).toArray(),
    col.channels
      .aggregate<{ id: string; name: string; stateId: string | null; active: boolean; districtIds: string[] }>([
        { $sort: { name: 1, _id: 1 } },
        {
          $lookup: {
            from: "channel_districts",
            let: { cid: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$channelId", "$$cid"] } } },
              { $sort: { districtId: 1 } },
              { $project: { _id: 0, districtId: 1 } },
            ],
            as: "districts",
          },
        },
        {
          $project: {
            _id: 0,
            id: { $toString: "$_id" },
            name: 1,
            stateId: { $toString: "$stateId" },
            active: 1,
            districtIds: { $map: { input: "$districts", as: "d", in: { $toString: "$$d.districtId" } } },
          },
        },
      ])
      .toArray(),
  ]);
  const s = <T extends { _id: ObjectId }>(x: T) => ({ ...x, id: x._id.toHexString(), _id: undefined });
  return Response.json({
    states: stateRows.map((x) => ({ id: x._id.toHexString(), name: x.name })),
    districts: districtRows.map((x) => ({ id: x._id.toHexString(), name: x.name, stateId: x.stateId.toHexString() })),
    msos: msoRows.map((x) => ({ id: x._id.toHexString(), name: x.name, stateId: x.stateId.toHexString(), districtId: x.districtId.toHexString() })),
    sponsors: sponsorRows.map((x) => ({ id: x._id.toHexString(), name: x.name })),
    channels: channelRows,
  });
});
