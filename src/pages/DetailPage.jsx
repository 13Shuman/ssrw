import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function DetailPage({ addToast }) {
  const { username, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Бэкенд требует /snippets/:username/:id. Если username в URL нет, берём email авторизованного пользователя
    const targetUsername = username || user?.email;
    if (!targetUsername) return;

    fetchAPI(`/snippets/${targetUsername}/${id}`)
      .then(d => setS(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, username, user]);

  const copyCode = async () => {
    if (!s) return;
    try { await navigator.clipboard.writeText(s.code); addToast('Код скопирован'); } catch { addToast('Ошибка копирования', 3000); }
  };

  const shareSnippet = async () => {
    const url = `${window.location.origin}/snippet/${s.author}/${s.id}`;
    try { await navigator.clipboard.writeText(url); addToast('Ссылка скопирована'); } catch { addToast('Не удалось скопировать ссылку', 3000); }
  };

  const del = async () => {
    if (!window.confirm('Удалить сниппет?')) return;
    try { await fetchAPI(`/snippets/${s.id}`, { method: 'DELETE' }); navigate('/', { replace: true }); addToast('Сниппет удалён'); } catch(e) { addToast(e.message, 3000); }
  };

  if (loading) return <div className="loader">Загрузка...</div>;
  if (error) return <div className="auth-error">{error} <button className="btn btn-secondary" onClick={() => navigate(-1)}>Назад</button></div>;
  if (!s) return null;

  const isOwner = user?.email === s.author;
  const lines = s.code.split('\n');

  return (
    <div className="detail">
      {isOwner && <button className="btn btn-secondary" onClick={() => navigate(-1)}>Назад</button>}
      
      <div className="detail-header">
        <h1>{s.title}</h1>
        {s.is_public === true && (
          <button className="btn btn-secondary" onClick={shareSnippet}>Поделиться</button>
        )}
      </div>

      <div className="meta">
        <span className="badge">{s.language}</span>
        <span className={`badge ${s.is_public ? 'badge-public' : 'badge-private'}`}>
          {s.is_public ? 'Публичный' : 'Приватный'}
        </span>
        <span>{s.tags?.join(', ') || 'Без тегов'}</span>
        <span>{new Date(s.updated_at).toLocaleString()}</span>
      </div>
      <p className="detail-desc">{s.description || ''}</p>

      <div className="code-box">
        <div className="code-head">
          <button className="btn btn-secondary" onClick={copyCode}>Копировать код</button>
          {isOwner && (
            <div className="code-actions">
              <Link to={`/snippet/${s.author}/${s.id}/edit`} className="btn btn-primary">Редактировать</Link>
              <button className="btn btn-danger" onClick={del}>Удалить</button>
            </div>
          )}
        </div>
        <div className="code-body">
          {lines.map((l, i) => (
            <div className="line" key={i}>
              <span className="ln">{i+1}</span>
              <span className="lc">{l||' '}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}