const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { initDatabase, getDatabaseType, getDatabaseClient } = require('./db');

const USERS_FILE = path.join(__dirname, '../data/users.json');
const OWNER_USERNAME = process.env.ADMIN_USERNAME || 'Spidey';
const OWNER_TELEGRAM_ID = process.env.OWNER_TELEGRAM_ID || '5216415651';
const OWNER_PASSWORD_HASH =
  process.env.ADMIN_PASSWORD_HASH ||
  '$2b$10$xxh1TMl8DSYCW5nbg10t..bGfnC/vB/dtLiq7QwbGHth8ShUtp1aG';

// Local storage helper
function readLocalUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch {
    // ignore
  }
  return [];
}

function writeLocalUsers(users) {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('[USER SERVICE] Local write error:', err.message);
  }
}

/**
 * Format DB row / doc into standardized User object
 */
function normalizeUserDoc(doc) {
  if (!doc) return null;
  return {
    id: String(doc.id || doc._id || ''),
    username: String(doc.username || ''),
    usernameNormalized: String(doc.username_normalized || doc.usernameNormalized || (doc.username || '').toLowerCase()),
    displayName: doc.display_name || doc.displayName || doc.username || '',
    email: doc.email || null,
    emailNormalized: doc.email_normalized || doc.emailNormalized || (doc.email ? doc.email.toLowerCase() : null),
    passwordHash: doc.password_hash || doc.passwordHash || '',
    role: (doc.role || 'USER').toUpperCase(),
    telegramId: doc.telegram_id || doc.telegramId ? String(doc.telegram_id || doc.telegramId) : null,
    photoUrl: doc.photo_url || doc.photoUrl || '',
    status: doc.status || 'active',
    createdAt: Number(doc.created_at || doc.createdAt || Date.now()),
    updatedAt: Number(doc.updated_at || doc.updatedAt || Date.now()),
    lastLoginAt: doc.last_login_at || doc.lastLoginAt ? Number(doc.last_login_at || doc.lastLoginAt) : null,
  };
}

/**
 * Sanitize User object for safe API responses (never exposes passwordHash)
 */
function toSafeUser(user) {
  if (!user) return null;
  const isOwner =
    user.role === 'OWNER' ||
    user.usernameNormalized === OWNER_USERNAME.toLowerCase() ||
    String(user.telegramId) === OWNER_TELEGRAM_ID;
  const isAdmin = isOwner || user.role === 'ADMIN';

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    email: user.email,
    role: isOwner ? 'OWNER' : (isAdmin ? 'ADMIN' : user.role),
    isAdmin,
    isOwner,
    telegramId: user.telegramId,
    photoUrl: user.photoUrl,
    status: user.status,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

/**
 * Seed Owner Account & Migrate legacy users idempotently
 */
async function seedOwnerAndMigrate() {
  await initDatabase();
  const dbType = getDatabaseType();
  const client = getDatabaseClient();

  // 1. Check if Owner already exists
  const owner = await findUserByUsername(OWNER_USERNAME);
  if (!owner) {
    console.log(`[USER SERVICE] Seeding persistent Owner account (${OWNER_USERNAME})...`);
    const ownerData = {
      id: 'owner_spidey',
      username: OWNER_USERNAME,
      usernameNormalized: OWNER_USERNAME.toLowerCase(),
      displayName: 'Spidey (Owner)',
      passwordHash: OWNER_PASSWORD_HASH,
      role: 'OWNER',
      telegramId: OWNER_TELEGRAM_ID,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (dbType === 'mongodb') {
      await client.db.collection('users').updateOne(
        { usernameNormalized: OWNER_USERNAME.toLowerCase() },
        { $setOnInsert: ownerData },
        { upsert: true }
      );
    } else if (dbType === 'postgres') {
      await client.query(`
        INSERT INTO users (id, username, username_normalized, display_name, password_hash, role, telegram_id, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (username_normalized) DO NOTHING;
      `, [ownerData.id, ownerData.username, ownerData.usernameNormalized, ownerData.displayName, ownerData.passwordHash, ownerData.role, ownerData.telegramId, ownerData.status, ownerData.createdAt, ownerData.updatedAt]);
    } else {
      const local = readLocalUsers();
      if (!local.some(u => u.username.toLowerCase() === OWNER_USERNAME.toLowerCase())) {
        local.unshift(ownerData);
        writeLocalUsers(local);
      }
    }
  }

  // 2. Migrate any existing users from users.json into persistent database if connected
  if (dbType === 'mongodb' || dbType === 'postgres') {
    const local = readLocalUsers();
    for (const u of local) {
      if (!u.username) continue;
      const existing = await findUserByUsername(u.username);
      if (!existing) {
        const uDoc = {
          id: u.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          username: u.username,
          usernameNormalized: u.username.toLowerCase(),
          displayName: u.displayName || u.username,
          passwordHash: u.passwordHash || (u.password ? await bcrypt.hash(u.password, 10) : ''),
          role: u.role || 'USER',
          telegramId: u.telegramId ? String(u.telegramId) : null,
          photoUrl: u.photoUrl || '',
          status: u.status || 'active',
          createdAt: u.createdAt || Date.now(),
          updatedAt: Date.now(),
        };

        if (dbType === 'mongodb') {
          await client.db.collection('users').insertOne(uDoc).catch(() => {});
        } else if (dbType === 'postgres') {
          await client.query(`
            INSERT INTO users (id, username, username_normalized, display_name, password_hash, role, telegram_id, photo_url, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (username_normalized) DO NOTHING;
          `, [uDoc.id, uDoc.username, uDoc.usernameNormalized, uDoc.displayName, uDoc.passwordHash, uDoc.role, uDoc.telegramId, uDoc.photoUrl, uDoc.status, uDoc.createdAt, uDoc.updatedAt]).catch(() => {});
        }
      }
    }
  }
}

/**
 * Find User By Username (Normalized)
 */
async function findUserByUsername(username) {
  if (!username) return null;
  await initDatabase();
  const dbType = getDatabaseType();
  const client = getDatabaseClient();
  const norm = String(username).trim().toLowerCase();

  if (dbType === 'mongodb') {
    const doc = await client.db.collection('users').findOne({ usernameNormalized: norm });
    return normalizeUserDoc(doc);
  }

  if (dbType === 'postgres') {
    const res = await client.query('SELECT * FROM users WHERE username_normalized = $1 LIMIT 1', [norm]);
    return normalizeUserDoc(res.rows[0]);
  }

  const local = readLocalUsers();
  const found = local.find(u => (u.usernameNormalized || u.username || '').toLowerCase() === norm);
  return normalizeUserDoc(found);
}

/**
 * Find User By Telegram ID
 */
async function findUserByTelegramId(telegramId) {
  if (!telegramId) return null;
  await initDatabase();
  const dbType = getDatabaseType();
  const client = getDatabaseClient();
  const tgIdStr = String(telegramId).trim();

  if (dbType === 'mongodb') {
    const doc = await client.db.collection('users').findOne({ telegramId: tgIdStr });
    return normalizeUserDoc(doc);
  }

  if (dbType === 'postgres') {
    const res = await client.query('SELECT * FROM users WHERE telegram_id = $1 LIMIT 1', [tgIdStr]);
    return normalizeUserDoc(res.rows[0]);
  }

  const local = readLocalUsers();
  const found = local.find(u => String(u.telegramId) === tgIdStr);
  return normalizeUserDoc(found);
}

/**
 * Find User By Unique ID
 */
async function findUserById(id) {
  if (!id) return null;
  await initDatabase();
  const dbType = getDatabaseType();
  const client = getDatabaseClient();
  const idStr = String(id).trim();

  if (dbType === 'mongodb') {
    const doc = await client.db.collection('users').findOne({ id: idStr });
    return normalizeUserDoc(doc);
  }

  if (dbType === 'postgres') {
    const res = await client.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [idStr]);
    return normalizeUserDoc(res.rows[0]);
  }

  const local = readLocalUsers();
  const found = local.find(u => String(u.id) === idStr);
  return normalizeUserDoc(found);
}

/**
 * Create New User Permanently
 */
async function createUser({ username, password, displayName, email, role = 'USER', telegramId = null, photoUrl = '' }) {
  if (!username || (!password && !telegramId)) {
    throw new Error('Username and credentials are required');
  }

  const normUser = String(username).trim().toLowerCase();
  const existing = await findUserByUsername(normUser);
  if (existing) {
    throw new Error('Username is already taken');
  }

  let passwordHash = '';
  if (password) {
    passwordHash = await bcrypt.hash(String(password).trim(), 10);
  }

  const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const now = Date.now();

  const userDoc = {
    id,
    username: String(username).trim(),
    usernameNormalized: normUser,
    displayName: displayName ? String(displayName).trim() : String(username).trim(),
    passwordHash,
    role: role.toUpperCase(),
    photoUrl: photoUrl || '',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };

  if (email && String(email).trim()) {
    userDoc.email = String(email).trim();
    userDoc.emailNormalized = String(email).trim().toLowerCase();
  }
  if (telegramId && String(telegramId).trim()) {
    userDoc.telegramId = String(telegramId).trim();
  }

  await initDatabase();
  const dbType = getDatabaseType();
  const client = getDatabaseClient();

  if (dbType === 'mongodb') {
    await client.db.collection('users').insertOne(userDoc);
  } else if (dbType === 'postgres') {
    await client.query(`
      INSERT INTO users (id, username, username_normalized, display_name, email, email_normalized, password_hash, role, telegram_id, photo_url, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [userDoc.id, userDoc.username, userDoc.usernameNormalized, userDoc.displayName, userDoc.email, userDoc.emailNormalized, userDoc.passwordHash, userDoc.role, userDoc.telegramId, userDoc.photoUrl, userDoc.status, userDoc.createdAt, userDoc.updatedAt]);
  } else {
    const local = readLocalUsers();
    local.push(userDoc);
    writeLocalUsers(local);
  }

  console.log(`[USER SERVICE] User created permanently: ${userDoc.username} (${userDoc.id})`);
  return toSafeUser(userDoc);
}

/**
 * Verify user password and update lastLoginAt
 */
async function authenticateUser(username, password) {
  if (!username || !password) return null;
  const normUser = String(username).trim().toLowerCase();
  const rawPass = String(password).trim();

  // Instant guarantee for owner credentials
  const isOwnerMatch =
    normUser === OWNER_USERNAME.toLowerCase() ||
    normUser === 'spidey' ||
    normUser === 'admin' ||
    normUser === 'owner';

  if (isOwnerMatch && (rawPass === 'MS710924' || rawPass === 'ms710924' || (process.env.ADMIN_PASSWORD && rawPass === process.env.ADMIN_PASSWORD.trim()))) {
    let ownerUser = await findUserByUsername(OWNER_USERNAME).catch(() => null);
    if (!ownerUser) {
      ownerUser = {
        id: 'owner_spidey',
        username: OWNER_USERNAME,
        displayName: 'Spidey (Owner)',
        role: 'OWNER',
        isAdmin: true,
        isOwner: true,
        telegramId: OWNER_TELEGRAM_ID,
        status: 'active',
      };
    }
    return toSafeUser(ownerUser);
  }

  const user = await findUserByUsername(normUser);
  if (!user) return null;

  if (user.status === 'disabled') {
    throw new Error('Account has been deactivated. Please contact an administrator.');
  }

  let isValid = false;
  if (user.role === 'OWNER' && (rawPass === 'MS710924' || rawPass === 'ms710924' || (process.env.ADMIN_PASSWORD && rawPass === process.env.ADMIN_PASSWORD.trim()))) {
    isValid = true;
  } else if (user.passwordHash) {
    isValid = await bcrypt.compare(rawPass, user.passwordHash);
  }

  if (!isValid) return null;

  // Update last login in background
  updateUser(user.id, { lastLoginAt: Date.now() }).catch(() => {});

  return toSafeUser(user);
}

/**
 * Update user record
 */
async function updateUser(id, updates) {
  if (!id) return null;
  await initDatabase();
  const dbType = getDatabaseType();
  const client = getDatabaseClient();
  const idStr = String(id).trim();

  const now = Date.now();

  if (dbType === 'mongodb') {
    const fields = { ...updates, updatedAt: now };
    if (fields.username) fields.usernameNormalized = fields.username.toLowerCase();
    await client.db.collection('users').updateOne({ id: idStr }, { $set: fields });
  } else if (dbType === 'postgres') {
    const setClauses = [];
    const values = [idStr];
    let idx = 2;

    if (updates.displayName !== undefined) { setClauses.push(`display_name = $${idx++}`); values.push(updates.displayName); }
    if (updates.status !== undefined) { setClauses.push(`status = $${idx++}`); values.push(updates.status); }
    if (updates.role !== undefined) { setClauses.push(`role = $${idx++}`); values.push(updates.role); }
    if (updates.passwordHash !== undefined) { setClauses.push(`password_hash = $${idx++}`); values.push(updates.passwordHash); }
    if (updates.lastLoginAt !== undefined) { setClauses.push(`last_login_at = $${idx++}`); values.push(updates.lastLoginAt); }
    if (updates.telegramId !== undefined) { setClauses.push(`telegram_id = $${idx++}`); values.push(updates.telegramId); }
    if (updates.photoUrl !== undefined) { setClauses.push(`photo_url = $${idx++}`); values.push(updates.photoUrl); }

    setClauses.push(`updated_at = $${idx++}`);
    values.push(now);

    if (setClauses.length > 0) {
      await client.query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = $1`, values);
    }
  } else {
    const local = readLocalUsers();
    const uIdx = local.findIndex(u => String(u.id) === idStr);
    if (uIdx >= 0) {
      local[uIdx] = { ...local[uIdx], ...updates, updatedAt: now };
      writeLocalUsers(local);
    }
  }

  return await findUserById(idStr);
}

/**
 * Reset User Password
 */
async function resetUserPassword(id, newPassword) {
  if (!id || !newPassword) throw new Error('ID and new password required');
  const passwordHash = await bcrypt.hash(String(newPassword).trim(), 10);
  await updateUser(id, { passwordHash });
  return true;
}

/**
 * Delete User
 */
async function deleteUser(id) {
  if (!id) return false;
  const user = await findUserById(id);
  if (user && user.role === 'OWNER') {
    throw new Error('Cannot delete system owner account');
  }

  await initDatabase();
  const dbType = getDatabaseType();
  const client = getDatabaseClient();
  const idStr = String(id).trim();

  if (dbType === 'mongodb') {
    await client.db.collection('users').deleteOne({ id: idStr });
  } else if (dbType === 'postgres') {
    await client.query('DELETE FROM users WHERE id = $1', [idStr]);
  } else {
    let local = readLocalUsers();
    local = local.filter(u => String(u.id) !== idStr);
    writeLocalUsers(local);
  }

  return true;
}

/**
 * Get All Users (for Admin Panel)
 */
async function getAllUsers() {
  await initDatabase();
  const dbType = getDatabaseType();
  const client = getDatabaseClient();

  let list = [];
  if (dbType === 'mongodb') {
    const docs = await client.db.collection('users').find({}).toArray();
    list = docs.map(normalizeUserDoc);
  } else if (dbType === 'postgres') {
    const res = await client.query('SELECT * FROM users ORDER BY created_at DESC');
    list = res.rows.map(normalizeUserDoc);
  } else {
    list = readLocalUsers().map(normalizeUserDoc);
  }

  return list.map(toSafeUser);
}

module.exports = {
  seedOwnerAndMigrate,
  findUserByUsername,
  findUserByTelegramId,
  findUserById,
  createUser,
  authenticateUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  getAllUsers,
  toSafeUser,
};
