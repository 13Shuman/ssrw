const express = require('express');
const router = express.Router();
const pool = require('../db');
const { hashPassword, verifyPassword } = require('../auth');
const jwt = require('jsonwebtoken');

const signToken = (user) => jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Email и пароль (мин. 6 символов) обязательны' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ success: false, error: 'Email уже зарегистрирован' });

    const hash = await hashPassword(password);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email.trim(), hash]
    );

    const token = signToken(rows[0]);
    res.status(201).json({ success: true, data: { token, user: rows[0] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Ошибка регистрации' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Заполните все поля' });

    const { rows } = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email.trim()]);
    if (rows.length === 0 || !await verifyPassword(password, rows[0].password_hash)) {
      return res.status(400).json({ success: false, error: 'Неверный email или пароль' });
    }

    const token = signToken(rows[0]);
    res.json({ success: true, data: { token, user: { id: rows[0].id, email: rows[0].email } } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Ошибка входа' });
  }
});

module.exports = router;