import {
  appendRow,
  updateRow,
  invalidateCache,
  getAllRows,
  deleteRow,
  SHEET_NAMES
} from './sheets.service.js';

import { v4 as uuidv4 } from 'uuid';

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export async function createSession(user) {
  const sessionId = uuidv4();
  const key = `session:${sessionId}`;
  const expiresAt = new Date(Date.now() + SESSION_TTL);

  await appendRow(SHEET_NAMES.SESSIONS, [
    key,
    JSON.stringify({
      user,
      createdAt: new Date().toISOString()
    }),
    new Date().toISOString(),
    expiresAt.toISOString(),
  ]);

  invalidateCache(SHEET_NAMES.SESSIONS);

  return sessionId;
}

export async function getSession(sessionId) {
  const rows = await getAllRows(SHEET_NAMES.SESSIONS);

  const key = `session:${sessionId}`;

  const record = rows.find(r => r.row.Key === key);

  if (record) {
    const expiresAt = new Date(record.row.ExpiresAt).getTime();

    if (Date.now() < expiresAt) {
      try {
        return JSON.parse(record.row.Response);
      } catch {
        return null;
      }
    } else {
      await deleteSession(sessionId);
    }
  }

  return null;
}

export async function deleteSession(sessionId) {
  const rows = await getAllRows(SHEET_NAMES.SESSIONS);

  const key = `session:${sessionId}`;

  const record = rows.find(r => r.row.Key === key);

  if (record) {
    await deleteRow(
      SHEET_NAMES.SESSIONS,
      record.rowIndex
    );
  }
}

export async function extendSession(sessionId) {
  const session = await getSession(sessionId);

  if (!session) return false;

  const rows = await getAllRows(SHEET_NAMES.SESSIONS);

  const key = `session:${sessionId}`;

  const record = rows.find(r => r.row.Key === key);

  if (!record) return false;

  const expiresAt = new Date(Date.now() + SESSION_TTL);

  await updateRow(
    SHEET_NAMES.SESSIONS,
    record.rowIndex,
    [
      key,
      JSON.stringify({
        ...session,
        user: session.user,
        extendedAt: new Date().toISOString()
      }),
      new Date().toISOString(),
      expiresAt.toISOString(),
    ]
  );

  invalidateCache(SHEET_NAMES.SESSIONS);

  return true;
}