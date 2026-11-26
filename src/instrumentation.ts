export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { seedIfEmpty } = await import("./db/seed");
      await seedIfEmpty();
    } catch (e) {
      console.error("[seed] skipped:", (e as Error).message);
    }
  }
}
