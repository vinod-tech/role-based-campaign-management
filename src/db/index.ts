import { MongoClient, type Db } from "mongodb";
import type {
  Campaign,
  Channel,
  ChannelDistrict,
  ChannelMso,
  District,
  Mso,
  SeedLock,
  Sponsor,
  State,
  User,
} from "./schema";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is required — set your Atlas connection string in .env");
}

const globalForDb = globalThis as typeof globalThis & { __adcastMongoClient?: MongoClient };

export const client = globalForDb.__adcastMongoClient ?? new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
globalForDb.__adcastMongoClient ??= client;

function dbNameFromUri(uri: string): string {
  try {
    const name = new URL(uri).pathname.replace(/^\/+/, "").split("/")[0];
    return name || "adcast";
  } catch {
    return "adcast";
  }
}

export const db: Db = client.db(dbNameFromUri(uri));

export const col = {
  sponsors: db.collection<Sponsor>("sponsors"),
  users: db.collection<User>("users"),
  states: db.collection<State>("states"),
  districts: db.collection<District>("districts"),
  msos: db.collection<Mso>("msos"),
  channels: db.collection<Channel>("channels"),
  channelDistricts: db.collection<ChannelDistrict>("channel_districts"),
  channelMsos: db.collection<ChannelMso>("channel_msos"),
  campaigns: db.collection<Campaign>("campaigns"),
  seedLocks: db.collection<SeedLock>("seed_locks"),
};

let indexes: Promise<void> | null = null;

/** Idempotent index setup; mirrors the unique constraints the Postgres schema enforced. */
export function ensureIndexes(): Promise<void> {
  indexes ??= (async () => {
    await Promise.all([
      col.users.createIndex({ username: 1 }, { unique: true }),
      col.states.createIndex({ name: 1 }, { unique: true }),
      col.districts.createIndex({ stateId: 1, name: 1 }, { unique: true }),
      col.districts.createIndex({ stateId: 1 }),
      col.msos.createIndex({ districtId: 1 }),
      col.channels.createIndex({ stateId: 1 }),
      col.channelDistricts.createIndex({ channelId: 1 }),
      col.channelDistricts.createIndex({ districtId: 1 }),
      col.channelMsos.createIndex({ channelId: 1 }),
      col.channelMsos.createIndex({ msoId: 1 }),
      col.campaigns.createIndex({ sponsorId: 1 }),
      col.campaigns.createIndex({ startDate: 1, endDate: 1 }),
    ]);
  })().catch((e) => {
    indexes = null;
    throw e;
  });
  return indexes;
}
