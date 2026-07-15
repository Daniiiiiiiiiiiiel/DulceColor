/* =========================================
   SWEET STUDIO — app.js (Panel Admin)
   ========================================= */

/* ---- Auth guard ---- */
if (sessionStorage.getItem('ss_auth') !== 'true') location.replace('index.html');

const NOMBRE = sessionStorage.getItem('ss_nombre') || 'Admin';
const EMAIL  = sessionStorage.getItem('ss_email')  || '';
document.getElementById('adminName').textContent   = NOMBRE;
document.getElementById('adminEmail').textContent  = EMAIL;
document.getElementById('adminAvatar').textContent = NOMBRE.charAt(0).toUpperCase();

/* ---- Supabase (service_role key) ---- */
const SB_URL = window.SUPABASE_URL         || '';
const SB_KEY = window.SUPABASE_SERVICE_KEY || '';
const hdr = {
  'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json', 'Prefer': 'return=representation'
};

async function sbGet(table, qs='') {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${qs}`, { headers: hdr });
  if (!r.ok) throw new Error(await r.text()); return r.json();
}
async function sbPost(table, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, { method:'POST', headers: hdr, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text()); return r.json();
}
async function sbPatch(table, id, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method:'PATCH', headers: hdr, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
}
async function sbDelete(table, id) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method:'DELETE', headers: { ...hdr, Prefer:'' } });
  if (!r.ok) throw new Error(await r.text());
}

/* ---- Toast ---- */
function toast(msg, type='success') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3200);
}

/* ---- Confirm modal ---- */
let _resolve = null;
function confirmModal(title, msg, label='Confirmar', cls='btn-delete') {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent   = msg;
  const okBtn = document.getElementById('confirmOk');
  okBtn.textContent = label; okBtn.className = `btn-action ${cls}`;
  document.getElementById('confirmModal').classList.add('show');
  return new Promise(r => { _resolve = r; });
}
document.getElementById('confirmCancel').addEventListener('click', () => {
  document.getElementById('confirmModal').classList.remove('show'); if (_resolve) _resolve(false);
});
document.getElementById('confirmOk').addEventListener('click', () => {
  document.getElementById('confirmModal').classList.remove('show'); if (_resolve) _resolve(true);
});

/* ---- Navigation ---- */
const pages = {
  reservas: { el: document.getElementById('page-reservas'), title:'Reservas',  sub:'Gestiona todas las reservas del estudio' },
  horarios: { el: document.getElementById('page-horarios'), title:'Horarios',  sub:'Activa o desactiva slots de tiempo' },
  bloqueos: { el: document.getElementById('page-bloqueos'), title:'Bloqueos',  sub:'Bloquea horarios manualmente' },
};
let activePage = 'reservas';

function navigate(page) {
  Object.values(pages).forEach(p => p.el.classList.remove('active'));
  pages[page].el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  document.getElementById('topbarTitle').textContent = pages[page].title;
  document.getElementById('topbarSub').textContent   = pages[page].sub;
  activePage = page;
  if (page==='reservas') loadReservas();
  if (page==='horarios') loadHorarios();
  if (page==='bloqueos') loadBloqueos();
}

document.querySelectorAll('.nav-item').forEach(btn =>
  btn.addEventListener('click', () => navigate(btn.dataset.page))
);
document.getElementById('btnRefresh').addEventListener('click', () => navigate(activePage));
document.getElementById('btnLogout').addEventListener('click', async () => {
  if (await confirmModal('¿Cerrar sesión?','Serás redirigido al inicio.','Salir','btn-delete')) {
    sessionStorage.clear(); location.replace('index.html');
  }
});

// Hamburguesa Móvil
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const btnMenuToggle = document.getElementById('btnMenuToggle');

function closeMobileSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
}

if (btnMenuToggle && sidebarOverlay && sidebar) {
  btnMenuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('open');
  });
  
  sidebarOverlay.addEventListener('click', closeMobileSidebar);
  
  // Cerrar sidebar al hacer click en los botones de navegación en móviles
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', closeMobileSidebar);
  });
}

/* ===================== RESERVAS ===================== */
let allReservas = [];

async function loadReservas() {
  const body = document.getElementById('reservasBody');
  body.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2.5rem"><div class="spinner" style="margin:auto"></div></td></tr>';
  try {
    allReservas = await sbGet('reservas', 'order=created_at.desc');
    updateStats(); renderReservas();
  } catch(e) {
    body.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p>Error: ${e.message}</p></div></td></tr>`;
    toast('Error al cargar reservas', 'error');
  }
}

function updateStats() {
  document.getElementById('statTotal').textContent       = allReservas.length;
  document.getElementById('statPendientes').textContent  = allReservas.filter(r=>r.estado==='pendiente').length;
  document.getElementById('statConfirmadas').textContent = allReservas.filter(r=>r.estado==='confirmada').length;
  document.getElementById('statCanceladas').textContent  = allReservas.filter(r=>r.estado==='cancelada').length;
}

function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function renderReservas() {
  const body   = document.getElementById('reservasBody');
  const search = document.getElementById('searchInput').value.toLowerCase();
  const estado = document.getElementById('filterEstado').value;
  const fecha  = document.getElementById('filterFecha').value;

  const filtered = allReservas.filter(r =>
    (!search || r.nombre.toLowerCase().includes(search) || r.email.toLowerCase().includes(search) || (r.telefono||'').includes(search)) &&
    (!estado || r.estado === estado) &&
    (!fecha  || r.fecha  === fecha)
  );

  if (!filtered.length) {
    body.innerHTML = '<tr><td colspan="8"><div class="empty-state"><p>No hay reservas que coincidan.</p></div></td></tr>';
    return;
  }

  body.innerHTML = filtered.map(r => {
    const fd = new Date(r.fecha+'T00:00:00').toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'});
    const rd = new Date(r.created_at).toLocaleDateString('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    return `<tr>
      <td data-label="Nombre"><strong>${esc(r.nombre)}</strong></td>
      <td data-label="Contacto" style="font-size:.82rem;line-height:1.7">${esc(r.email)}<br><span style="color:var(--text-light)">${esc(r.telefono)}</span></td>
      <td data-label="Fecha">${fd}</td>
      <td data-label="Hora" style="white-space:nowrap;font-size:.84rem">${esc(r.hora_slot)}</td>
      <td data-label="Personas" style="text-align:center">${r.personas}</td>
      <td data-label="Estado"><span class="badge ${r.estado}">${r.estado}</span></td>
      <td data-label="Recibido" style="font-size:.78rem;color:var(--text-light)">${rd}</td>
      <td data-label="Acciones"><div class="actions-cell">
        ${r.estado==='pendiente' ? `<button class="btn-action btn-confirm btn-sm" onclick="accion('confirmar','${r.id}')">Confirmar</button>` : ''}
        ${r.estado!=='cancelada' ? `<button class="btn-action btn-outline btn-sm" onclick="accion('cancelar','${r.id}')">Cancelar</button>` : ''}
        <button class="btn-action btn-delete btn-sm" onclick="accion('eliminar','${r.id}')">Eliminar</button>
      </div></td>
    </tr>`;
  }).join('');
}

async function accion(tipo, id) {
  const map = {
    confirmar: ['Confirmar reserva','¿Marcar como confirmada?','Confirmar','btn-confirm'],
    cancelar:  ['Cancelar reserva','¿Marcar como cancelada?','Cancelar','btn-delete'],
    eliminar:  ['Eliminar reserva','¿Eliminar permanentemente? No se puede deshacer.','Eliminar','btn-delete'],
  };
  const [t,m,l,c] = map[tipo];
  if (!await confirmModal(t,m,l,c)) return;
  try {
    if (tipo==='eliminar') await sbDelete('reservas', id);
    else await sbPatch('reservas', id, { estado: tipo==='confirmar'?'confirmada':'cancelada' });
    toast(tipo==='eliminar'?'Reserva eliminada':`Reserva ${tipo==='confirmar'?'confirmada':'cancelada'}`);
    await loadReservas();
  } catch(e) { toast('Error: '+e.message,'error'); }
}

['searchInput','filterEstado','filterFecha'].forEach(id =>
  document.getElementById(id)?.addEventListener('input', renderReservas)
);

/* ===================== HORARIOS ===================== */
let horariosData = [];

window.toggleSlotClass = function(cb) {
  const card = cb.closest('.slot-card-item');
  const statusLabel = card.querySelector('.slot-card-status');
  if (cb.checked) {
    card.classList.remove('inactive');
    card.classList.add('active');
    statusLabel.textContent = 'Habilitado';
  } else {
    card.classList.remove('active');
    card.classList.add('inactive');
    statusLabel.textContent = 'Deshabilitado';
  }
};

function renderSlotCell(h) {
  return `
    <div class="slot-card-item ${h.activo ? 'active' : 'inactive'}" data-id="${h.id}">
      <label class="slot-card-click-area">
        <input type="checkbox" ${h.activo ? 'checked' : ''} onchange="toggleSlotClass(this)" />
        <span class="slot-card-time">${esc(h.slot)}</span>
        <span class="slot-card-status">${h.activo ? 'Habilitado' : 'Deshabilitado'}</span>
      </label>
      <div class="slot-card-capacity-input-wrap">
        <span class="capacity-label">Capacidad:</span>
        <input type="number" class="slot-capacity-input" value="${h.limite_personas || 4}" min="1" max="50" />
      </div>
    </div>
  `;
}

async function loadHorarios() {
  const container = document.getElementById('horariosContainer');
  container.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';
  try {
    // 1. Cargar configuraciones generales del local
    const configData = await sbGet('configuracion_general');
    const cap = configData.find(c => c.id === 'capacidad_maxima_local')?.valor || '20';
    const dur = configData.find(c => c.id === 'duracion_reserva_minutos')?.valor || '120';
    const maxG = configData.find(c => c.id === 'maximo_personas_por_grupo')?.valor || '6';

    document.getElementById('cfgCapacidad').value = cap;
    document.getElementById('cfgDuracion').value = dur;
    document.getElementById('cfgMaxGrupo').value = maxG;

    // 2. Cargar los slots de horarios
    horariosData = await sbGet('configuracion_horarios','order=orden.asc');
    
    const manana = horariosData.filter(h => h.slot.toLowerCase().includes('am'));
    const tarde = horariosData.filter(h => h.slot.toLowerCase().includes('pm'));

    let html = '';
    
    // Grupo Mañana
    html += `
      <div class="horario-grupo">
        <h4 class="horario-grupo-titulo">🌅 Turno Mañana (AM)</h4>
        <div class="horario-grupo-grid">
          ${manana.map(h => renderSlotCell(h)).join('')}
        </div>
      </div>
    `;

    // Grupo Tarde
    html += `
      <div class="horario-grupo">
        <h4 class="horario-grupo-titulo">🌇 Turno Tarde (PM)</h4>
        <div class="horario-grupo-grid">
          ${tarde.map(h => renderSlotCell(h)).join('')}
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  } catch(e) { container.innerHTML = `<p style="color:#e74c3c;padding:1rem">Error: ${e.message}</p>`; }
}

document.getElementById('btnSaveHorarios').addEventListener('click', async () => {
  const btn = document.getElementById('btnSaveHorarios');
  btn.disabled=true; btn.textContent='Guardando...';
  try {
    // 1. Guardar configuraciones generales
    const capVal = document.getElementById('cfgCapacidad').value || '20';
    const durVal = document.getElementById('cfgDuracion').value || '120';
    const maxGVal = document.getElementById('cfgMaxGrupo').value || '6';

    await Promise.all([
      sbPatch('configuracion_general', 'capacidad_maxima_local', { valor: capVal }),
      sbPatch('configuracion_general', 'duracion_reserva_minutos', { valor: durVal }),
      sbPatch('configuracion_general', 'maximo_personas_por_grupo', { valor: maxGVal }),
    ]);

    // 2. Guardar slots individuales
    const cards = [...document.querySelectorAll('#horariosContainer .slot-card-item')];
    await Promise.all(cards.map(card => {
      const id = card.dataset.id;
      const activo = card.querySelector('input[type=checkbox]').checked;
      const limite = parseInt(card.querySelector('.slot-capacity-input').value) || 4;
      return sbPatch('configuracion_horarios', id, { activo, limite_personas: limite });
    }));
    
    cards.forEach(card => {
      const h = horariosData.find(x => x.id === card.dataset.id);
      if (h) {
        h.activo = card.querySelector('input[type=checkbox]').checked;
        h.limite_personas = parseInt(card.querySelector('.slot-capacity-input').value) || 4;
      }
    });
    toast('Horarios y configuración guardados');
  } catch(e) { toast('Error: '+e.message,'error'); }
  btn.disabled=false; btn.textContent='Guardar cambios';
});

/* ===================== BLOQUEOS ===================== */
async function loadBloqueos() {
  const body = document.getElementById('bloqueosBody');
  body.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem"><div class="spinner" style="margin:auto"></div></td></tr>';
  try {
    const data = await sbGet('slots_bloqueados','order=fecha.asc,hora_slot.asc');
    if (!data.length) { body.innerHTML='<tr><td colspan="4"><div class="empty-state"><p>Sin bloqueos activos.</p></div></td></tr>'; return; }
    body.innerHTML = data.map(b => {
      const f=new Date(b.fecha+'T00:00:00').toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'});
      return `<tr><td>${f}</td><td style="font-size:.84rem">${esc(b.hora_slot)}</td><td style="font-size:.82rem;color:var(--text-light)">${esc(b.motivo||'—')}</td><td><button class="btn-action btn-delete btn-sm" onclick="quitarBloqueo('${b.id}')">Quitar</button></td></tr>`;
    }).join('');
  } catch(e) { body.innerHTML=`<tr><td colspan="4" style="padding:1rem;color:#e74c3c">${e.message}</td></tr>`; }
}

async function quitarBloqueo(id) {
  if (!await confirmModal('¿Quitar bloqueo?','El slot volverá a estar disponible.','Quitar','btn-delete')) return;
  try { await sbDelete('slots_bloqueados',id); toast('Bloqueo eliminado'); loadBloqueos(); }
  catch(e) { toast('Error: '+e.message,'error'); }
}

function populateSlots() {
  const sel = document.getElementById('blSlot');
  sel.innerHTML = '<option value="">Selecciona un slot</option>' +
    horariosData.filter(h=>h.activo).map(h=>`<option value="${esc(h.slot)}">${esc(h.slot)}</option>`).join('');
}

document.getElementById('bloqueoForm').addEventListener('submit', async e => {
  e.preventDefault();
  const fecha=document.getElementById('blFecha').value, slot=document.getElementById('blSlot').value;
  const motivo=document.getElementById('blMotivo').value.trim();
  if (!fecha||!slot) { toast('Selecciona fecha y hora','error'); return; }
  try {
    await sbPost('slots_bloqueados',{fecha,hora_slot:slot,motivo:motivo||null});
    toast('Slot bloqueado'); document.getElementById('bloqueoForm').reset(); loadBloqueos();
  } catch(e) {
    toast(e.message.includes('unique')?'Ese slot ya está bloqueado para esa fecha.':e.message,'error');
  }
});

// Cargar horarios para bloqueos (necesita horariosData)
document.querySelector('[data-page="bloqueos"]').addEventListener('click', async () => {
  if (!horariosData.length) await loadHorarios();
  populateSlots();
});

/* ---- Init ---- */
loadReservas();
