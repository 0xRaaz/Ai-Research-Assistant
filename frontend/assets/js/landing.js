/* ═══════════════════════════════════════════════════
   RESEARCH AI — Landing Page JS
   File: frontend/assets/js/landing.js
   Handles: AOS, Typed.js, mobile nav, smooth scroll,
            nav scroll-blur, pipeline animation
═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ─────────────────────────────────────────
     AOS — Animate On Scroll
  ───────────────────────────────────────── */
  AOS.init({
    duration: 600,
    easing: 'ease-out-cubic',
    once: true,
    offset: 60,
  });


  /* ─────────────────────────────────────────
     TYPED.JS — Hero heading typewriter
     Targets .hero-heading .gradient-text if
     you want to animate — currently the heading
     is static. Typed is used for a sub-tagline
     if you add <span id="typed-target"></span>
  ───────────────────────────────────────── */
  const typedEl = document.getElementById('typed-target');
  if (typedEl) {
    new Typed('#typed-target', {
      strings: [
        'Understand any paper.',
        'Ask. Get cited answers.',
        'Read less. Know more.',
      ],
      typeSpeed: 48,
      backSpeed: 28,
      backDelay: 2200,
      loop: true,
      cursorChar: '_',
    });
  }


  /* ─────────────────────────────────────────
     MOBILE NAV TOGGLE
  ───────────────────────────────────────── */
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('nav-open');
      navToggle.textContent = isOpen ? '✕' : '☰';
      navToggle.setAttribute('aria-expanded', isOpen);
    });

    // Close nav when a link is clicked
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('nav-open');
        navToggle.textContent = '☰';
        navToggle.setAttribute('aria-expanded', false);
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
        navLinks.classList.remove('nav-open');
        navToggle.textContent = '☰';
      }
    });
  }


  /* ─────────────────────────────────────────
     NAV SCROLL EFFECT
     Adds glass blur + border when scrolled
  ───────────────────────────────────────── */
  const nav = document.querySelector('.nav');

  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 40) {
        nav.style.background    = 'rgba(12,12,12,0.85)';
        nav.style.backdropFilter = 'blur(20px)';
        nav.style.webkitBackdropFilter = 'blur(20px)';
        nav.style.borderBottom  = '1px solid rgba(255,255,255,0.06)';
        nav.style.position      = 'fixed';
      } else {
        nav.style.background    = 'transparent';
        nav.style.backdropFilter = 'none';
        nav.style.webkitBackdropFilter = 'none';
        nav.style.borderBottom  = 'none';
        nav.style.position      = 'absolute';
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // run on load
  }


  /* ─────────────────────────────────────────
     SMOOTH SCROLL for anchor links
  ───────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = 80; // nav height compensation
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });


  /* ─────────────────────────────────────────
     ACTIVE NAV LINK on scroll
  ───────────────────────────────────────── */
  const sections = document.querySelectorAll('section[id]');
  const navLinkEls = document.querySelectorAll('.nav-links .nav-link');

  const highlightNav = () => {
    let current = '';
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 120) {
        current = sec.getAttribute('id');
      }
    });

    navLinkEls.forEach(link => {
      link.style.color = '';
      link.style.background = '';
      if (link.getAttribute('href') === `#${current}`) {
        link.style.color = 'var(--text)';
        link.style.background = 'var(--surface-3)';
      }
    });
  };

  window.addEventListener('scroll', highlightNav, { passive: true });


  /* ─────────────────────────────────────────
     BENTO CARD — Lime glow on hover
  ───────────────────────────────────────── */
  document.querySelectorAll('.bento-card:not(.bento-card-accent)').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.boxShadow = '0 0 40px rgba(204,255,0,0.06)';
      card.style.transform  = 'translateY(-2px)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.boxShadow = '';
      card.style.transform  = '';
    });
  });


  /* ─────────────────────────────────────────
     PIPELINE CODE — Animate steps sequentially
     on scroll into view
  ───────────────────────────────────────── */
  const pipelineCard = document.querySelector('.pipeline-card');

  if (pipelineCard) {
    const codeSteps = pipelineCard.querySelectorAll('.code-step');

    // Start all steps dim
    codeSteps.forEach(step => {
      step.style.opacity = '0.25';
      step.style.transition = 'opacity 0.4s ease, color 0.3s ease';
    });

    let animated = false;

    const animatePipeline = () => {
      if (animated) return;
      const rect = pipelineCard.getBoundingClientRect();
      if (rect.top < window.innerHeight - 100) {
        animated = true;
        codeSteps.forEach((step, i) => {
          setTimeout(() => {
            step.style.opacity = '1';
            step.style.color   = 'var(--text)';
          }, i * 280);
        });
      }
    };

    window.addEventListener('scroll', animatePipeline, { passive: true });
    animatePipeline(); // check on load
  }


  /* ─────────────────────────────────────────
     TECH PILL — Tilt on hover
  ───────────────────────────────────────── */
  document.querySelectorAll('.tech-pill').forEach(pill => {
    pill.addEventListener('mouseenter', () => {
      pill.style.transform = 'translateY(-2px) scale(1.03)';
    });
    pill.addEventListener('mouseleave', () => {
      pill.style.transform = '';
    });
  });


  /* ─────────────────────────────────────────
     STEP ITEMS — Highlight on scroll
  ───────────────────────────────────────── */
  const stepItems = document.querySelectorAll('.step-item');

  if (stepItems.length) {
    const observeSteps = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateX(0)';
        }
      });
    }, { threshold: 0.3 });

    stepItems.forEach((step, i) => {
      step.style.opacity = '0';
      step.style.transform = 'translateX(-16px)';
      step.style.transition = `all 0.5s ease ${i * 0.12}s`;
      observeSteps.observe(step);
    });
  }


  /* ─────────────────────────────────────────
     FOOTER CTA BUTTON — Particle burst on click
  ───────────────────────────────────────── */
  const footerBtn = document.querySelector('.footer-btn');

  if (footerBtn) {
    footerBtn.addEventListener('click', (e) => {
      // Small ripple effect
      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position: absolute;
        width: 8px; height: 8px;
        background: rgba(0,0,0,0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple-burst 0.5s ease-out forwards;
        left: ${e.offsetX - 4}px;
        top: ${e.offsetY - 4}px;
        pointer-events: none;
      `;
      footerBtn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 500);
    });
  }


  /* ─────────────────────────────────────────
     HERO MOCKUP — Subtle parallax on mouse move
  ───────────────────────────────────────── */
  const heroMockup = document.querySelector('.hero-mockup');
  const heroRight  = document.querySelector('.hero-right');

  if (heroMockup && heroRight && window.innerWidth > 768) {
    heroRight.addEventListener('mousemove', (e) => {
      const rect = heroRight.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;

      heroMockup.style.transform = `
        perspective(800px)
        rotateY(${dx * 6}deg)
        rotateX(${-dy * 4}deg)
        translateY(0px)
      `;
    });

    heroRight.addEventListener('mouseleave', () => {
      heroMockup.style.transform = '';
      heroMockup.style.transition = 'transform 0.6s ease';
      setTimeout(() => { heroMockup.style.transition = ''; }, 600);
    });
  }


  /* ─────────────────────────────────────────
     CSS INJECTION — Mobile nav open styles
     (avoids needing auth.css for nav state)
  ───────────────────────────────────────── */
  const mobileNavStyle = document.createElement('style');
  mobileNavStyle.textContent = `
    @media (max-width: 768px) {
      .nav-links.nav-open {
        display: flex !important;
        flex-direction: column;
        position: absolute;
        top: 68px;
        left: 16px;
        right: 16px;
        background: rgba(12,12,12,0.97);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        padding: 12px;
        gap: 4px;
        z-index: 200;
      }

      .nav-links.nav-open .nav-link {
        padding: 12px 16px;
        border-radius: 10px;
        width: 100%;
      }
    }

    @keyframes ripple-burst {
      to { transform: scale(20); opacity: 0; }
    }
  `;
  document.head.appendChild(mobileNavStyle);

});