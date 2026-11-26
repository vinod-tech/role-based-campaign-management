import { ZodError } from "zod";
import { ObjectId } from "mongodb";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type MongoLike = { code?: number | string; name?: string; cause?: MongoLike };

function mongoCode(e: unknown): number | string | undefined {
  let cur = e as MongoLike | undefined;
  for (let i = 0; i < 3 && cur; i++) {
    if (cur.code !== undefined) return cur.code;
    cur = cur.cause;
  }
  return undefined;
}

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) {
        const issue = e.issues[0];
        const path = issue.path.join(".");
        return Response.json({ error: path ? `${path}: ${issue.message}` : issue.message }, { status: 400 });
      }
      const code = mongoCode(e);
      if (code === 11000) return Response.json({ error: "A record with this value already exists." }, { status: 409 });
      console.error(e);
      return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export function paging(req: Request, defaultSize = 10) {
  const u = new URL(req.url);
  const page = Math.max(1, parseInt(u.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(u.searchParams.get("pageSize") ?? String(defaultSize), 10) || defaultSize));
  const q = (u.searchParams.get("q") ?? "").trim();
  return { u, page, pageSize, q, offset: (page - 1) * pageSize };
}

/** Escape user input used inside a $regex so it matches literally. */
export const rxQ = (q: string) => q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function idFrom(ctx: { params: Promise<{ id: string }> }): Promise<ObjectId> {
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) throw new HttpError(400, "Invalid id");
  return new ObjectId(id);
}

export const intParam = (u: URL, key: string): number | undefined => {
  const v = parseInt(u.searchParams.get(key) ?? "", 10);
  return Number.isFinite(v) ? v : undefined;
};
