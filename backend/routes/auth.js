const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { dbGet, dbAll, dbRun } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

router.post('/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'All fields required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const existing = dbGet('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  dbRun('INSERT INTO users (id, email, name, password) VALUES (?, ?, ?, ?)', [id, email.toLowerCase().trim(), name.trim(), hash]);

  const token = jwt.sign({ id, email: email.toLowerCase().trim(), name: name.trim() }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id, email: email.toLowerCase().trim(), name: name.trim() } });
});

router.get('/users', require('../middleware/auth').authMiddleware, (req, res) => {
  const users = dbAll('SELECT id, email, name FROM users WHERE id != ?', [req.user.id]);
  res.json(users);
});

module.exports = router;
