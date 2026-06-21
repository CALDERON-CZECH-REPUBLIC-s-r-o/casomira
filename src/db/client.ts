import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Singleton DB klient (postgres-js + Drizzle).
 * V devu se cachuje na globalThis kvůli HMR (jinak by se hromadily spojení).
 */
const globalForDb = globalThis as unknown as {
  __pg?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__pg ??
  postgres(env.DATABASE_URL, {
    max: env.NODE_ENV === "production" ? 10 : 5,
  });

if (env.NODE_ENV !== "production") globalForDb.__pg = client;

export const db = drizzle(client, { schema });
export { schema };
export type Database = typeof db;
