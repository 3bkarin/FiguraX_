import argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { getAllRows, findRowById, updateRow, appendRow, invalidateCache, SHEET_NAMES } from './sheets.service.js';
import { USER_ROLES, PERMISSIONS, ADMIN_MAHROUS_EMAIL, ADMIN_MAHROUS_ID } from '../config/constants.js';
import { env } from '../config/env.js';

export async function hashPassword(password) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });
}

export async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export async function getUserByUsername(username) {
  const users = await getAllRows(SHEET_NAMES.USERS);
  return users.find(u =>
    u.row.Username.toLowerCase().trim() === username.toLowerCase().trim() && u.row.Active !== 'false'
  );
}

export async function getUserByEmail(email) {
  const users = await getAllRows(SHEET_NAMES.USERS);
  return users.find(u =>
    u.row.Email.toLowerCase().trim() === email.toLowerCase().trim() && u.row.Active !== 'false'
  );
}

export async function getUserById(userId) {
  const users = await getAllRows(SHEET_NAMES.USERS);
  return users.find(u => String(u.row.ID).trim() === String(userId).trim());
}

export async function authenticateUser(username, password) {
  const user = await getUserByUsername(username);
  if (!user) {
    return { success: false, message: 'Invalid username or password' };
  }

  const isValid = await verifyPassword(user.row.PasswordHash, password);
  if (!isValid) {
    return { success: false, message: 'Invalid username or password' };
  }

  const isMahrous = user.row.Email.toLowerCase() === env.admin.mahrousEmail.toLowerCase() ||
                    String(user.row.ID).trim() === env.admin.mahrousId;

  const permissions = String(user.row.Permissions || '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);
  const role = user.row.Role || USER_ROLES.ADMIN;

  if (isMahrous) {
    for (const permission of [PERMISSIONS.FINANCE_TRANSACTION_EDIT, PERMISSIONS.PRIVATE_FILE_ACCESS]) {
      if (!permissions.includes(permission)) permissions.push(permission);
    }
  }

  return {
    success: true,
    user: {
      id: user.row.ID,
      username: user.row.Username,
      email: user.row.Email,
      role,
      permissions,
      isMahrous,
    },
  };
}

export async function createUser(userData) {
  const existing = await getUserByUsername(userData.username);
  if (existing) {
    throw new Error('Username already exists');
  }

  const emailExists = await getUserByEmail(userData.email);
  if (emailExists) {
    throw new Error('Email already exists');
  }

  const passwordHash = await hashPassword(userData.password);
  const id = `USR-${Date.now().toString(36).toUpperCase()}-${randomUUID().replace(/-/g, '').substring(0, 6).toUpperCase()}`;
  const now = new Date().toISOString();

  const isMahrous = userData.email.toLowerCase() === env.admin.mahrousEmail.toLowerCase();
  const role = isMahrous ? USER_ROLES.FINANCE_ADMIN : USER_ROLES.ADMIN;
  const permissions = isMahrous ? [PERMISSIONS.FINANCE_TRANSACTION_EDIT, PERMISSIONS.PRIVATE_FILE_ACCESS] : [];

  await appendRow(SHEET_NAMES.USERS, [
    id,
    userData.username,
    passwordHash,
    userData.email,
    role,
    permissions.join(','),
    'true',
    now,
    now,
  ]);

  return { id, username: userData.username, email: userData.email, role, permissions };
}

export async function migratePlaintextPasswords() {
  const users = await getAllRows(SHEET_NAMES.USERS);
  let migrated = 0;

  for (const user of users) {
    const password = user.row.PasswordHash;
    if (password && !password.startsWith('$argon2')) {
      const hash = await hashPassword(password);
      const headers = user.headers;
      const hashIndex = headers.indexOf('PasswordHash');
      if (hashIndex !== -1) {
        const newRow = [...Object.values(user.row)];
        newRow[hashIndex] = hash;
        await updateRow(SHEET_NAMES.USERS, user.rowIndex, newRow);
        migrated++;
      }
    }
  }

  invalidateCache(SHEET_NAMES.USERS);
  return { migrated };
}

export async function updateUserPassword(userId, newPassword) {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');

  const hash = await hashPassword(newPassword);
  const headers = user.headers;
  const hashIndex = headers.indexOf('PasswordHash');
  if (hashIndex !== -1) {
    const newRow = [...Object.values(user.row)];
    newRow[hashIndex] = hash;
    newRow[headers.indexOf('UpdatedAt')] = new Date().toISOString();
    await updateRow(SHEET_NAMES.USERS, user.rowIndex, newRow);
  }
}

export function hasPermission(user, permission) {
  if (!user) return false;
  if (permission === PERMISSIONS.FINANCE_TRANSACTION_EDIT) return user?.isMahrous === true;
  return user.permissions?.includes(permission) === true;
}

export function isFinanceAdmin(user) {
  // Strictly check against configured Mahrous identity
  return user?.isMahrous === true;
}