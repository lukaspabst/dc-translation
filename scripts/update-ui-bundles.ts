import dotenv from 'dotenv';
dotenv.config();

import { MongoClient, MongoClientOptions } from 'mongodb';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

async function updateUiBundles() {
  console.log('=== PURGING STALE UI BUNDLES IN MONGODB & SQLITE ===');
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    const options: MongoClientOptions = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
    };

    if (process.env.MONGODB_CERT_PEM && process.env.MONGODB_CERT_PEM.trim() !== '') {
      const raw = process.env.MONGODB_CERT_PEM.trim();
      const content = raw.includes('BEGIN CERTIFICATE')
        ? raw
        : Buffer.from(raw, 'base64').toString('utf8');
      const certPath = path.resolve(__dirname, 'temp-mongo-cert.pem');
      fs.writeFileSync(certPath, content, { mode: 0o600 });
      options.tlsCertificateKeyFile = certPath;
    } else if (process.env.MONGODB_CERT_PATH && fs.existsSync(process.env.MONGODB_CERT_PATH)) {
      options.tlsCertificateKeyFile = path.resolve(process.env.MONGODB_CERT_PATH);
    }

    const client = new MongoClient(mongoUri, options);
    try {
      await client.connect();
      const db = client.db(process.env.MONGODB_DB_NAME || 'dc_translation');
      const bundlesCol = db.collection('ui_bundles');
      const res = await bundlesCol.deleteMany({});
      console.log(`Cleared stale MongoDB ui_bundles: ${res.deletedCount} documents deleted.`);
    } catch (err) {
      console.error('MongoDB error:', err);
    } finally {
      await client.close();
      const certPath = path.resolve(__dirname, 'temp-mongo-cert.pem');
      if (fs.existsSync(certPath)) fs.unlinkSync(certPath);
    }
  }

  const sqliteDb = new Database(path.resolve(__dirname, '../data.db'));
  try {
    const res = sqliteDb.exec('DELETE FROM ui_bundles;');
    console.log('Cleared SQLite ui_bundles.');
  } catch (err) {
    console.error('SQLite error:', err);
  }
}

updateUiBundles().catch(console.error);
