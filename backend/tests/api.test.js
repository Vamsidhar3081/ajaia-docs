// Simple integration tests for the API
// Run with: node tests/api.test.js

const http = require('http');

const BASE = 'http://127.0.0.1:3001/api';
let token = '';
let docId = '';
let passed = 0;
let failed = 0;

function request(method, path, body, authToken) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      }
    };
    const req = http.request(options, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function run() {
  console.log('\n🧪 Ajaia Docs API Tests\n');

  // Health
  console.log('📋 Health Check');
  const health = await request('GET', '/health');
  assert('Server is up', health.status === 200);

  // Auth
  console.log('\n📋 Auth Tests');
  const login = await request('POST', '/auth/login', { email: 'alice@demo.com', password: 'password123' });
  assert('Login with valid credentials', login.status === 200 && login.body.token);
  token = login.body.token;

  const badLogin = await request('POST', '/auth/login', { email: 'alice@demo.com', password: 'wrong' });
  assert('Login with invalid credentials fails', badLogin.status === 401);

  // Documents
  console.log('\n📋 Document Tests');
  const docs = await request('GET', '/documents', null, token);
  assert('Get documents returns owned/shared', docs.status === 200 && docs.body.owned);

  const created = await request('POST', '/documents', { title: 'Test Doc', content: '<p>Hello</p>' }, token);
  assert('Create document', created.status === 201 && created.body.id);
  docId = created.body.id;

  const updated = await request('PUT', `/documents/${docId}`, { title: 'Updated Title', content: '<p>Updated</p>' }, token);
  assert('Update document', updated.status === 200 && updated.body.title === 'Updated Title');

  const getDoc = await request('GET', `/documents/${docId}`, null, token);
  assert('Get single document', getDoc.status === 200 && getDoc.body.id === docId);

  // Sharing
  console.log('\n📋 Sharing Tests');
  const share = await request('POST', '/shares', { document_id: docId, shared_with_email: 'bob@demo.com', permission: 'edit' }, token);
  assert('Share document with user', share.status === 201);

  // Login as Bob and access doc
  const bobLogin = await request('POST', '/auth/login', { email: 'bob@demo.com', password: 'password123' });
  const bobToken = bobLogin.body.token;
  const bobDoc = await request('GET', `/documents/${docId}`, null, bobToken);
  assert('Shared user can access document', bobDoc.status === 200);

  // Bob cannot share (not owner)
  const bobShare = await request('POST', '/shares', { document_id: docId, shared_with_email: 'carol@demo.com', permission: 'view' }, bobToken);
  assert('Non-owner cannot share', bobShare.status === 403);

  // Delete
  console.log('\n📋 Delete Tests');
  const del = await request('DELETE', `/documents/${docId}`, null, token);
  assert('Owner can delete document', del.status === 200);

  const afterDel = await request('GET', `/documents/${docId}`, null, token);
  assert('Deleted document returns 404', afterDel.status === 404);

  // Summary
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log('🎉 All tests passed!');
  else process.exit(1);
}

run().catch(err => {
  console.error('Test runner error:', err.message);
  console.error('Make sure the server is running on port 3001');
  process.exit(1);
});
