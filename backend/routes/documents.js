const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { dbGet, dbAll, dbRun } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.txt', '.md', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only .txt, .md, and .docx files are supported'));
  }
});

router.get('/', (req, res) => {
  const owned = dbAll(`
    SELECT d.*, 'owner' as role, u.name as owner_name
    FROM documents d JOIN users u ON u.id = d.owner_id
    WHERE d.owner_id = ? ORDER BY d.updated_at DESC
  `, [req.user.id]);

  const shared = dbAll(`
    SELECT d.*, ds.permission as role, u.name as owner_name
    FROM documents d
    JOIN document_shares ds ON ds.document_id = d.id
    JOIN users u ON u.id = d.owner_id
    WHERE ds.shared_with_id = ? ORDER BY d.updated_at DESC
  `, [req.user.id]);

  res.json({ owned, shared });
});

router.get('/:id', (req, res) => {
  const doc = dbGet(`
    SELECT d.*, u.name as owner_name, u.email as owner_email
    FROM documents d JOIN users u ON u.id = d.owner_id WHERE d.id = ?
  `, [req.params.id]);

  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const isOwner = doc.owner_id === req.user.id;
  const share = dbGet('SELECT permission FROM document_shares WHERE document_id = ? AND shared_with_id = ?', [req.params.id, req.user.id]);

  if (!isOwner && !share) return res.status(403).json({ error: 'Access denied' });

  const shares = isOwner ? dbAll(`
    SELECT ds.*, ds.shared_with_id, u.name, u.email FROM document_shares ds
    JOIN users u ON u.id = ds.shared_with_id WHERE ds.document_id = ?
  `, [req.params.id]) : [];

  res.json({ ...doc, role: isOwner ? 'owner' : share.permission, shares });
});

router.post('/', (req, res) => {
  const { title, content } = req.body;
  const id = uuidv4();
  dbRun('INSERT INTO documents (id, title, content, owner_id) VALUES (?, ?, ?, ?)', [
    id, title || 'Untitled Document', content || '', req.user.id
  ]);
  const doc = dbGet('SELECT * FROM documents WHERE id = ?', [id]);
  res.status(201).json(doc);
});

router.put('/:id', (req, res) => {
  const doc = dbGet('SELECT * FROM documents WHERE id = ?', [req.params.id]);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const isOwner = doc.owner_id === req.user.id;
  const share = dbGet('SELECT permission FROM document_shares WHERE document_id = ? AND shared_with_id = ?', [req.params.id, req.user.id]);
  const canEdit = isOwner || share?.permission === 'edit';
  if (!canEdit) return res.status(403).json({ error: 'No edit permission' });

  const { title, content } = req.body;
  dbRun(`UPDATE documents SET title = ?, content = ?, updated_at = strftime('%s','now') WHERE id = ?`, [
    title !== undefined ? title : doc.title,
    content !== undefined ? content : doc.content,
    req.params.id
  ]);
  res.json(dbGet('SELECT * FROM documents WHERE id = ?', [req.params.id]));
});

router.delete('/:id', (req, res) => {
  const doc = dbGet('SELECT * FROM documents WHERE id = ?', [req.params.id]);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owner can delete' });
  dbRun('DELETE FROM document_shares WHERE document_id = ?', [req.params.id]);
  dbRun('DELETE FROM documents WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const filePath = req.file.path;
  let content = '';
  let title = path.basename(req.file.originalname, ext);

  try {
    if (ext === '.txt') {
      const raw = fs.readFileSync(filePath, 'utf8');
      content = raw.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('');
    } else if (ext === '.md') {
      const raw = fs.readFileSync(filePath, 'utf8');
      content = raw
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/\n\n+/g, '</p><p>');
    } else if (ext === '.docx') {
      const mammoth = require('mammoth');
      const result = await mammoth.convertToHtml({ path: filePath });
      content = result.value;
    }
    fs.unlinkSync(filePath);

    const id = uuidv4();
    dbRun('INSERT INTO documents (id, title, content, owner_id) VALUES (?, ?, ?, ?)', [id, title, content, req.user.id]);
    res.status(201).json(dbGet('SELECT * FROM documents WHERE id = ?', [id]));
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to process file: ' + err.message });
  }
});

module.exports = router;
