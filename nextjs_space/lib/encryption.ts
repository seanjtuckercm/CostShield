/**
 * AES-256-GCM Encryption/Decryption for OpenAI API Keys
 * Implements authenticated encryption for secure key storage
 * Reference: Section 2.1 of COSTSHIELD_CLOUD_REQUIREMENTS.md
 */

import crypto from 'crypto';

export class EncryptionService {
  private masterKey: Buffer;

  constructor() {
    const keyString = process.env.ENCRYPTION_MASTER_KEY;
    
    if (!keyString) {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable is required');
    }

    // Master key should be 32 bytes for AES-256
    // If provided as hex string, convert to buffer
    // If provided as plain text, hash it to 32 bytes
    if (keyString.length === 64) {
      // Assume hex string (64 chars = 32 bytes)
      this.masterKey = Buffer.from(keyString, 'hex');
    } else {
      // Hash to 32 bytes
      this.masterKey = crypto.createHash('sha256').update(keyString).digest();
    }

    if (this.masterKey.length !== 32) {
      throw new Error('ENCRYPTION_MASTER_KEY must be 32 bytes (64 hex characters)');
    }
  }

  /**
   * Encrypt an API key
   * Returns: IV:AuthTag:EncryptedData (all hex encoded)
   */
  encrypt(apiKey: string): string {
    // Generate random IV (12 bytes for GCM)
    const iv = crypto.randomBytes(12);
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    
    // Encrypt
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Return IV + authTag + encrypted (all hex encoded)
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt an encrypted API key
   * Input: IV:AuthTag:EncryptedData (all hex encoded)
   */
  decrypt(encryptedData: string): string {
    // Split the stored data
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Singleton instance
let encryptionInstance: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!encryptionInstance) {
    encryptionInstance = new EncryptionService();
  }
  return encryptionInstance;
}
