import "server-only";
import { ObjectId } from "mongodb";
import { col } from "@/db";

export type ChannelListRow = {
  id: string;
  name: string;
  url: string;
  operatorName: string | null;
  operatorContact: string | null;
  operatorEmail: string | null;
  stateId: string | null;
  stateName: string | null;
  active: boolean;
  districtIds: string[];
  districtNames: string[];
  msoIds: string[];
  msoNames: string[];
};

/**
 * Channel list/detail rows with their district + MSO coverage resolved.
 * Replaces the Postgres correlated-subquery projections in the old channelFields.
 */
export async function listChannels(where: Record<string, unknown> = {}, limit?: number, skip = 0): Promise<ChannelListRow[]> {
  const pipeline: Record<string, unknown>[] = [
    { $match: where },
    { $sort: { _id: -1 } },
    ...(limit !== undefined ? [{ $skip: skip }, { $limit: limit }] : []),
    {
      $lookup: {
        from: "channel_districts",
        let: { cid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$channelId", "$$cid"] } } },
          { $lookup: { from: "districts", localField: "districtId", foreignField: "_id", as: "d" } },
          { $unwind: "$d" },
          { $sort: { "d.name": 1 } },
          { $project: { _id: 0, districtId: 1, name: "$d.name" } },
        ],
        as: "districts",
      },
    },
    {
      $lookup: {
        from: "channel_msos",
        let: { cid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$channelId", "$$cid"] } } },
          { $lookup: { from: "msos", localField: "msoId", foreignField: "_id", as: "m" } },
          { $unwind: "$m" },
          { $group: { _id: "$m.name", msoId: { $first: "$m._id" } } },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, msoId: 1, name: "$_id" } },
        ],
        as: "msos",
      },
    },
    { $lookup: { from: "states", localField: "stateId", foreignField: "_id", as: "state" } },
    {
      $project: {
        _id: 0,
        id: { $toString: "$_id" },
        name: 1,
        url: 1,
        operatorName: 1,
        operatorContact: 1,
        operatorEmail: 1,
        stateId: { $toString: "$stateId" },
        stateName: { $ifNull: [{ $arrayElemAt: ["$state.name", 0] }, null] },
        active: 1,
        districtIds: "$districts.districtId",
        districtNames: "$districts.name",
        msoIds: "$msos.msoId",
        msoNames: "$msos.name",
      },
    },
  ];
  const rows = await col.channels.aggregate<Record<string, unknown>>(pipeline).toArray();
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    url: r.url as string,
    operatorName: (r.operatorName as string | null) ?? null,
    operatorContact: (r.operatorContact as string | null) ?? null,
    operatorEmail: (r.operatorEmail as string | null) ?? null,
    stateId: (r.stateId as string | null) ?? null,
    stateName: (r.stateName as string | null) ?? null,
    active: r.active as boolean,
    districtIds: ((r.districtIds as unknown[]) ?? []).map((x) => (x instanceof ObjectId ? x.toHexString() : String(x))),
    districtNames: (r.districtNames as string[]) ?? [],
    msoIds: ((r.msoIds as unknown[]) ?? []).map((x) => (x instanceof ObjectId ? x.toHexString() : String(x))),
    msoNames: (r.msoNames as string[]) ?? [],
  }));
}
