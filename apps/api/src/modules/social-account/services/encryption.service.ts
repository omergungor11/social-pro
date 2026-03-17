import { Injectable, InternalServerErrorException } from "@nestjs/common";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

/**
 * AES-256-GCM encryption service for securing OAuth tokens at rest.
 *
 * Stored format (hex-encoded, colon-separated):
 *   <iv>:<authTag>:<ciphertext>
 *
 * The ENCRYPTION_KEY env var is used as the key material; it is derived to
 * exactly 32 bytes via scrypt so callers are not forced to supply a hex key.
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = "aes-256-gcm" as const;
  private readonly ivLength = 12; // 96-bit IV recommended for GCM
  private readonly saltLength = 16;

  /**
   * Derives a 32-byte key from the raw ENCRYPTION_KEY env variable.
   * The salt is embedded in the stored ciphertext so decryption is
   * self-contained.
   */
  private deriveKey(salt: Buffer): Buffer {
    const raw = process.env["ENCRYPTION_KEY"];
    if (!raw) {
      throw new InternalServerErrorException(
        "ENCRYPTION_KEY environment variable is not set"
      );
    }
    return scryptSync(raw, salt, 32) as Buffer;
  }

  /**
   * Encrypts a plaintext string.
   * @returns Hex-encoded string in the format: salt:iv:authTag:ciphertext
   */
  encrypt(text: string): string {
    const salt = randomBytes(this.saltLength);
    const iv = randomBytes(this.ivLength);
    const key = this.deriveKey(salt);

    const cipher = createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(text, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      salt.toString("hex"),
      iv.toString("hex"),
      authTag.toString("hex"),
      encrypted.toString("hex"),
    ].join(":");
  }

  /**
   * Decrypts a string previously produced by {@link encrypt}.
   * @throws InternalServerErrorException when the format is invalid or
   *         decryption fails (tampered ciphertext / wrong key).
   */
  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(":");

    if (parts.length !== 4) {
      throw new InternalServerErrorException(
        "Invalid encrypted token format: expected salt:iv:authTag:ciphertext"
      );
    }

    const [saltHex, ivHex, authTagHex, ciphertextHex] = parts as [
      string,
      string,
      string,
      string,
    ];

    try {
      const salt = Buffer.from(saltHex, "hex");
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");
      const ciphertext = Buffer.from(ciphertextHex, "hex");
      const key = this.deriveKey(salt);

      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      return (
        decipher.update(ciphertext).toString("utf8") +
        decipher.final().toString("utf8")
      );
    } catch {
      throw new InternalServerErrorException(
        "Token decryption failed: data may be tampered or key is incorrect"
      );
    }
  }
}
