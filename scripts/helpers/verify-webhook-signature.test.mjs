import { describe, it, expect } from "@jest/globals";
import { createHmac } from "node:crypto";
import {
  computeWebhookSignature,
  verifyWebhookSignature,
} from "./verify-webhook-signature.mjs";

/** Build the expected sha256 signature the same way GitHub does. */
function buildSignature(payload, secret) {
  const hmac = createHmac("sha256", secret);
  hmac.update(Buffer.from(payload, "utf8"));
  return `sha256=${hmac.digest("hex")}`;
}

describe("computeWebhookSignature", () => {
  it("returns a sha256= prefixed hex string", () => {
    const sig = computeWebhookSignature("hello", "secret");
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it("matches a reference signature computed independently", () => {
    const payload = JSON.stringify({ action: "push" });
    const secret = "my-webhook-secret";
    const expected = buildSignature(payload, secret);
    expect(computeWebhookSignature(payload, secret)).toBe(expected);
  });

  it("accepts a Buffer payload", () => {
    const payload = "binary payload";
    const secret = "s3cr3t";
    const sigFromString = computeWebhookSignature(payload, secret);
    const sigFromBuffer = computeWebhookSignature(
      Buffer.from(payload, "utf8"),
      secret,
    );
    expect(sigFromString).toBe(sigFromBuffer);
  });

  it("produces different signatures for different secrets", () => {
    const payload = "same payload";
    const sig1 = computeWebhookSignature(payload, "secret-1");
    const sig2 = computeWebhookSignature(payload, "secret-2");
    expect(sig1).not.toBe(sig2);
  });

  it("produces different signatures for different payloads", () => {
    const secret = "same-secret";
    const sig1 = computeWebhookSignature("payload-1", secret);
    const sig2 = computeWebhookSignature("payload-2", secret);
    expect(sig1).not.toBe(sig2);
  });
});

describe("verifyWebhookSignature", () => {
  const secret = "my-webhook-secret";
  const payload = JSON.stringify({ action: "push", ref: "refs/heads/main" });

  it("returns true for a valid signature", () => {
    const signature = buildSignature(payload, secret);
    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
  });

  it("returns false for a tampered payload", () => {
    const signature = buildSignature(payload, secret);
    const tampered = JSON.stringify({ action: "push", ref: "refs/heads/evil" });
    expect(verifyWebhookSignature(tampered, signature, secret)).toBe(false);
  });

  it("returns false for a wrong secret", () => {
    const signature = buildSignature(payload, secret);
    expect(verifyWebhookSignature(payload, signature, "wrong-secret")).toBe(
      false,
    );
  });

  it("returns false when signature header is missing (undefined)", () => {
    expect(verifyWebhookSignature(payload, undefined, secret)).toBe(false);
  });

  it("returns false when signature header is null", () => {
    expect(verifyWebhookSignature(payload, null, secret)).toBe(false);
  });

  it("returns false when signature header is an empty string", () => {
    expect(verifyWebhookSignature(payload, "", secret)).toBe(false);
  });

  it("returns false when signature header lacks the sha256= prefix", () => {
    const sig = buildSignature(payload, secret);
    const withoutPrefix = sig.replace("sha256=", "");
    expect(verifyWebhookSignature(payload, withoutPrefix, secret)).toBe(false);
  });

  it("returns false for a sha256= header with an incorrect hex value", () => {
    expect(verifyWebhookSignature(payload, "sha256=deadbeef", secret)).toBe(
      false,
    );
  });

  it("accepts a Buffer payload and returns true for valid signature", () => {
    const bufPayload = Buffer.from(payload, "utf8");
    const signature = buildSignature(payload, secret);
    expect(verifyWebhookSignature(bufPayload, signature, secret)).toBe(true);
  });

  it("accepts a Buffer payload and returns false for tampered signature", () => {
    const bufPayload = Buffer.from(payload, "utf8");
    const wrongSig = buildSignature("different content", secret);
    expect(verifyWebhookSignature(bufPayload, wrongSig, secret)).toBe(false);
  });
});
