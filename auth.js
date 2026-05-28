const crypto = require('crypto');
const SECRET = process.env.SECRET || 'course_secret';
const SALT = 'static_salt_for_hw';

const hashPwd = (pwd) => crypto.pbkdf2Sync(pwd, SALT, 100000, 64, 'sha512').toString('hex');
const signCookie = (val) => {  
  const str = String(val);
  return `${str}.${crypto.createHmac('sha256', SECRET).update(str).digest('hex')}`;
};
const verifyCookie = (cookie) => {
  if (!cookie) return null;
  const [val, sig] = cookie.split('.');
  return sig === crypto.createHmac('sha256', SECRET).update(val).digest('hex') ? parseInt(val) : null;
};

module.exports.cookieParser = (req, _, next) => {
  const sid = req.headers.cookie?.split(';').find(c => c.trim().startsWith('sid='))?.split('=')[1];
  req.userId = verifyCookie(sid);
  next();
};

module.exports.requireAuth = (req, res, next) => req.userId ? next() : res.status(401).json({ error: 'Unauthorized' });
module.exports.hashPwd = hashPwd;
module.exports.signCookie = signCookie;