import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { fetchAPI } from '../api/client';
import { useHotkeys } from '../hooks/useHotkeys';

const LANGS = ['JavaScript','Python','CSS','HTML','TypeScript','SQL','Go','Rust'];

export default function HomePage({ addToast }) {
  const [params, setParams] = useSearchParams();
  const [snippets, setSnippets] = useState([]);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const searchRef = useRef(null);
  useHotkeys(searchRef);

  const fetch = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetchAPI(`/snippets?${params.toString()}`);
      setSnippets(res.items || []);
      setPages(res.pages || 0);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, [params]);

  const update = (key, val) => {
    const next = new URLSearchParams(params);
    next.set(key, val || '');
    if (key !== 'page') next.set('page', '1');
    setParams(next);
  };

  const currentPage = parseInt(params.get('page') || '1', 10);

  return (
    <div>
      <div className="filters">
        <input ref={searchRef} placeholder="Поиск" value={params.get('q') || ''} onChange={e => update('q', e.target.value)} />
        <select value={params.get('lang') || ''} onChange={e => update('lang', e.target.value)}>
          <option value="">Все языки</option>
          {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={params.get('sort') || 'newest'} onChange={e => update('sort', e.target.value)}>
          <option value="newest">Сначала новые</option>
          <option value="oldest">Сначала старые</option>
          <option value="alpha">По алфавиту</option>
        </select>
      </div>
      {error && <div className="auth-error">{error}</div>}
      {loading ? (
        <div className="grid">{[1,2,3,4,5,6].map(i => <div key={i} className="card"><div className="skeleton" style={{height:16,width:60}}/><div className="skeleton" style={{height:18,width:'80%',marginTop:12}}/><div className="skeleton" style={{height:14,width:'60%',marginTop:10}}/></div>)}</div>
      ) : (
        <>
          <div className="grid">
            {snippets.map(s => (
              <Link to={`/snippet/${s.author}/${s.id}`} key={s.id} className="card">
                <span className="badge">{s.language}</span>
                <span className={`visibility-badge ${s.is_public ? 'badge-public' : 'badge-private'}`}>
                  {s.is_public ? 'Публичный' : 'Приватный'}
                </span>
                <h3>{s.title}</h3>
                <div className="tags">{s.tags?.map(t => <span key={t} className="tag">{t}</span>)}</div>
                <div className="desc">{s.description || 'Без описания'}</div>
                <div className="date">{new Date(s.created_at).toLocaleDateString()}</div>
              </Link>
            ))}
            {snippets.length === 0 && <div className="loader">Сниппеты не найдены</div>}
          </div>
          {pages > 1 && (
            <div className="pagination">
              {Array.from({length: pages}, (_, i) => i + 1).map(p => (
                <button key={p} className={`page-btn ${currentPage === p ? 'active' : ''}`} onClick={() => update('page', String(p))}>{p}</button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}