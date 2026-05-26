const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const hashPassword = async (password) => await bcrypt.hash(password, 10);
const verifyPassword = async (password, hash) => await bcrypt.compare(password, hash);

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email }
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Недействительный токен' });
  }
};

const requireOwner = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT user_id FROM snippets WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Сниппет не найден' });
    if (result.rows[0].user_id !== req.user.id) return res.status(403).json({ success: false, error: 'Нет прав доступа' });
    next();
  } catch {
    res.status(500).json({ success: false, error: 'Ошибка проверки прав' });
  }
};

module.exports = { hashPassword, verifyPassword, requireAuth, requireOwner };