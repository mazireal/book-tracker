'use strict';

/* ردیاب کتاب — Book Tracker
   داده‌ها فقط در localStorage مرورگر ذخیره می‌شوند؛ جستجو و جلد کتاب‌ها از Open Library می‌آید. */

var STORAGE_KEY = 'book-tracker-v1';
var SEARCH_LIMIT = 20;

var SHELVES = {
  read: 'خوانده‌ام',
  reading: 'در حال خواندن',
  want: 'می‌خواهم بخوانم'
};

var PLACEHOLDER_COVER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180" viewBox="0 0 120 180">' +
  '<rect width="120" height="180" rx="8" fill="#e8e2d6"/>' +
  '<path d="M32 45 h20 a8 8 0 0 1 8 8 v72 a8 8 0 0 0 -8 8 H32 z M88 45 H68 a8 8 0 0 0 -8 8 v72 a8 8 0 0 1 8 8 h20 z" fill="#b3a68d"/>' +
  '</svg>'
);

var state = loadState();
var activeShelf = 'all';
var libraryQuery = '';
var searchAbort = null;
var noteTimer = null;

/* ---------- ذخیره‌سازی ---------- */

function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { books: [] };
    var parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.books)) return { books: [] };
    return parsed;
  } catch (e) {
    return { books: [] };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    /* حافظه پر یا در دسترس نیست؛ در حافظه موقت ادامه می‌دهیم */
  }
}

/* ---------- ابزار ---------- */

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function faNum(n) {
  return Number(n).toLocaleString('fa-IR');
}

function coverUrl(coverId) {
  if (coverId) return 'https://covers.openlibrary.org/b/id/' + coverId + '-M.jpg';
  return PLACEHOLDER_COVER;
}

function findBook(id) {
  for (var i = 0; i < state.books.length; i++) {
    if (state.books[i].id === id) return state.books[i];
  }
  return null;
}

/* ---------- آمار ---------- */

function renderStats() {
  var readCount = 0;
  var readingCount = 0;
  var ratingSum = 0;
  var ratingCount = 0;

  state.books.forEach(function (b) {
    if (b.shelf === 'read') readCount++;
    if (b.shelf === 'reading') readingCount++;
    if (b.rating > 0) {
      ratingSum += b.rating;
      ratingCount++;
    }
  });

  document.getElementById('stat-read').textContent = faNum(readCount);
  document.getElementById('stat-reading').textContent = faNum(readingCount);
  document.getElementById('stat-rating').textContent = ratingCount > 0
    ? (ratingSum / ratingCount).toLocaleString('fa-IR', { maximumFractionDigits: 1 })
    : '—';
}

/* ---------- جستجو ---------- */

async function searchBooks(query) {
  var statusEl = document.getElementById('search-status');
  var resultsEl = document.getElementById('search-results');

  if (searchAbort) searchAbort.abort();
  searchAbort = new AbortController();

  statusEl.textContent = 'در حال جستجو…';
  resultsEl.innerHTML = '';

  try {
    var url = 'https://openlibrary.org/search.json?q=' + encodeURIComponent(query) +
      '&limit=' + SEARCH_LIMIT + '&fields=key,title,author_name,first_publish_year,cover_i';
    var res = await fetch(url, { signal: searchAbort.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();

    var seen = {};
    var docs = (data.docs || []).filter(function (d) {
      if (!d || !d.title || !d.key || seen[d.key]) return false;
      seen[d.key] = true;
      return true;
    });

    if (docs.length === 0) {
      statusEl.textContent = 'کتابی پیدا نشد. عبارت دیگری را امتحان کن — برای کتاب‌های ترجمه‌شده، عنوان انگلیسی را هم امتحان کن.';
      return;
    }
    statusEl.textContent = faNum(docs.length) + ' نتیجه';
    renderSearchResults(docs);
  } catch (err) {
    if (err.name === 'AbortError') return;
    statusEl.textContent = 'خطا در جستجو — اتصال اینترنت را بررسی کن و دوباره تلاش کن.';
  }
}

function renderSearchResults(docs) {
  var resultsEl = document.getElementById('search-results');
  resultsEl.innerHTML = docs.map(function (d) {
    var book = {
      id: d.key,
      title: d.title,
      author: (d.author_name && d.author_name[0]) || 'نویسنده نامشخص',
      year: d.first_publish_year || null,
      coverId: d.cover_i || null
    };
    var existing = findBook(book.id);
    var meta = escapeHtml(book.author) + (book.year ? ' · ' + faNum(book.year) : '');
    var actions = existing
      ? '<p class="in-library">در کتابخانه — ' + escapeHtml(SHELVES[existing.shelf] || '') + '</p>'
      : '<div class="shelf-actions">' +
          '<button type="button" data-add-shelf="read">خوانده‌ام</button>' +
          '<button type="button" data-add-shelf="reading">در حال خواندن</button>' +
          '<button type="button" data-add-shelf="want">می‌خواهم بخوانم</button>' +
        '</div>';

    return '<article class="result-card" data-doc="' + escapeHtml(JSON.stringify(book)) + '">' +
      '<img class="cover" data-cover src="' + coverUrl(book.coverId) + '" alt="" loading="lazy">' +
      '<div class="book-body">' +
        '<h3>' + escapeHtml(book.title) + '</h3>' +
        '<p class="meta">' + meta + '</p>' +
        actions +
      '</div>' +
    '</article>';
  }).join('');
}

/* ---------- کتابخانه ---------- */

function filteredBooks() {
  var q = libraryQuery.trim().toLowerCase();
  return state.books
    .filter(function (b) {
      if (activeShelf !== 'all' && b.shelf !== activeShelf) return false;
      if (!q) return true;
      return (b.title || '').toLowerCase().indexOf(q) !== -1 ||
             (b.author || '').toLowerCase().indexOf(q) !== -1;
    })
    .sort(function (a, b) { return (b.addedAt || 0) - (a.addedAt || 0); });
}

function renderLibrary() {
  var listEl = document.getElementById('library-list');
  var emptyEl = document.getElementById('library-empty');
  var books = filteredBooks();

  if (state.books.length === 0) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }

  if (books.length === 0) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'block';
    emptyEl.querySelector('.empty-title').textContent = 'کتابی با این فیلتر پیدا نشد';
    emptyEl.querySelector('p:last-child').textContent = 'فیلتر یا جستجو را تغییر بده.';
    return;
  }

  emptyEl.style.display = 'none';
  listEl.innerHTML = books.map(function (b) {
    var meta = escapeHtml(b.author) + (b.year ? ' · ' + faNum(b.year) : '');
    var stars = '';
    for (var i = 1; i <= 5; i++) {
      stars += '<button type="button" class="star-btn' + (i <= b.rating ? ' filled' : '') +
        '" data-rate="' + i + '" aria-label="' + faNum(i) + ' ستاره">★</button>';
    }
    var shelfOptions = Object.keys(SHELVES).map(function (key) {
      return '<option value="' + key + '"' + (b.shelf === key ? ' selected' : '') + '>' +
        escapeHtml(SHELVES[key]) + '</option>';
    }).join('');

    return '<article class="book-card" data-id="' + escapeHtml(b.id) + '">' +
      '<img class="cover" data-cover src="' + coverUrl(b.coverId) + '" alt="" loading="lazy">' +
      '<div class="book-body">' +
        '<h3>' + escapeHtml(b.title) + '</h3>' +
        '<p class="meta">' + meta + '</p>' +
        '<div class="book-row">' +
          '<select class="shelf-select" aria-label="قفسه">' + shelfOptions + '</select>' +
          '<button type="button" class="delete-btn" data-delete>حذف</button>' +
        '</div>' +
        '<div class="stars">' + stars + '</div>' +
        '<div class="date-row"><label>تاریخ خواندن</label>' +
          '<input type="date" class="date-read" value="' + escapeHtml(b.dateRead || '') + '"></div>' +
        '<textarea class="note" placeholder="درباره این کتاب بنویس… (یادداشت شخصی)">' +
          escapeHtml(b.note || '') + '</textarea>' +
        '<p class="saved-hint"></p>' +
      '</div>' +
    '</article>';
  }).join('');
}

/* ---------- عملیات روی کتاب ---------- */

function addBook(doc, shelf) {
  if (findBook(doc.id)) return;
  state.books.push({
    id: doc.id,
    title: doc.title,
    author: doc.author,
    year: doc.year,
    coverId: doc.coverId,
    shelf: shelf,
    rating: 0,
    note: '',
    dateRead: '',
    addedAt: Date.now()
  });
  saveState();
  renderStats();
  renderLibrary();
}

function refreshAll() {
  saveState();
  renderStats();
  renderLibrary();
}

/* ---------- پشتیبان‌گیری ---------- */

function exportBackup() {
  var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'book-tracker-backup.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importBackup(file) {
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var parsed = JSON.parse(reader.result);
      if (!parsed || !Array.isArray(parsed.books)) throw new Error('bad shape');
      parsed.books = parsed.books.filter(function (b) {
        return b && typeof b.id === 'string' && typeof b.title === 'string';
      }).map(function (b) {
        return {
          id: b.id,
          title: b.title,
          author: b.author || 'نویسنده نامشخص',
          year: b.year || null,
          coverId: b.coverId || null,
          shelf: SHELVES[b.shelf] ? b.shelf : 'want',
          rating: Math.min(5, Math.max(0, Number(b.rating) || 0)),
          note: b.note || '',
          dateRead: b.dateRead || '',
          addedAt: b.addedAt || Date.now()
        };
      });
      state = parsed;
      saveState();
      renderStats();
      renderLibrary();
      alert('بازیابی انجام شد — ' + faNum(state.books.length) + ' کتاب.');
    } catch (e) {
      alert('فایل معتبر نیست. یک فایل پشتیبان JSON این برنامه را انتخاب کن.');
    }
  };
  reader.readAsText(file);
}

/* ---------- رویدادها ---------- */

function init() {
  /* جستجو */
  document.getElementById('search-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var q = document.getElementById('search-input').value.trim();
    if (q) searchBooks(q);
  });

  /* افزودن از نتایج جستجو */
  document.getElementById('search-results').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-add-shelf]');
    if (!btn) return;
    var card = e.target.closest('.result-card');
    var doc = JSON.parse(card.getAttribute('data-doc'));
    addBook(doc, btn.getAttribute('data-add-shelf'));
    /* وضعیت کارت را به «در کتابخانه» تغییر بده */
    var actions = card.querySelector('.shelf-actions');
    if (actions) {
      actions.outerHTML = '<p class="in-library">در کتابخانه — ' +
        escapeHtml(SHELVES[btn.getAttribute('data-add-shelf')]) + '</p>';
    }
  });

  /* تب‌های قفسه */
  document.querySelectorAll('.shelf-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.shelf-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      activeShelf = tab.getAttribute('data-shelf');
      renderLibrary();
    });
  });

  /* جستجو در کتابخانه */
  document.getElementById('library-filter').addEventListener('input', function (e) {
    libraryQuery = e.target.value;
    renderLibrary();
  });

  /* رویدادهای کارت‌های کتابخانه (تفویض رویداد) */
  var listEl = document.getElementById('library-list');

  listEl.addEventListener('click', function (e) {
    var card = e.target.closest('.book-card');
    if (!card) return;
    var book = findBook(card.getAttribute('data-id'));
    if (!book) return;

    var starBtn = e.target.closest('[data-rate]');
    if (starBtn) {
      var value = parseInt(starBtn.getAttribute('data-rate'), 10);
      book.rating = (book.rating === value) ? 0 : value; /* ضربه دوباره = پاک کردن امتیاز */
      refreshAll();
      return;
    }

    if (e.target.closest('[data-delete]')) {
      if (confirm('«' + book.title + '» از کتابخانه حذف شود؟')) {
        state.books = state.books.filter(function (b) { return b.id !== book.id; });
        refreshAll();
      }
    }
  });

  listEl.addEventListener('change', function (e) {
    var card = e.target.closest('.book-card');
    if (!card) return;
    var book = findBook(card.getAttribute('data-id'));
    if (!book) return;

    if (e.target.classList.contains('shelf-select')) {
      book.shelf = e.target.value;
      refreshAll();
    } else if (e.target.classList.contains('date-read')) {
      book.dateRead = e.target.value;
      saveState();
    }
  });

  listEl.addEventListener('input', function (e) {
    if (!e.target.classList.contains('note')) return;
    var card = e.target.closest('.book-card');
    var book = findBook(card.getAttribute('data-id'));
    if (!book) return;
    book.note = e.target.value;
    var hint = card.querySelector('.saved-hint');
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () {
      saveState();
      if (hint) hint.textContent = 'ذخیره شد ✓';
    }, 500);
  });

  /* پشتیبان‌گیری */
  document.getElementById('export-btn').addEventListener('click', exportBackup);
  document.getElementById('import-file').addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) importBackup(e.target.files[0]);
    e.target.value = '';
  });

  /* جایگزین جلد در صورت خطای بارگذاری تصویر */
  document.addEventListener('error', function (e) {
    if (e.target && e.target.tagName === 'IMG' && e.target.hasAttribute('data-cover')) {
      e.target.src = PLACEHOLDER_COVER;
    }
  }, true);

  renderStats();
  renderLibrary();
}

document.addEventListener('DOMContentLoaded', init);
