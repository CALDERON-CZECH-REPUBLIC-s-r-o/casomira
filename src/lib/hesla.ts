import { hash, verify } from "@node-rs/argon2";

/**
 * Sdílené argon2 parametry a helpery pro hesla (registrace, CLI, login).
 * Bez závislosti na DB/aliasu — použitelné i ze skriptů (`db/*`).
 */
const PARAMS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const MIN_DELKA_HESLA = 8;

/** Vytvoří argon2 hash hesla. */
export function hashHesla(heslo: string): Promise<string> {
  return hash(heslo, PARAMS);
}

/** Ověří heslo proti uloženému hashi. */
export function overHeslo(hashHesla: string, heslo: string): Promise<boolean> {
  return verify(hashHesla, heslo);
}
