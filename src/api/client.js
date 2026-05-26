export async function fetchAPI(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    ...opts,
    credentials: 'include', // Браузер автоматически отправит куку sid
    headers: { 'Content-Type': 'application/json', ...opts.headers }
  });

  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) throw new Error(data.error || `Ошибка ${res.status}`);
  return data;
}