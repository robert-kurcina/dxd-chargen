import { realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { openDatabase } from '../src/server/db/connection.ts';
import { createLocalMailStore } from '../src/server/auth/local-mail-store.ts';

if (process.env.NODE_ENV === 'production' || process.env.DXD_STORAGE_MODE !== 'accounts') throw new Error('The local auth inbox is available only in explicit development accounts mode.');
if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Run this command in a private interactive terminal; it prints verification/reset links.');
const configuredDir = process.env.DXD_DATA_DIR;
const secret = process.env.DXD_AUTH_SECRET;
if (!configuredDir || !path.isAbsolute(configuredDir) || !secret || secret.length < 32) throw new Error('Local account configuration is incomplete.');
const dataDir = realpathSync(configuredDir);
if ((statSync(dataDir).mode & 0o077) !== 0) throw new Error('Local account data directory permissions are unsafe.');
const filename = path.join(dataDir, 'dxd.sqlite');
if (realpathSync(filename) !== filename || (statSync(filename).mode & 0o077) !== 0) throw new Error('Local account database permissions are unsafe.');
const connection = openDatabase(filename);
try {
  const inbox = createLocalMailStore(connection, secret);
  const messages = inbox.pending();
  if (!messages.length) console.log('No pending local account messages.');
  for (const { id, mail } of messages) {
    console.log(`\n${mail.kind} (${id})\nTo: ${mail.to}\n${mail.url}\n`);
  }
} finally {
  connection.close();
}
