import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';

let warnedMissingSecret = false;

function getEncryptionKey(): Buffer {
  const envSecret = process.env.ENCRYPTION_SECRET_KEY?.trim();
  if (!envSecret && !warnedMissingSecret) {
    warnedMissingSecret = true;
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[Security Warning] ENCRYPTION_SECRET_KEY is not set. Configure a 32-byte secret in .env for production deployments.'
      );
    }
  }
  const secret = envSecret || 'dc-translation-local-dev-fallback-key';
  return createHash('sha256').update(secret).digest();
}

export function getUserEncryptionKey(userId: string): Buffer {
  const masterKey = getEncryptionKey();
  return createHmac('sha256', masterKey).update(`user:${userId}`).digest();
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

export function encryptForUser(plaintext: string, userId: string): string {
  const key = getUserEncryptionKey(userId);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptForUser(ciphertext: string, userId: string): string {
  if (!ciphertext || !ciphertext.includes(':')) {
    return ciphertext;
  }

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    return ciphertext;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  try {
    const key = getUserEncryptionKey(userId);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('User decryption error, returning raw value:', error);
    return ciphertext;
  }
}

export function getChannelEncryptionKey(channelId: string): Buffer {
  const masterKey = getEncryptionKey();
  return createHmac('sha256', masterKey).update(`channel:${channelId}`).digest();
}

export function encryptForChannel(plaintext: string, channelId: string): string {
  const key = getChannelEncryptionKey(channelId);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptForChannel(ciphertext: string, channelId: string): string {
  if (!ciphertext || !ciphertext.includes(':')) {
    return ciphertext;
  }

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    return ciphertext;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  try {
    const key = getChannelEncryptionKey(channelId);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Channel decryption error, returning raw value:', error);
    return ciphertext;
  }
}
