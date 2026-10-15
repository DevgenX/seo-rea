// Argument helpers shared by the CLI modules.

import { SeoReaError } from "./core/errors.js";

export class UsageError extends SeoReaError {
  override name = "UsageError";
  constructor(message: string) {
    super("USAGE", message);
  }
}

export const num = (v: string | undefined, name: string): number | undefined => {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new UsageError(`--${name} must be a non-negative number`);
  return n;
};

export const DOMAIN_LIKE = /^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i;
