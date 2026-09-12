/**
 * Sealed mail.
 *
 * Two agents can already pay each other. What they cannot do, on any of the
 * services this project looked at, is say something to each other that the
 * service carrying it cannot read. Sealing fixes that, and it costs nothing
 * extra to run: the recipient's public key is already on chain next to its
 * identity, so there is no key exchange to arrange and no directory to trust.
 *
 * Standard ECIES over secp256k1, which is the same curve the identity is keyed
 * to, so an agent needs one keypair rather than two:
 *
 *   ephemeral keypair -> ECDH with the recipient's published key
 *   -> HKDF-SHA256 -> AES-256-GCM
 *
 * The ephemeral key means two messages to the same recipient share no key
 * material, so compromising one reveals nothing about the other. This service
 * sees the ciphertext and the envelope; it never holds a recipient's private
 * key, so "we cannot read it" is a property of the construction rather than a
 * promise about our conduct.
 */
import crypto from "node:crypto";

const CURVE = "secp256k1";
const UNCOMPRESSED_PREFIX = 0x04;

/** Bytes in an uncompressed secp256k1 point, without the 0x04 prefix. */
export const PUBLIC_KEY_BYTES = 64;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

export interface SealedEnvelope {
  /** Ephemeral public key, hex, uncompressed with the 0x04 prefix. */
  ephemeralPublicKey: string;
  /** Base64 AES-GCM ciphertext. */
  ciphertext: string;
  /** Base64 nonce. */
  iv: string;
  /** Base64 authentication tag. */
  tag: string;
  algorithm: "ECIES-secp256k1-HKDF-SHA256-AES-256-GCM";
}

function withPrefix(key: Buffer): Buffer {
  if (key.length === PUBLIC_KEY_BYTES) return Buffer.concat([Buffer.of(UNCOMPRESSED_PREFIX), key]);
  if (key.length === PUBLIC_KEY_BYTES + 1 && key[0] === UNCOMPRESSED_PREFIX) return key;
  throw new Error(
    `A secp256k1 public key is ${PUBLIC_KEY_BYTES} bytes, or ${PUBLIC_KEY_BYTES + 1} with the 0x04 prefix. Got ${key.length}.`,
  );
}

function parseKey(hexOrBytes: string | Buffer): Buffer {
  const raw =
    typeof hexOrBytes === "string"
      ? Buffer.from(hexOrBytes.replace(/^0x/, ""), "hex")
      : hexOrBytes;
  return withPrefix(raw);
}

/**
 * Derives the symmetric key both sides arrive at independently.
 *
 * The ephemeral public key is mixed into the salt so the derived key is bound
 * to this exact exchange. Without it, a shared secret reused across messages
 * would derive the same AES key each time.
 */
function deriveKey(sharedSecret: Buffer, ephemeralPublicKey: Buffer): Buffer {
  return Buffer.from(
    crypto.hkdfSync("sha256", sharedSecret, ephemeralPublicKey, Buffer.from("warrant/sealed-mail/v1"), KEY_BYTES),
  );
}

/** Encrypts `plaintext` so only the holder of `recipientPublicKey` can read it. */
export function seal(recipientPublicKey: string | Buffer, plaintext: string): SealedEnvelope {
  const recipient = parseKey(recipientPublicKey);

  const ephemeral = crypto.createECDH(CURVE);
  ephemeral.generateKeys();
  const ephemeralPublicKey = ephemeral.getPublicKey();

  const shared = ephemeral.computeSecret(recipient);
  const key = deriveKey(shared, ephemeralPublicKey);

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  return {
    ephemeralPublicKey: `0x${ephemeralPublicKey.toString("hex")}`,
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    algorithm: "ECIES-secp256k1-HKDF-SHA256-AES-256-GCM",
  };
}

/**
 * Opens an envelope with the recipient's private key.
 *
 * Lives here rather than only in the agent so the format has one definition.
 * Two implementations of a wire format is how a sealed message becomes
 * permanently unreadable.
 */
export function unseal(recipientPrivateKey: string | Buffer, envelope: SealedEnvelope): string {
  const priv =
    typeof recipientPrivateKey === "string"
      ? Buffer.from(recipientPrivateKey.replace(/^0x/, ""), "hex")
      : recipientPrivateKey;

  const ecdh = crypto.createECDH(CURVE);
  ecdh.setPrivateKey(priv);

  const ephemeralPublicKey = parseKey(envelope.ephemeralPublicKey);
  const shared = ecdh.computeSecret(ephemeralPublicKey);
  const key = deriveKey(shared, ephemeralPublicKey);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** The public key to publish on chain for a given private key. */
export function publicKeyFor(privateKey: string | Buffer): string {
  const priv =
    typeof privateKey === "string" ? Buffer.from(privateKey.replace(/^0x/, ""), "hex") : privateKey;
  const ecdh = crypto.createECDH(CURVE);
  ecdh.setPrivateKey(priv);
  // Published without the prefix, because that is what the contract stores.
  return `0x${ecdh.getPublicKey().subarray(1).toString("hex")}`;
}
