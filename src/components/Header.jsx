import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header>
      <Link to="/" className="logo">SnippetLib</Link>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {isAuthenticated && <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{user?.email}</span>}
        {isAuthenticated && <Link to="/new" className="btn btn-primary">+ Новый</Link>}
        <button className="btn btn-secondary" onClick={toggleTheme} title="Переключить тему">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        {isAuthenticated && <button className="btn btn-secondary" onClick={logout}>Выйти</button>}
      </div>
    </header>
  );
}