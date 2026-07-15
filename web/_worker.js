/*
  _worker.js — Cloudflare Pages Worker
  Inyecta las variables de entorno en el HTML.
  Configura en Cloudflare Pages > Settings > Environment variables:
    SUPABASE_URL = tu project URL
    SUPABASE_ANON_KEY = tu anon key
*/
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const response = await env.ASSETS.fetch(request);
      const html = await response.text();
      const envScript = `<script>
window.SUPABASE_URL='${env.SUPABASE_URL||''}';
window.SUPABASE_ANON_KEY='${env.SUPABASE_ANON_KEY||''}';
</script>`;
      return new Response(html.replace('</head>', envScript + '</head>'), {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }
    return env.ASSETS.fetch(request);
  }
};
