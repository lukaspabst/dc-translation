import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs';
import os from 'os';
import Database from 'better-sqlite3';
import { MongoClient, MongoClientOptions } from 'mongodb';
import Redis from 'ioredis';

async function main() {
  const dbPath = path.resolve(__dirname, '../data.db');
  if (fs.existsSync(dbPath)) {
    const sqliteDb = new Database(dbPath);
    sqliteDb.exec(`
      DELETE FROM users;
      DELETE FROM live_threads;
      DELETE FROM user_muted_channels;
      DELETE FROM thread_focus;
      DELETE FROM user_channel_reads;
      DELETE FROM buffered_messages;
      DELETE FROM channel_buffered_messages;
    `);
    sqliteDb.close();
    console.log('SQLite user data purged successfully.');
  }

  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri && mongoUri.trim() !== '') {
    const options: MongoClientOptions = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
    };

    let tempCertPath: string | null = null;
    if (process.env.MONGODB_CERT_PEM && process.env.MONGODB_CERT_PEM.trim() !== '') {
      const raw = process.env.MONGODB_CERT_PEM.trim();
      const content = raw.includes('BEGIN CERTIFICATE')
        ? raw
        : Buffer.from(raw, 'base64').toString('utf8');
      tempCertPath = path.join(os.tmpdir(), `mongodb-cert-reset-${process.pid}.pem`);
      fs.writeFileSync(tempCertPath, content, { mode: 0o600 });
      options.tlsCertificateKeyFile = tempCertPath;
    } else if (process.env.MONGODB_CERT_PATH && fs.existsSync(process.env.MONGODB_CERT_PATH)) {
      options.tlsCertificateKeyFile = path.resolve(process.env.MONGODB_CERT_PATH);
    }

    const mongoClient = new MongoClient(mongoUri, options);
    try {
      await mongoClient.connect();
      const mongoDb = mongoClient.db(process.env.MONGODB_DB_NAME || 'dc_translation');

      const collections = [
        'users',
        'live_threads',
        'user_muted_channels',
        'user_channel_reads',
        'buffered_messages',
        'channel_buffered_messages',
        'thread_focus',
      ];

      for (const colName of collections) {
        try {
          const res = await mongoDb.collection(colName).deleteMany({});
          console.log(`MongoDB collection '${colName}' cleared: ${res.deletedCount} documents removed.`);
        } catch (colErr) {
          console.warn(`Could not clear collection '${colName}':`, colErr);
        }
      }
    } finally {
      await mongoClient.close();
      if (tempCertPath && fs.existsSync(tempCertPath)) {
        fs.unlinkSync(tempCertPath);
      }
    }
  }

  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const redisPassword = process.env.REDIS_PASSWORD;
  const redis = new Redis(redisUrl, {
    password: redisPassword || undefined,
    lazyConnect: true,
    connectTimeout: 2000,
  });

  try {
    await redis.connect();
    await redis.flushdb();
    console.log('Redis database flushed successfully.');
    redis.disconnect();
  } catch {
    console.log('Redis not reachable or not running locally; skipping.');
  }

  console.log('All user data has been completely reset.');
}

main().catch((err) => {
  console.error('Failed to reset user data:', err);
  process.exit(1);
});
