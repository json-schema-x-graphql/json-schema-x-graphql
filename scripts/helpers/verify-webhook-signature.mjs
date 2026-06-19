// Webhook signature verification for GitHub webhook deliveries
// Validates the X-Hub-Signature-256 header using HMAC-SHA256

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Compute the expected HMAC-SHA256 signature for a webhook payload.
 *
 * @param {string|Buffer} payload - Raw request body (string or Buffer)
 * @param {string} secret - Webhook secret used to sign the payload
 * @returns {string} Signature in the form "sha256=<hex>"
 */
export function computeWebhookSignature(payload, secret) {
  const hmac = createHmac("sha256", secret);
  hmac.update(
    typeof payload === "string" ? Buffer.from(payload, "utf8") : payload,
  );
  return `sha256=${hmac.digest("hex")}`;
}

/**
 * Verify a GitHub webhook delivery signature.
 *
 * Compares the provided X-Hub-Signature-256 header value against the
 * expected signature derived from the raw payload and the shared secret.
 * Uses a timing-safe comparison to prevent timing attacks.
 *
 * @param {string|Buffer} payload - Raw request body (string or Buffer)
 * @param {string} signature - Value of the X-Hub-Signature-256 header (e.g. "sha256=abc123…")
 * @param {string} secret - Webhook secret configured on the GitHub webhook
 * @returns {boolean} true if the signature is valid, false otherwise
 */
export function verifyWebhookSignature(payload, signature, secret) {
  if (typeof signature !== "string" || !signature.startsWith("sha256=")) {
    return false;
  }

  const expected = computeWebhookSignature(payload, secret);

  // Ensure both buffers are the same length before comparing to keep the
  // comparison strictly timing-safe (timingSafeEqual throws on length mismatch).
  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");

  if (expectedBuf.length !== signatureBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, signatureBuf);
}
