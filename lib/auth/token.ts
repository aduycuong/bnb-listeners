import { decodeJwt } from "jose";

/**
 * Checks if a JWT is not expired by decoding and validating the `exp` claim.
 * No network calls or signature verification — fast for middleware.
 */
export function isTokenNotExpired(token: string): boolean {
  try {
    const payload = decodeJwt(token);
    const exp = payload.exp;
    if (typeof exp !== "number") return false;
    return exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
