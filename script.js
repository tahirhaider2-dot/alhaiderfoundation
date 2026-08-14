/* ========================================================
   Al Haider Foundation — script.js (v2)
   Handles: slider, language, hamburger, lightbox,
            gallery, copy, contact form, donate form,
            scroll effects, fade animations
   ======================================================== */

'use strict';

/* ── HELPERS ── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ════════════════════════════════════════
   LANGUAGE TOGGLE
════════════════════════════════════════ */
(function initLang() {
  const html = $('#html-root') || document.documentElement;
  const btns = $$('.lang-btn');
  const saved = localStorage.getItem('ahf-lang') || 'en';

  function setLang(lang) {
    html.setAttribute('dir', lang === 'ur' ? 'rtl' : 'ltr');
    html.setAttribute('lang', lang === 'ur' ? 'ur' : 'en');
    btns.forEach(b => {
      const active = b.dataset.lang === lang;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    localStorage.setItem('ahf-lang', lang);
  }

  setLang(saved);
  btns.forEach(btn => btn.addEventListener('click', () => setLang(btn.dataset.lang)));
})();

/* ════════════════════════════════════════
   HAMBURGER / MOBILE NAV
   Uses max-height:0→open toggle so the nav
   is position:absolute (not fixed) and always
   anchors correctly below the sticky header
   on all browsers including Android Chrome.
════════════════════════════════════════ */
(function initHamburger() {
  const btn = $('#hamburger');
  const nav = $('#site-nav');
  if (!btn || !nav) return;

  function openNav() {
    nav.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
  function closeNav() {
    nav.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    nav.classList.contains('open') ? closeNav() : openNav();
  });

  // Close when a nav link is tapped
  nav.addEventListener('click', e => {
    if (e.target.closest('.nav-link')) closeNav();
  });

  // Close on any outside tap/click
  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !nav.contains(e.target)) closeNav();
  });

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeNav();
  });
})();

/* ════════════════════════════════════════
   HEADER SCROLL SHADOW
════════════════════════════════════════ */
(function initHeaderScroll() {
  const header = $('#site-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ════════════════════════════════════════
   ACTIVE NAV LINK (home page only)
════════════════════════════════════════ */
(function initActiveNav() {
  if (!location.pathname.endsWith('index.html') && location.pathname !== '/' && location.pathname !== '') return;
  const sections = $$('section[id]');
  const links = $$('.nav-link');
  if (!sections.length || !links.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const active = links.find(l => l.getAttribute('href') === `#${en.target.id}`);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => obs.observe(s));
})();

/* ════════════════════════════════════════
   HERO SLIDER
════════════════════════════════════════ */
(function initSlider() {
  const track = $('#slider-track');
  if (!track) return;

  const slides = $$('.slide', track);
  const dots   = $$('.slider-dot');
  const prevBtn = $('#slider-prev');
  const nextBtn = $('#slider-next');
  if (!slides.length) return;

  let current = 0;
  let timer = null;

  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    dots[current]?.setAttribute('aria-selected', 'false');

    current = (idx + slides.length) % slides.length;

    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
    dots[current]?.setAttribute('aria-selected', 'true');
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startAuto() {
    clearInterval(timer);
    timer = setInterval(next, 5000);
  }

  if (prevBtn) prevBtn.addEventListener('click', () => { prev(); startAuto(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { next(); startAuto(); });

  dots.forEach(dot => {
    dot.addEventListener('click', () => { goTo(+dot.dataset.index); startAuto(); });
  });

  // Keyboard arrows on focused slider
  track.closest('.hero-slider')?.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { prev(); startAuto(); }
    if (e.key === 'ArrowRight') { next(); startAuto(); }
  });

  startAuto();
})();

/* ════════════════════════════════════════
   GALLERY LIGHTBOX
════════════════════════════════════════ */
(function initLightbox() {
  const lb       = $('#lightbox');
  const lbImg    = $('#lb-img');
  const lbClose  = $('#lb-close');
  const lbPrev   = $('#lb-prev');
  const lbNext   = $('#lb-next');
  const lbCount  = $('#lb-counter');
  if (!lb) return;

  const cards = $$('.gallery-card');
  let current = 0;

  // Build list of valid images only
  const images = [];
  cards.forEach((card, i) => {
    const img = $('img', card);
    if (img) {
      images.push({ src: img.src, alt: img.alt || 'Gallery image' });
      card.addEventListener('click', () => open(i));
    }
  });

  function open(idx) {
    current = idx;
    showImage(current);
    lb.classList.add('open');
    lb.removeAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
    lbClose?.focus();
  }

  function close() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function showImage(idx) {
    current = (idx + images.length) % images.length;
    if (lbImg) {
      lbImg.style.opacity = '0';
      setTimeout(() => {
        lbImg.src = images[current].src;
        lbImg.alt = images[current].alt;
        lbImg.style.opacity = '1';
      }, 150);
    }
    if (lbCount) lbCount.textContent = `${current + 1} / ${images.length}`;
  }

  lbClose?.addEventListener('click', close);
  lbPrev?.addEventListener('click', () => showImage(current - 1));
  lbNext?.addEventListener('click', () => showImage(current + 1));

  lb.addEventListener('click', e => { if (e.target === lb) close(); });

  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowLeft')  showImage(current - 1);
    if (e.key === 'ArrowRight') showImage(current + 1);
  });
})();

/* ════════════════════════════════════════
   COPY BUTTONS
════════════════════════════════════════ */
(function initCopyBtns() {
  $$('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      btn.classList.add('copied');
      const span = btn.querySelector('span');
      const orig = span?.textContent || 'Copy';
      if (span) span.textContent = 'Copied!';
      setTimeout(() => {
        btn.classList.remove('copied');
        if (span) span.textContent = orig;
      }, 2000);
    });
  });
})();

/* ════════════════════════════════════════
   CONTACT FORM
════════════════════════════════════════ */
(function initContactForm() {
  const form   = $('#contact-form');
  const status = $('#contact-status');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name    = form.name.value.trim();
    const contact = form.contact.value.trim();
    const subject = form.subject.value.trim();
    const message = form.message.value.trim();

    if (!name || !contact || !subject || !message) {
      showStatus(status, 'Please fill in all required fields.', 'error');
      return;
    }

    const body = `Name: ${name}%0AContact: ${contact}%0ASubject: ${subject}%0AMessage: ${message}`;
    window.open(`mailto:tahirhaider2@gmail.com?subject=${encodeURIComponent(subject)}&body=${body}`, '_blank');
    form.reset();
    showStatus(status, 'Message opened in your email client. Thank you!', 'success');
  });
})();

/* ════════════════════════════════════════
   DONATE FORM (WhatsApp)
════════════════════════════════════════ */
(function initDonateForm() {
  const form   = $('#donate-form');
  const status = $('#donate-status');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const name     = form.donorName?.value.trim()    || '';
    const email    = form.email?.value.trim()         || '';
    const phone    = form.phone?.value.trim()         || '';
    const type     = form.donationType?.value         || '';
    const purpose  = form.purpose?.value              || '';
    const amount   = form.amount?.value.trim()        || '';
    const city     = form.city?.value.trim()          || '';
    const country  = form.country?.value.trim()       || '';
    const subject  = form.subject?.value.trim()       || '';
    const message  = form.message?.value.trim()       || '';

    if (!name || !phone || !type || !purpose || !amount) {
      showStatus(status, 'Please fill in all required fields (Name, Phone, Type, Purpose, Amount).', 'error');
      return;
    }

    const lines = [
      `*Al Haider Foundation — Donation Request*`,
      ``,
      `*Donor Name:* ${name}`,
      `*Email:* ${email || '-'}`,
      `*Phone:* ${phone}`,
      `*City/Country:* ${city || '-'} / ${country || '-'}`,
      ``,
      `*Type of Donation:* ${type}`,
      `*Purpose:* ${purpose}`,
      `*Amount (PKR):* ${amount}`,
      subject ? `*Subject:* ${subject}` : '',
      message ? `*Message:* ${message}` : '',
      ``,
      `_Bank: Meezan Bank | Account: 0100388517 | Title: Tahir Haider_`,
      `_JazzCash/Easypaisa: 03005245300_`,
    ].filter(Boolean).join('%0A');

    window.open(`https://wa.me/923005245300?text=${lines}`, '_blank');
    form.reset();
    showStatus(status, '✓ WhatsApp opened! Please send the pre-filled message to confirm your donation.', 'success');
  });
})();

/* ════════════════════════════════════════
   SMOOTH SCROLL for anchor links
════════════════════════════════════════ */
(function initSmoothScroll() {
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();

/* ════════════════════════════════════════
   SCROLL FADE ANIMATIONS
════════════════════════════════════════ */
(function initFadeAnimations() {
  const els = $$('.fade-up');
  if (!els.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('visible');
        obs.unobserve(en.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  els.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 5) * 0.07}s`;
    obs.observe(el);
  });
})();

/* ════════════════════════════════════════
   GALLERY — hide broken images
════════════════════════════════════════ */
(function initGalleryImages() {
  $$('.gallery-card img').forEach(img => {
    img.addEventListener('error', () => {
      const card = img.closest('.gallery-card');
      if (card) card.style.display = 'none';
    });
  });
})();

/* ════════════════════════════════════════
   UTILITY
════════════════════════════════════════ */
function showStatus(el, msg, type) {
  if (!el) return;
  el.textContent = msg;
  el.className = `form-status ${type}`;
  setTimeout(() => { el.textContent = ''; el.className = 'form-status'; }, 5000);
}
