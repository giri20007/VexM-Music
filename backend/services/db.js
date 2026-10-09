const path = require('path');
const fs = require('fs');

let dbClient = null;
let dbType = 'none'; // 'mongodb' | 'postgres' | 'local'
let isInitialized = false;

const DEFAULT_MONGODB_URI =
  'mongodb+srv://sriram23550s_db_user:11nBmzgYSZQF9EHV@cluster0.wxamkiv.mongodb.net/musicplayer?retryWrites=true&w=majority';

const DB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.POSTGRES_URL || DEFAULT_MONGODB_URI;

/**
 * Initialize persistent database connection
 */
async function initDatabase() {
  if (isInitialized) return { dbType, client: dbClient };

  const uri = (process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.POSTGRES_URL || DEFAULT_MONGODB_URI).trim();

  // 1. Check for MongoDB URI
  if (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')) {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });

      await client.connect();
      const db = client.db();
      dbClient = { client, db };
      dbType = 'mongodb';
      isInitialized = true;

      // Ensure indexes with partialFilterExpression to allow multiple non-telegram users
      const usersCol = db.collection('users');
      await usersCol.createIndex({ usernameNormalized: 1 }, { unique: true }).catch(() => {});
      try {
        await usersCol.dropIndex('telegramId_1').catch(() => {});
      } catch {}
      await usersCol.createIndex(
        { telegramId: 1 },
        { unique: true, partialFilterExpression: { telegramId: { $type: 'string' } } }
      ).catch(() => {});
      await usersCol.createIndex(
        { emailNormalized: 1 },
        { unique: true, partialFilterExpression: { emailNormalized: { $type: 'string' } } }
      ).catch(() => {});

      console.log('✅ [DATABASE] Connected to MongoDB Atlas permanently.');
      return { dbType, client: dbClient };
    } catch (err) {
      console.error('❌ [DATABASE ERROR] Failed to connect to MongoDB:', err.message);
    }
  }

  // 2. Check for PostgreSQL URI (Supabase, Neon, Render Postgres)
  if (uri.startsWith('postgres://') || uri.startsWith('postgresql://')) {
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: uri,
        ssl: uri.includes('localhost') ? false : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Test connection & initialize table schema
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            username_normalized VARCHAR(255) UNIQUE NOT NULL,
            display_name VARCHAR(255),
            email VARCHAR(255),
            email_normalized VARCHAR(255),
            password_hash TEXT,
            role VARCHAR(50) DEFAULT 'USER',
            telegram_id VARCHAR(255) UNIQUE,
            photo_url TEXT,
            status VARCHAR(50) DEFAULT 'active',
            created_at BIGINT,
            updated_at BIGINT,
            last_login_at BIGINT
          );
        `);
      } finally {
        client.release();
      }

      dbClient = pool;
      dbType = 'postgres';
      isInitialized = true;

      console.log('✅ [DATABASE] Connected to PostgreSQL permanently.');
      return { dbType, client: dbClient };
    } catch (err) {
      console.error('❌ [DATABASE ERROR] Failed to connect to PostgreSQL:', err.message);
    }
  }

  // 3. Fallback Local Storage Mode
  dbType = 'local';
  isInitialized = true;
  console.log('⚠️ [DATABASE NOTICE] Running in local persistent storage mode.');
  console.log('👉 Tip: Set MONGODB_URI or DATABASE_URL in Render / Vercel to connect to an external persistent cloud database.');

  return { dbType, client: null };
}

function getDatabaseType() {
  return dbType;
}

function getDatabaseClient() {
  return dbClient;
}

module.exports = {
  initDatabase,
  getDatabaseType,
  getDatabaseClient,
};
