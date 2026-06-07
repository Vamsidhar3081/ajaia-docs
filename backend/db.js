const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data.db');
let db = null;

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled Document',
      content TEXT NOT NULL DEFAULT '',
      owner_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS document_shares (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      shared_with_id TEXT NOT NULL,
      permission TEXT NOT NULL DEFAULT 'view',
      created_at INTEGER DEFAULT (strftime('%s','now')),
      UNIQUE(document_id, shared_with_id)
    );
  `);

  // Seed demo users if not present
  const existing = dbGet('SELECT id FROM users WHERE email = ?', ['alice@demo.com']);
  if (!existing) {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const hash = bcrypt.hashSync('password123', 10);

    const users = [
      { id: uuidv4(), email: 'alice@demo.com', name: 'Alice Johnson' },
      { id: uuidv4(), email: 'bob@demo.com', name: 'Bob Smith' },
      { id: uuidv4(), email: 'carol@demo.com', name: 'Carol White' }
    ];

    for (const u of users) {
      db.run('INSERT INTO users (id, email, name, password) VALUES (?, ?, ?, ?)', [u.id, u.email, u.name, hash]);
    }

    const alice = dbGet('SELECT id FROM users WHERE email = ?', ['alice@demo.com']);
    const docId = uuidv4();
    db.run('INSERT INTO documents (id, title, content, owner_id) VALUES (?, ?, ?, ?)', [
      docId,
      'Welcome to Ajaia Docs',
      '<h1>Welcome to Ajaia Docs! 👋</h1><p>This is a <strong>collaborative document editor</strong> where you can:</p><ul><li>Create and edit rich-text documents</li><li>Upload .txt, .md, or .docx files</li><li>Share documents with other users</li></ul><p>Try editing this document or create a new one from the dashboard!</p>',
      alice.id
    ]);

    saveDB();
    console.log('✅ Demo users seeded: alice@demo.com, bob@demo.com, carol@demo.com (password: password123)');
  }

  console.log('✅ Database initialized');
}

// Helper: get one row
function dbGet(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

// Helper: get all rows
function dbAll(sql, params = []) {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

// Helper: run statement
function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDB();
}

module.exports = { initDB, dbGet, dbAll, dbRun, saveDB };
