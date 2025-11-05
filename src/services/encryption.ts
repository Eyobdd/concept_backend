/**
 * Encryption Service for Recording URLs
 * 
 * Uses AES-256-GCM encryption to secure recording URLs.
 * Each user has a unique encryption key derived from their user ID and a master secret.
 */

import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeBase64, decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

export interface EncryptionConfig {
  masterSecret: string; // Master secret for key derivation
}

/**
 * Service for encrypting and decrypting recording URLs
 */
export class EncryptionService {
  private masterSecret: string;

  constructor(config: EncryptionConfig) {
    this.masterSecret = config.masterSecret;
  }

  /**
   * Derives a user-specific encryption key from their user ID
   */
  private async deriveKey(userId: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(this.masterSecret + userId);

    // Hash to get consistent key material
    const hashBuffer = await crypto.subtle.digest("SHA-256", keyMaterial);

    // Import as AES-GCM key
    return await crypto.subtle.importKey(
      "raw",
      hashBuffer,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  /**
   * Encrypts a recording URL for a specific user
   * 
   * @param userId User ID to derive encryption key from
   * @param recordingUrl The URL to encrypt
   * @returns Base64-encoded encrypted data with IV prepended
   */
  async encryptRecordingUrl(userId: string, recordingUrl: string): Promise<string> {
    const key = await this.deriveKey(userId);
    const encoder = new TextEncoder();
    const data = encoder.encode(recordingUrl);

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    // Return as base64
    return encodeBase64(combined);
  }

  /**
   * Decrypts a recording URL for a specific user
   * 
   * @param userId User ID to derive decryption key from
   * @param encryptedData Base64-encoded encrypted data with IV prepended
   * @returns Decrypted recording URL
   */
  async decryptRecordingUrl(userId: string, encryptedData: string): Promise<string> {
    const key = await this.deriveKey(userId);

    // Decode from base64
    const combined = decodeBase64(encryptedData);

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encrypted,
    );

    // Decode to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }
}

/**
 * Mock encryption service for testing
 * Uses simple base64 encoding instead of real encryption
 */
export class MockEncryptionService {
  /**
   * Mock encrypt - just base64 encodes with a prefix
   */
  async encryptRecordingUrl(userId: string, recordingUrl: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${userId}:${recordingUrl}`);
    return `mock_encrypted_${encodeBase64(data)}`;
  }

  /**
   * Mock decrypt - reverses the mock encryption
   */
  async decryptRecordingUrl(userId: string, encryptedData: string): Promise<string> {
    if (!encryptedData.startsWith("mock_encrypted_")) {
      throw new Error("Invalid mock encrypted data");
    }

    const base64Data = encryptedData.substring("mock_encrypted_".length);
    const decoded = decodeBase64(base64Data);
    const decoder = new TextDecoder();
    const combined = decoder.decode(decoded);

    // Extract URL (format: userId:url)
    const parts = combined.split(":");
    if (parts.length < 2 || parts[0] !== userId) {
      throw new Error("Decryption failed: user ID mismatch");
    }

    return parts.slice(1).join(":"); // Rejoin in case URL contains colons
  }
}
