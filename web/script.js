/* =========================================
   SWEET STUDIO — script.js
   ========================================= */

/* ---- Navbar scroll effect ---- */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

/* ---- Mobile hamburger menu ---- */
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  hamburger.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    hamburger.classList.remove('open');
  });
});

/* ---- Scroll animations (IntersectionObserver) ---- */
const animEls = document.querySelectorAll('.fade-up, .fade-in');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.12 });

animEls.forEach(el => observer.observe(el));

/* ---- Menu data ---- */
const menuItems = [
  { cat: 'postres', name: 'Fresas con crema',   desc: 'Fresas frescas bañadas en crema batida artesanal.', price: '₡3.200' },
  { cat: 'postres', name: 'Waffles belgas',     desc: 'Crujientes por fuera, esponjosos por dentro.', price: '₡3.800' },
  { cat: 'postres', name: 'Crepas dulces',      desc: 'Con nutella, frutos rojos o cajeta. Tú eliges.', price: '₡3.500' },
  { cat: 'postres', name: 'Cheesecake',         desc: 'Base de galleta, relleno cremoso, topping de fresa.', price: '₡3.000' },
  { cat: 'postres', name: 'Brownies',           desc: 'Chocolatosos, densos y acompañados de helado.', price: '₡2.500' },
  { cat: 'bebidas', name: 'Malteadas',          desc: 'Vainilla, fresa o chocolate. Tamaño generoso.', price: '₡3.100' },
  { cat: 'bebidas', name: 'Frappé artesanal',   desc: 'Frío, cremoso y cargado al nivel que quieras.', price: '₡2.800' },
  { cat: 'bebidas', name: 'Té de frutas',       desc: 'Mezcla caliente de frutos del bosque e hibisco.', price: '₡2.200' },
  { cat: 'especiales', name: 'Pastel del día',  desc: 'Receta secreta que cambia cada semana. Sorpréndete.', price: '₡3.600' },
  { cat: 'especiales', name: 'Box para dos',    desc: 'Fresas, waffles, malteada y una tarde perfecta.', price: '₡7.500' },
  { cat: 'especiales', name: 'Caja de regalo',  desc: 'Selección curada de nuestros mejores postres.', price: '₡6.500' },
];

/* ---- Carousel Logic ---- */
let currentMenuIndex = 0;
let filteredItems = [];

function initMenuCarousel(cat = 'todos') {
  filteredItems = cat === 'todos' ? menuItems : menuItems.filter(i => i.cat === cat);
  currentMenuIndex = 0;
  renderCarousel();
}

function renderCarousel() {
  const track = document.getElementById('carouselTrack');
  if (!track) return;

  if (filteredItems.length === 0) {
    track.innerHTML = '<p class="no-items">No hay elementos en esta categoría</p>';
    return;
  }

  // Render all filtered items as carousel elements (using the official platillo image)
  track.innerHTML = filteredItems.map((item, index) => `
    <div class="carousel-item" data-index="${index}">
      <img src="assets/platillo.png" alt="${item.name}" class="carousel-dish-img" />
      <div class="carousel-dish-shadow"></div>
    </div>
  `).join('');

  // Add click events to items directly for intuitive circular navigation
  track.querySelectorAll('.carousel-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      if (index === currentMenuIndex) return;
      currentMenuIndex = index;
      updateCarouselState();
    });
  });

  updateCarouselState();
}

function updateCarouselState() {
  const items = document.querySelectorAll('.carousel-item');
  if (items.length === 0) return;

  const total = filteredItems.length;
  const activeIdx = currentMenuIndex;
  const prevIdx = (activeIdx - 1 + total) % total;
  const nextIdx = (activeIdx + 1) % total;

  items.forEach((item, index) => {
    item.classList.remove('active', 'prev', 'next', 'hidden-left', 'hidden-right');

    if (index === activeIdx) {
      item.classList.add('active');
    } else if (index === prevIdx && total > 1) {
      item.classList.add('prev');
    } else if (index === nextIdx && total > 2) {
      item.classList.add('next');
    } else {
      // Classify others as hidden left or right
      let diff = index - activeIdx;
      if (diff < -1) diff += total;
      if (diff > total / 2) {
        item.classList.add('hidden-left');
      } else {
        item.classList.add('hidden-right');
      }
    }
  });

  // Update active item details in the DOM
  const activeItem = filteredItems[activeIdx];
  if (activeItem) {
    document.getElementById('detailsCategory').textContent = activeItem.cat;
    document.getElementById('detailsName').textContent = activeItem.name;
    document.getElementById('detailsDesc').textContent = activeItem.desc;
    document.getElementById('detailsPrice').textContent = activeItem.price;
  }
}

function nextDish() {
  if (filteredItems.length === 0) return;
  currentMenuIndex = (currentMenuIndex + 1) % filteredItems.length;
  updateCarouselState();
}

function prevDish() {
  if (filteredItems.length === 0) return;
  currentMenuIndex = (currentMenuIndex - 1 + filteredItems.length) % filteredItems.length;
  updateCarouselState();
}

// Initialize Menu
initMenuCarousel('todos');

/* ---- Menu tabs ---- */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    initMenuCarousel(btn.dataset.cat);
  });
});

/* ---- Carousel Navigation buttons ---- */
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');

if (prevBtn && nextBtn) {
  prevBtn.addEventListener('click', prevDish);
  nextBtn.addEventListener('click', nextDish);
}

/* ---- FAQ accordion ---- */
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

/* ---- Supabase: enviar reserva ---- */
async function submitReserva(payload) {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;
  if (!url || url.includes('PEGA_')) {
    console.warn('[Supabase] No configurado — reserva simulada');
    return { ok: true };
  }
  try {
    const r = await fetch(`${url}/rest/v1/reservas`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
    return { ok: r.ok, status: r.status };
  } catch (err) {
    console.error('[Supabase] submitReserva:', err);
    return { ok: false };
  }
}

/* ---- Supabase: obtener disponibilidad ---- */
async function fetchDisponibilidad(fecha) {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;
  const fallback = timeSlots.map(s => ({ slot: s, disponible: true }));
  if (!url || url.includes('PEGA_')) return fallback;
  try {
    const ymd = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}-${String(fecha.getDate()).padStart(2,'0')}`;
    const r = await fetch(`${url}/rest/v1/rpc/get_disponibilidad`, {
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_fecha: ymd })
    });
    if (!r.ok) return fallback;
    return await r.json();
  } catch (err) {
    console.warn('[Supabase] fetchDisponibilidad:', err);
    return fallback;
  }
}

/* ---- Supabase: obtener configuraciones generales ---- */
async function fetchConfiguraciones() {
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;
  if (!url || url.includes('PEGA_')) return { maximo_personas_por_grupo: 6 };
  try {
    const r = await fetch(`${url}/rest/v1/configuracion_general`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    if (!r.ok) return { maximo_personas_por_grupo: 6 };
    const data = await r.json();
    const maxG = data.find(c => c.id === 'maximo_personas_por_grupo')?.valor || '6';
    return { maximo_personas_por_grupo: parseInt(maxG) };
  } catch (err) {
    console.warn('[Supabase] fetchConfiguraciones:', err);
    return { maximo_personas_por_grupo: 6 };
  }
}


function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  const mapOverlay = document.getElementById('mapModalOverlay');
  if (!mapOverlay || !mapOverlay.classList.contains('active')) {
    document.body.style.overflow = '';
  }
}

/* ---- Map Modal Control ---- */
const mapOverlay = document.getElementById('mapModalOverlay');

function openMapModal() {
  if (mapOverlay) {
    mapOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeMapModal() {
  if (mapOverlay) {
    mapOverlay.classList.remove('active');
    const modalOverlay = document.getElementById('modalOverlay');
    if (!modalOverlay || !modalOverlay.classList.contains('active')) {
      document.body.style.overflow = '';
    }
  }
}

// Bind button event listener
const btnVerUbicacion = document.getElementById('btnVerUbicacion');
if (btnVerUbicacion) {
  btnVerUbicacion.addEventListener('click', openMapModal);
}

/* Close modals on overlay click */
const overlay = document.getElementById('modalOverlay');
if (overlay) {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
}

if (mapOverlay) {
  mapOverlay.addEventListener('click', function(e) {
    if (e.target === this) closeMapModal();
  });
}

/* Close modals on Escape */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeMapModal();
  }
});

/* ---- Smooth scroll for anchor links ---- */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ---- Parallax on hero floating elements ---- */
document.addEventListener('mousemove', (e) => {
  const floats = document.querySelectorAll('.float-el');
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;
  const dx = (e.clientX - cx) / cx;
  const dy = (e.clientY - cy) / cy;

  floats.forEach((el, i) => {
    const depth = (i % 3 + 1) * 6;
    el.style.transform = `translate(${dx * depth}px, ${dy * depth}px)`;
  });
});

/* ---- Hero visual parallax on scroll ---- */
window.addEventListener('scroll', () => {
  const heroVisual = document.querySelector('.hero-visual');
  if (heroVisual) {
    const scrolled = window.scrollY;
    if (scrolled < window.innerHeight) {
      heroVisual.style.transform = `translateY(${scrolled * 0.08}px)`;
    }
  }
});

/* ========================================
   RESERVA: LÓGICA DE CALENDARIO Y WIZARD
======================================== */
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let selectedDate = new Date();
selectedDate.setHours(0,0,0,0);
// Empezamos por defecto mañana para evitar reservas en el pasado
selectedDate.setDate(selectedDate.getDate() + 1);
let selectedTimeSlot = "9:15 AM - 9:30 AM";
let activeSlotsList = [];

const timeSlots = [
  "9:00 AM - 9:15 AM",
  "9:15 AM - 9:30 AM",
  "9:30 AM - 9:45 AM",
  "9:45 AM - 10:00 AM",
  "10:00 AM - 10:15 AM",
  "10:15 AM - 10:30 AM",
  "10:30 AM - 10:45 AM",
  "10:45 AM - 11:00 AM",
  "11:00 AM - 11:15 AM",
  "11:15 AM - 11:30 AM",
  "11:30 AM - 11:45 AM",
  "11:45 AM - 12:00 PM",
  "12:00 PM - 12:15 PM",
  "12:15 PM - 12:30 PM",
  "12:30 PM - 12:45 PM",
  "12:45 PM - 1:00 PM",
  "1:00 PM - 1:15 PM",
  "1:15 PM - 1:30 PM",
  "1:30 PM - 1:45 PM",
  "1:45 PM - 2:00 PM",
  "2:00 PM - 2:15 PM",
  "2:15 PM - 2:30 PM",
  "2:30 PM - 2:45 PM",
  "2:45 PM - 3:00 PM",
  "3:00 PM - 3:15 PM",
  "3:15 PM - 3:30 PM",
  "3:30 PM - 3:45 PM",
  "3:45 PM - 4:00 PM",
  "4:00 PM - 4:15 PM",
  "4:15 PM - 4:30 PM",
  "4:30 PM - 4:45 PM",
  "4:45 PM - 5:00 PM"
];

function renderCalendar(year, month) {
  const container = document.getElementById('calendarDays');
  const monthYearLabel = document.getElementById('calendarMonthYear');
  if (!container || !monthYearLabel) return;

  const monthsNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  monthYearLabel.textContent = `${monthsNames[month]} ${year}`;
  container.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  // Monday: 0, Tuesday: 1 ... Sunday: 6
  let startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotalDays = new Date(year, month, 0).getDate();

  // Días del mes anterior
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevTotalDays - i;
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day other-month';
    dayDiv.textContent = String(dayNum).padStart(2, '0');
    container.appendChild(dayDiv);
  }

  // Días del mes actual
  const today = new Date();
  today.setHours(0,0,0,0);

  for (let d = 1; d <= totalDays; d++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    dayDiv.textContent = String(d).padStart(2, '0');

    const thisDate = new Date(year, month, d);
    thisDate.setHours(0,0,0,0);

    if (thisDate.getTime() === selectedDate.getTime()) {
      dayDiv.classList.add('selected');
    }
    if (thisDate.getTime() === today.getTime()) {
      dayDiv.classList.add('today');
    }

    dayDiv.addEventListener('click', () => {
      selectedDate = thisDate;
      document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected'));
      dayDiv.classList.add('selected');
      updateSchedulingText();
    });

    container.appendChild(dayDiv);
  }

  // Días del mes siguiente para rellenar la cuadrícula
  const cellCountSoFar = startDayOfWeek + totalDays;
  const cellsNeeded = cellCountSoFar > 35 ? 42 : 35;
  const nextDays = cellsNeeded - cellCountSoFar;
  for (let d = 1; d <= nextDays; d++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day other-month';
    dayDiv.textContent = String(d).padStart(2, '0');
    container.appendChild(dayDiv);
  }
}

/* Carga disponibilidad y renderiza slots */
async function loadSlotsForDate(fecha) {
  const container = document.getElementById('timeSlotsList');
  if (!container) return;
  container.innerHTML = '<div style="display:flex;align-items:center;gap:.5rem;color:var(--text-light);padding:1rem 0;font-size:.88rem"><div style="width:14px;height:14px;border:2px solid var(--pink-light);border-top-color:var(--pink);border-radius:50%;animation:spin .6s linear infinite"></div>&nbsp;Verificando disponibilidad...</div>';
  const slots = await fetchDisponibilidad(fecha);
  container.innerHTML = '';
  if (!slots.length) {
    container.innerHTML = '<p style="color:var(--text-mid);font-size:.88rem;padding:.5rem 0">No hay horarios para este día.</p>';
    return;
  }
  activeSlotsList = slots;
  slots.forEach(({ slot, disponible, cupos_restantes }) => {
    const div = document.createElement('div');
    div.className = 'time-slot' + (disponible ? '' : ' occupied');
    if (slot === selectedTimeSlot && disponible) div.classList.add('selected');
    
    let statusHTML = '';
    if (!disponible) {
      statusHTML = '<span style="margin-left:auto;font-size:.72rem;font-weight:600;color:var(--text-light)">Ocupado</span>';
    } else {
      statusHTML = `<span style="margin-left:auto;font-size:.72rem;color:var(--text-mid);font-weight:500">Quedan ${cupos_restantes} cupos</span>`;
    }

    div.innerHTML = `<div class="radio-circle"></div><span>${slot}</span>${statusHTML}`;
    if (disponible) div.addEventListener('click', () => {
      selectedTimeSlot = slot;
      document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
      div.classList.add('selected');
      updateSchedulingText();
    });
    container.appendChild(div);
  });
}

function renderTimeSlots() {
  // Delegado a loadSlotsForDate para integración Supabase
  loadSlotsForDate(selectedDate);
}

function updateSchedulingText() {
  const schedulingDateTimeText = document.getElementById('schedulingDateTimeText');
  const summaryDateText = document.getElementById('summaryDateText');
  const summaryTimeText = document.getElementById('summaryTimeText');

  const day = String(selectedDate.getDate()).padStart(2, '0');
  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const year = selectedDate.getFullYear();
  const dateFormatted = `${day}.${month}.${year}`;

  if (schedulingDateTimeText) {
    schedulingDateTimeText.textContent = `${dateFormatted}   ${selectedTimeSlot}`;
  }

  if (summaryDateText) {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    let longDate = selectedDate.toLocaleDateString('es-ES', options);
    longDate = longDate.charAt(0).toUpperCase() + longDate.slice(1);
    summaryDateText.textContent = longDate;
  }

  if (summaryTimeText) {
    summaryTimeText.textContent = selectedTimeSlot;
  }
}

function initBookingWizard() {
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  const step1 = document.getElementById('bookingStep1');
  const step2 = document.getElementById('bookingStep2');
  const step1NextBtn = document.getElementById('step1NextBtn');
  const step2BackBtn = document.getElementById('step2BackBtn');
  const formReservaCompleta = document.getElementById('formReservaCompleta');

  if (prevMonthBtn && nextMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar(currentYear, currentMonth);
    });

    nextMonthBtn.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar(currentYear, currentMonth);
    });
  }

  if (step1NextBtn && step1 && step2) {
    step1NextBtn.addEventListener('click', () => {
      step1.classList.remove('active');
      step2.classList.add('active');
      updateSchedulingText();
      const bookingCard = document.querySelector('.booking-card');
      if (bookingCard) {
        bookingCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  if (step2BackBtn && step1 && step2) {
    step2BackBtn.addEventListener('click', () => {
      step2.classList.remove('active');
      step1.classList.add('active');
      const bookingCard = document.querySelector('.booking-card');
      if (bookingCard) {
        bookingCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  if (formReservaCompleta) {
    formReservaCompleta.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre   = document.getElementById('reservaNombre').value.trim();
      const email    = document.getElementById('reservaEmail').value.trim();
      const tel      = document.getElementById('reservaTelefono').value.trim();
      const personas = parseInt(document.getElementById('reservaPersonas').value) || 1;
      const coment   = document.getElementById('reservaComentarios').value.trim();

      if (!nombre || !email || !tel) {
        alert('Por favor, completa los campos requeridos (Nombre, Correo y Teléfono).');
        return;
      }

      // Validar capacidad/cupos disponibles antes de enviar
      const slotData = activeSlotsList.find(s => s.slot === selectedTimeSlot);
      if (slotData && personas > slotData.cupos_restantes) {
        alert(`Lo sentimos, el horario seleccionado solo cuenta con ${slotData.cupos_restantes} cupos libres para esta fecha y estás intentando reservar para ${personas} personas.`);
        return;
      }

      const submitBtn = document.getElementById('step2SubmitBtn');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Enviando...'; }

      const ymd = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`;
      const result = await submitReserva({
        nombre, email, telefono: tel, personas,
        fecha: ymd, hora_slot: selectedTimeSlot,
        comentarios: coment || null, estado: 'pendiente'
      });

      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Confirmar Reserva'; }

      if (result.ok) {
        const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        let ds = selectedDate.toLocaleDateString('es-ES', opts);
        ds = ds.charAt(0).toUpperCase() + ds.slice(1);
        const overlay = document.getElementById('modalOverlay');
        document.getElementById('modalTitle').textContent = '¡Reserva confirmada!';
        document.getElementById('modalMsg').innerHTML = `Gracias <strong>${nombre}</strong>. Tu solicitud para el <strong>${ds}</strong> a las <strong>${selectedTimeSlot}</strong> fue recibida. Te contactaremos pronto.`;
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Recargar disponibilidad y volver al paso 1
        await loadSlotsForDate(selectedDate);
        step2.classList.remove('active'); step1.classList.add('active');
        formReservaCompleta.reset();
        selectedTimeSlot = null; updateSchedulingText();
      } else {
        document.getElementById('modalTitle').textContent = 'Error al enviar';
        document.getElementById('modalMsg').textContent = 'No pudimos procesar tu reserva. Intenta de nuevo o contáctanos directamente.';
        document.getElementById('modalOverlay').classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  }

  // Cargar configuración general de aforo/grupos al iniciar
  fetchConfiguraciones().then(config => {
    const selectPersonas = document.getElementById('reservaPersonas');
    if (selectPersonas) {
      selectPersonas.innerHTML = '';
      for (let i = 1; i <= config.maximo_personas_por_grupo; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `${i} ${i === 1 ? 'persona' : 'personas'}`;
        selectPersonas.appendChild(opt);
      }
    }
  });

  renderCalendar(currentYear, currentMonth);
  renderTimeSlots();
  updateSchedulingText();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBookingWizard);
} else {
  initBookingWizard();
}