import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';

const LANGS = ['JavaScript','Python','CSS','HTML','TypeScript','SQL','Go','Rust'];

export default function FormPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [form, setForm] = useState({ title:'', language:'JavaScript', code:'', description:'', tags:'', is_public: true });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && user) {
      fetchAPI(`/snippets/${user.email}/${id}`)
        .then(d => setForm({ title: d.title, language: d.language, code: d.code, description: d.description || '', tags: d.tags?.join(', ') || '', is_public: d.is_public }))
        .catch(() => navigate('/', { replace: true }));
    }
  }, [id, user, navigate]);

  const formatTags = (raw) => raw.split(',').map(t => t.trim()).filter(Boolean).map(t => t.startsWith('#') ? t : `#${t}`).join(', ');

  const submit = async (e) => {
    e.preventDefault();
    const eObj = {};
    if (!form.title.trim()) eObj.title = 'Название обязательно';
    if (!form.code.trim()) eObj.code = 'Код обязателен';
    if (form.code.length > 50000) eObj.code = 'Макс. 50 000 символов';
    if (form.description.length > 100) eObj.desc = 'Описание макс. 100 символов';
    setErrors(eObj);
    if (Object.keys(eObj).length) return;

    setLoading(true);
    try {
      const payload = {
        title: form.title,
        language: form.language,
        code: form.code,
        description: form.description,
        tags: formatTags(form.tags),
        is_public: form.is_public
      };
      if (isEdit) await fetchAPI(`/snippets/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await fetchAPI('/snippets', { method: 'POST', body: JSON.stringify(payload) });
      navigate(isEdit ? `/snippet/${user?.email}/${id}` : '/', { replace: true });
    } catch(err) { setErrors({ form: err.message }); } finally { setLoading(false); }
  };

  return (
    <form className="form" onSubmit={submit}>
      <h2>{isEdit ? 'Редактирование' : 'Новый сниппет'}</h2>
      {errors.form && <div className="auth-error">{errors.form}</div>}
      <div className="field" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
        <input type="checkbox" id="pub-check" checked={form.is_public} onChange={e => setForm({...form, is_public: e.target.checked})} style={{ width: 'auto', margin: 0 }} />
        <label htmlFor="pub-check" style={{ margin: 0, cursor: 'pointer' }}>Публичный сниппет</label>
      </div>
      <div className="field">
        <label>Название *</label>
        <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
        {errors.title && <div className="err">{errors.title}</div>}
      </div>
      <div className="field">
        <label>Язык *</label>
        <select value={form.language} onChange={e => setForm({...form, language: e.target.value})}>
          {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Код *</label>
        <textarea rows="10" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
        <div className="char-count">{form.code.length}/50000</div>
        {errors.code && <div className="err">{errors.code}</div>}
      </div>
      <div className="field">
        <label>Описание</label>
        <input maxLength="100" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        {errors.desc && <div className="err">{errors.desc}</div>}
      </div>
      <div className="field">
        <label>Теги (через запятую)</label>
        <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="react, api, hook" />
      </div>
      <div className="form-acts">
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Сохранение...' : 'Сохранить'}</button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Отмена</button>
      </div>
    </form>
  );
}