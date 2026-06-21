import { z } from "zod";

/**
 * Validace prostředí. Selže rychle při startu, když chybí povinná proměnná.
 * Lokální měřicí běh potřebuje jen DATABASE_URL; cloud sync proměnné jsou volitelné.
 */
// Prázdný řetězec (CLOUD_SYNC_URL= v .env) ber jako nevyplněno.
const prazdnyJakoUndefined = (v: unknown) =>
  v === "" ? undefined : v;

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL musí být nastavená"),
  AUTH_SECRET: z.preprocess(prazdnyJakoUndefined, z.string().min(1).optional()),
  APP_BASE_URL: z.preprocess(prazdnyJakoUndefined, z.string().url().optional()),

  // Jednosměrný sync na cloud (best-effort, mimo kritickou cestu měření).
  // Na lokální instanci: kam publikovat. Na cloud instanci: token, který přijímá.
  CLOUD_SYNC_URL: z.preprocess(prazdnyJakoUndefined, z.string().url().optional()),
  SYNC_TOKEN: z.preprocess(prazdnyJakoUndefined, z.string().optional()),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
