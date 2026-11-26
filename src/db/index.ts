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

/** Lazy client holder: importing this module must never throw at module load,
 * otherwise a missing env var takes down every SSR route (500 on all pages).
 * Callers get a rejected promise on first use instead. */
function getClient(): MongoClient {
  if (!uri) {
    throw new Error("MONGODB_URI is required — set it as an environment variable in the Amplify console");
  }
  const globalForDb = globalThis as typeof globalThis & { __adcastMongoClient?: MongoClient };
  return (globalForDb.__adcastMongoClient ??= new MongoClient(uri, { serverSelectionTimeoutMS: 10000 }));
}

export const client: MongoClient = new Proxy({} as MongoClient, {
  get(_t, prop) {
    const real = getClient();
    const value = Reflect.get(real as object, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

function dbNameFromUri(uri: string): string {
  try {
    const name = new URL(uri).pathname.replace(/^\/+/, "").split("/")[0];
    return name || "adcast";
  } catch {
    return "adcast";
  }
}

export const db: Db = new Proxy({} as Db, {
  get(_t, prop) {
    const real = getClient().db(dbNameFromUri(uri!));
    const value = Reflect.get(real as object, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export const col = {
  get sponsors() { return db.collection<Sponsor>("sponsors"); },
  get users() { return db.collection<User>("users"); },
  get states() { return db.collection<State>("states"); },
  get districts() { return db.collection<District>("districts"); },
  get msos() { return db.collection<Mso>("msos"); },
  get channels() { return db.collection<Channel>("channels"); },
  get channelDistricts() { return db.collection<ChannelDistrict>("channel_districts"); },
  get channelMsos() { return db.collection<ChannelMso>("channel_msos"); },
  get campaigns() { return db.collection<Campaign>("campaigns"); },
  get seedLocks() { return db.collection<SeedLock>("seed_locks"); },
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
