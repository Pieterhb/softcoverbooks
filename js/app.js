/**
 * SKATKISBOEKE - Modern Vintage Pulp Interactive Script
 * Instant Search, Multi-Filter, Touch Lightbox & Mobile Navigation
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.toLowerCase().includes('fotoverhaal') || document.title.toLowerCase().includes('fotoverhaal')) {
    document.body.classList.add('fotoverhale-page');
  }
  initMobileNav();
  initSearchAndFilter();
  initLightbox();
  initAnchorNav();
});

// Anchor Nav & Instant Section Positioning
function initAnchorNav() {
  const SECTION_MAP = {
    'storieboeke': 'storieboeke',
    'fotoverhale': 'fotoverhale',
    'uitgewers': 'uitgewers',
    'enkelboeke': 'uitgewers',
    'skrywers': 'skrywers'
  };

  function getTarget(hash) {
    if (!hash) return null;
    const clean = hash.replace(/^#/, '').toLowerCase();
    const id = SECTION_MAP[clean] || clean;
    return document.getElementById(id) || document.getElementById(clean);
  }

  function clearCaretAndFocus() {
    if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  }

  function scrollToHash() {
    if (!window.location.hash) return;
    const target = getTarget(window.location.hash);
    if (target) {
      target.scrollIntoView({ behavior: 'instant', block: 'start' });
      updateActiveNav(window.location.hash);
      clearCaretAndFocus();
    }
  }

  function updateActiveNav(hash) {
    if (!hash) return;
    const clean = hash.replace(/^#/, '').toLowerCase();
    const mapped = SECTION_MAP[clean] || clean;
    document.querySelectorAll('.main-nav .nav-link').forEach(link => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      const match = href.includes('#' + mapped) || href.includes('#' + clean);
      if (match) {
        link.classList.add('active');
      } else if (href.includes('#') || href.endsWith('index.html')) {
        link.classList.remove('active');
      }
    });
  }

  // Handle Home link when already on index page
  const homeLinks = document.querySelectorAll('.main-nav a[href="index.html"], .logo-group');
  homeLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const isHome = document.getElementById('storieboeke');
      if (isHome && (window.location.hash || window.scrollY > 50)) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'instant' });
        history.pushState(null, '', window.location.pathname);
        document.querySelectorAll('.main-nav .nav-link').forEach(l => l.classList.remove('active'));
        const firstLink = document.querySelector('.main-nav .nav-link');
        if (firstLink) firstLink.classList.add('active');
        clearCaretAndFocus();
      }
    });
  });

  // Also remove focus on any anchor link click in the nav
  document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', () => {
      setTimeout(clearCaretAndFocus, 10);
      setTimeout(clearCaretAndFocus, 50);
    });
  });

  // If page loaded with hash, scroll instantly to target section (and retry as images finish loading)
  if (window.location.hash) {
    scrollToHash();
    setTimeout(scrollToHash, 50);
    setTimeout(scrollToHash, 150);
    setTimeout(scrollToHash, 350);
    setTimeout(scrollToHash, 600);
    window.addEventListener('load', scrollToHash);
  }

  // Handle in-page hash changes (clicks or back/forward)
  window.addEventListener('hashchange', () => {
    scrollToHash();
  });
}

// Mobile Navigation Toggle
function initMobileNav() {
  const toggleBtn = document.querySelector('.mobile-nav-toggle');
  const mainNav = document.querySelector('.main-nav');
  if (!toggleBtn || !mainNav) return;

  toggleBtn.addEventListener('click', () => {
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleBtn.setAttribute('aria-expanded', !isExpanded);
    mainNav.classList.toggle('nav-open');
    if (mainNav.classList.contains('nav-open')) {
      mainNav.style.display = 'block';
    } else {
      mainNav.style.display = '';
    }
  });
}

// Instant Search & Category Filter
function initSearchAndFilter() {
  const bookCards = document.querySelectorAll('.book-card');
  const seriesCards = document.querySelectorAll('.series-card');
  if (bookCards.length === 0 && seriesCards.length === 0) return;

  const searchInput = document.querySelector('.search-input');
  const filterChips = document.querySelectorAll('.filter-chip');
  const resultCount = document.querySelector('.section-count');

  let activeCategory = 'all';
  let searchTerm = '';

  function applyFilters() {
    let visibleCount = 0;

    // Filter books
    bookCards.forEach(card => {
      const title = (card.dataset.title || '').toLowerCase();
      const author = (card.dataset.author || '').toLowerCase();
      const series = (card.dataset.series || '').toLowerCase();
      const category = (card.dataset.category || 'all').toLowerCase();

      const matchesSearch = !searchTerm || title.includes(searchTerm) || author.includes(searchTerm) || series.includes(searchTerm);
      const matchesCategory = activeCategory === 'all' || category === activeCategory;

      if (matchesSearch && matchesCategory) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    // Filter series if present
    seriesCards.forEach(card => {
      const name = (card.dataset.name || '').toLowerCase();
      const cat = (card.dataset.category || 'all').toLowerCase();

      const matchesSearch = !searchTerm || name.includes(searchTerm);
      const matchesCategory = activeCategory === 'all' || cat === activeCategory;

      if (matchesSearch && matchesCategory) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    if (resultCount) {
      resultCount.textContent = `${visibleCount} items gevind`;
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.trim().toLowerCase();
      applyFilters();
    });
  }

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCategory = (chip.dataset.filter || 'all').toLowerCase();
      applyFilters();
    });
  });
}

// Fullscreen Touch Lightbox Modal
let currentLightboxIndex = -1;
let currentItems = [];

function initLightbox() {
  const modal = document.getElementById('lightboxModal');
  if (!modal) return;

  const closeBtn = modal.querySelector('.lightbox-close-btn');
  const prevBtn = modal.querySelector('.lightbox-prev-btn');
  const nextBtn = modal.querySelector('.lightbox-next-btn');
  const imgEl = modal.querySelector('.lightbox-img');
  const titleEl = modal.querySelector('.lightbox-title');
  const seriesEl = modal.querySelector('.lightbox-series-tag');
  const authorEl = modal.querySelector('.lightbox-author-val');
  const yearEl = modal.querySelector('.lightbox-year-val');
  const publisherEl = modal.querySelector('.lightbox-publisher-val');
  const numberEl = modal.querySelector('.lightbox-number-val');
  const notesEl = modal.querySelector('.lightbox-notes-val');

  function openLightbox(index) {
    currentLightboxIndex = index;
    const item = currentItems[index];
    if (!item) return;

    imgEl.src = item.src;
    imgEl.alt = item.title || 'Boek voorblad';
    titleEl.textContent = item.title || 'Voorblad';
    seriesEl.textContent = item.series || '';
    authorEl.textContent = item.author || 'Onbekend / Africana Argief';
    yearEl.textContent = item.year || 'c. 1950 - 1980';
    publisherEl.textContent = item.publisher || 'Pronk / Sirkel / APB';
    numberEl.textContent = item.number ? `#${item.number}` : '-';

    const authorLabelCell = authorEl ? authorEl.closest('tr')?.querySelector('td:first-child') : null;
    const isFotoverhaal = document.body.classList.contains('fotoverhale-page') ||
                          (item.src && item.src.toLowerCase().includes('fotoverhale')) ||
                          (item.series && item.series.toLowerCase().includes('fotoverhaal')) ||
                          window.location.pathname.toLowerCase().includes('fotoverhaal');
    if (authorLabelCell) {
      authorLabelCell.textContent = isFotoverhaal ? 'Titel:' : 'Skrywer / Outeur:';
    }
    
    if (item.notes) {
      notesEl.parentElement.style.display = 'block';
      notesEl.textContent = item.notes;
    } else {
      notesEl.parentElement.style.display = 'none';
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function nextItem() {
    if (currentItems.length === 0) return;
    currentLightboxIndex = (currentLightboxIndex + 1) % currentItems.length;
    openLightbox(currentLightboxIndex);
  }

  function prevItem() {
    if (currentItems.length === 0) return;
    currentLightboxIndex = (currentLightboxIndex - 1 + currentItems.length) % currentItems.length;
    openLightbox(currentLightboxIndex);
  }

  // Collect all book cards on the page
  const cards = Array.from(document.querySelectorAll('.book-card'));
  currentItems = cards.map(c => ({
    src: c.dataset.src || c.querySelector('img')?.src || '',
    title: c.dataset.title || c.querySelector('.book-title')?.textContent || '',
    author: c.dataset.author || c.querySelector('.book-author')?.textContent || '',
    series: c.dataset.series || '',
    number: c.dataset.number || '',
    year: c.dataset.year || '',
    publisher: c.dataset.publisher || '',
    notes: c.dataset.notes || ''
  }));

  cards.forEach((card, idx) => {
    card.addEventListener('click', () => openLightbox(idx));
  });

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', prevItem);
  if (nextBtn) nextBtn.addEventListener('click', nextItem);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeLightbox();
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextItem();
    if (e.key === 'ArrowLeft') prevItem();
  });

  // Mobile Touch Swipe support
  let touchStartX = 0;
  let touchEndX = 0;

  modal.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  modal.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 40) {
      if (diff < 0) {
        nextItem(); // swipe left -> next
      } else {
        prevItem(); // swipe right -> prev
      }
    }
  }
}
