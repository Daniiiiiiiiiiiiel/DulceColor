/* supabase.js — Cliente Supabase para el sitio público */
const _sb = (() => {
  const url = window.SUPABASE_URL || '';
  const key = window.SUPABASE_ANON_KEY || '';
  if (!url || url.includes('PEGA_')) return null;

  const h = () => ({
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  });

  return {
    async rpc(fn, params) {
      const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
        method: 'POST', headers: h(), body: JSON.stringify(params)
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async insert(table, payload) {
      const r = await fetch(`${url}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...h(), 'Prefer': 'return=minimal' },
        body: JSON.stringify(payload)
      });
      return { ok: r.ok, status: r.status };
    }
  };
})();

window.supabaseClient = _sb;
