import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET_KEY || 'journeylink-default-32-byte-master-key-change-in-prod!';
  return createHash('sha256').update(secret).digest();
}

export function encryptField(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptField(ciphertext: string): string {
  if (!ciphertext || !ciphertext.includes(':')) {
    return ciphertext;
  }

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    return ciphertext;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error, returning raw value:', error);
    return ciphertext;
  }
}
