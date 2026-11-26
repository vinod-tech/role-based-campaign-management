import { ObjectId } from "mongodb";
import { col } from "@/db";
import { requireUser } from "@/lib/auth";
import { fmtDate, statusOf } from "@/lib/date";
import { handle, HttpError } from "@/lib/http";

export const dynamic = "force-dynamic";

// Returns the stream URL only when the user may play the channel for this campaign:
// sponsors -> own campaign, assigned channel, and only between start and end date.
export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  const u = new URL(req.url);
  const campaignId = u.searchParams.get("campaignId") ?? "";
  const channelId = u.searchParams.get("channelId") ?? "";
  if (!campaignId || !channelId) throw new HttpError(400, "campaignId and channelId are required");
  if (!ObjectId.isValid(campaignId) || !ObjectId.isValid(channelId)) throw new HttpError(400, "Invalid id");

  const cid = new ObjectId(campaignId);
  const chid = new ObjectId(channelId);
  const c = await col.campaigns.findOne({ _id: cid });
  if (!c) throw new HttpError(404, "Campaign not found");
  if (user.role !== "admin") {
    if (c.sponsorId.toHexString() !== user.sponsorId) throw new HttpError(403, "This campaign is not assigned to you.");
    const status = statusOf(c.startDate, c.endDate);
    if (status !== "running") {
      throw new HttpError(
        403,
        status === "upcoming"
          ? `This campaign starts on ${fmtDate(c.startDate)}. Playback unlocks then.`
          : `This campaign ended on ${fmtDate(c.endDate)}. Playback is no longer available.`,
      );
    }
  }
  if (!c.channelIds.some((x) => x.equals(chid))) throw new HttpError(403, "This channel is not part of the campaign.");

  const ch = await col.channels.findOne({ _id: chid }, { projection: { name: 1, url: 1, active: 1 } });
  if (!ch) throw new HttpError(404, "Channel not found");
  if (!ch.active) throw new HttpError(409, "This channel is currently inactive.");
  return Response.json({ name: ch.name, url: ch.url, campaignName: c.name, endDate: c.endDate });
});
