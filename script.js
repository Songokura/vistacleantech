(function () {
  'use strict';
  var d = document, w = window;
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var ASSET_V = ((d.currentScript && d.currentScript.src.match(/[?&]v=([^&]+)/)) || [])[1] || '';

  /* Интро пропускается при переходе по якорю или уже прокрученной странице */
  if (location.hash || (w.scrollY || 0) > 80) d.documentElement.classList.add('no-intro');

  /* ---------- Языки: RU в разметке, KZ и EN - отдельными файлами ---------- */
  var I18N = { ru: {} };
  var LANG_FILES = { kk: { file: 'assets/lang/kk.js', global: 'SITE_KK' }, en: { file: 'assets/lang/en.js', global: 'SITE_EN' } };
  var META = { ru: { title: d.title, desc: (d.querySelector('meta[name="description"]') || {}).content || '' } };
  var nodes = {}, phNodes = {};
  d.querySelectorAll('[data-i]').forEach(function (el) {
    var k = el.getAttribute('data-i');
    (nodes[k] = nodes[k] || []).push(el);
    if (!(k in I18N.ru)) I18N.ru[k] = el.innerHTML;
  });
  d.querySelectorAll('[data-i-ph]').forEach(function (el) {
    var k = el.getAttribute('data-i-ph');
    (phNodes[k] = phNodes[k] || []).push(el);
    if (!(k in I18N.ru)) I18N.ru[k] = el.getAttribute('placeholder') || '';
  });
  /* Метки этапов карты в разметке не стоят - русский текст задан здесь */
  var MAP_TAGS = { 'map.tag1': 'Разметка зон', 'map.tag2': 'Уборка: галерея A', 'map.tag3': 'Отчёт отправлен', 'map.tag4': 'Уборка: галерея B', 'map.tag5': 'Уборка: атриум' };
  for (var mk in MAP_TAGS) if (!(mk in I18N.ru)) I18N.ru[mk] = MAP_TAGS[mk];
  var curLang = 'ru';
  function t(key) { var dict = I18N[curLang] || {}; return key in dict ? dict[key] : I18N.ru[key]; }
  function loadLang(lang, done) {
    var cfg = LANG_FILES[lang];
    if (I18N[lang] || !cfg) return done();
    var s = d.createElement('script');
    s.src = cfg.file + (ASSET_V ? '?v=' + ASSET_V : '');
    s.onload = function () { if (w[cfg.global]) I18N[lang] = w[cfg.global]; done(); };
    s.onerror = function () { done(); };
    d.head.appendChild(s);
  }
  function applyLang(lang) {
    if (!I18N[lang]) lang = 'ru';
    curLang = lang;
    Object.keys(nodes).forEach(function (k) {
      var v = t(k);
      nodes[k].forEach(function (el) {
        if (el.namespaceURI === 'http://www.w3.org/2000/svg' || el.tagName === 'OPTION') el.textContent = v.replace(/&nbsp;/g, ' ');
        else el.innerHTML = v;
      });
    });
    Object.keys(phNodes).forEach(function (k) { phNodes[k].forEach(function (el) { el.setAttribute('placeholder', t(k)); }); });
    d.documentElement.lang = lang;
    var dict = I18N[lang];
    d.title = dict['meta.title'] || META.ru.title;
    var md = d.querySelector('meta[name="description"]');
    if (md) md.content = dict['meta.desc'] || META.ru.desc;
    d.querySelectorAll('.lang-b').forEach(function (b) {
      var on = b.dataset.lang === lang;
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('is-active', on);
    });
    lastTag = -1; mapTick();
    fitAll();
  }
  function setLang(lang, save) {
    if (!LANG_FILES[lang]) lang = 'ru';
    loadLang(lang, function () {
      applyLang(lang);
      if (save) { try { localStorage.setItem('lang', lang); } catch (e) {} }
    });
  }
  d.querySelectorAll('.lang-b').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.dataset.lang, true); });
  });

  /* fitText: дисплейные заголовки уменьшаются шагом 5%, пока самое длинное слово не влезет */
  var fitEls = d.querySelectorAll('[data-fit]');
  function fitOne(el) {
    el.style.fontSize = '';
    var base = parseFloat(getComputedStyle(el).fontSize), size = base, n = 0;
    while (el.scrollWidth > el.clientWidth + 1 && n < 8) { size *= .95; el.style.fontSize = size + 'px'; n++; }
  }
  function fitAll() { fitEls.forEach(fitOne); }

  /* ---------- Шапка ---------- */
  var hdr = d.getElementById('hdr');
  function hdrState() { hdr.classList.toggle('is-solid', (w.scrollY || 0) > 24); }

  /* Бургер */
  var burger = d.getElementById('burger');
  function openMenu(open) {
    d.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
  }
  burger.addEventListener('click', function () { openMenu(!d.body.classList.contains('menu-open')); });
  d.querySelectorAll('#nav a').forEach(function (a) { a.addEventListener('click', function () { openMenu(false); }); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.body.classList.contains('menu-open')) openMenu(false); });

  /* Якоря: своя прокрутка с учётом шапки */
  var hdrH = function () { return hdr.offsetHeight; };
  d.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var tg = id && d.getElementById(id);
      if (!tg) return;
      e.preventDefault();
      if (a.dataset.need || a.dataset.dir || a.dataset.obj) prefill(a.dataset);
      var top = tg.getBoundingClientRect().top + w.scrollY - (id === 'hero' || id === 'map' ? 0 : hdrH() - 1);
      w.scrollTo({ top: top, behavior: 'smooth' });
      if (history.pushState) history.pushState(null, '', '#' + id);
    });
  });

  /* Проявления медиа */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
  d.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });

  /* ---------- Карта объекта - сцена идёт сама, пока видна ---------- */
  var mapw = d.getElementById('map');
  var mapCard = d.getElementById('mapCard');
  var route = d.getElementById('mapRoute');
  var cover = d.getElementById('mapCover');
  var walls = mapCard.querySelector('.map-walls');
  var bot = d.getElementById('mapBot');
  var tag = d.getElementById('mapTag');
  var steps = d.querySelectorAll('#mapSteps li');
  var len = route.getTotalLength();
  var A_END = 910, B_END = 2354; /* длина маршрута на выходе из галереи A и из галереи B */
  var MAP_DUR = 14000, MAP_HOLD = 2600, MAP_LOOP = .26;
  route.style.strokeDasharray = cover.style.strokeDasharray = len + ' ' + len;
  walls.style.strokeDasharray = '2000 2000';
  var lastTag = -1, lastStep = -1, mapP = 0;
  function mapTick() {
    var p = mapP;
    var m = .4 + .6 * easeOut(clamp(p / .12));
    var z = easeOut(clamp((p - .1) / .14));
    var rp = clamp((p - .3) / .62);
    var done = clamp((p - .92) / .08);
    var L = len * rp;
    walls.style.strokeDashoffset = (2000 * (1 - m)).toFixed(1);
    route.style.strokeDashoffset = cover.style.strokeDashoffset = (len - L).toFixed(1);
    route.style.visibility = cover.style.visibility = L < 1 ? 'hidden' : 'visible';
    mapCard.style.setProperty('--m', m.toFixed(3));
    mapCard.style.setProperty('--z', z.toFixed(3));
    mapCard.style.setProperty('--bot', p > .28 ? 1 : 0);
    mapCard.style.setProperty('--done', done.toFixed(3));
    var pt = route.getPointAtLength(L);
    var pt2 = route.getPointAtLength(Math.min(len, L + 2));
    var ang = L >= len - 2 ? 0 : Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI;
    bot.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ') rotate(' + ang.toFixed(0) + ') scale(1.6)');
    var ti = p < .12 ? 0 : p < .3 ? 1 : p >= .92 ? 3 : L < A_END ? 2 : L < B_END ? 4 : 5;
    if (ti !== lastTag) { tag.textContent = t('map.tag' + ti); lastTag = ti; }
    var si = p < .12 ? 0 : p < .3 ? 1 : 2;
    if (si !== lastStep) { steps.forEach(function (li, i) { li.classList.toggle('is-on', i === si); }); lastStep = si; }
  }
  var mapRun = false, mapT0 = 0, mapFrom = 0;
  function mapFrame(now) {
    if (!mapRun) return;
    var e = now - mapT0, span = MAP_DUR * (1 - mapFrom);
    if (e < span) mapP = mapFrom + (1 - mapFrom) * e / span;
    else if (e < span + MAP_HOLD) mapP = 1;
    else { mapFrom = MAP_LOOP; mapT0 = now; mapP = MAP_LOOP; }
    mapTick();
    w.requestAnimationFrame(mapFrame);
  }
  if (w.matchMedia('(prefers-reduced-motion: reduce)').matches) { mapP = 1; }
  else {
    new IntersectionObserver(function (es) {
      var vis = es[0].isIntersecting;
      if (vis && !mapRun) { mapRun = true; mapFrom = mapP >= 1 ? MAP_LOOP : mapP; mapT0 = performance.now(); w.requestAnimationFrame(mapFrame); }
      else if (!vis) mapRun = false;
    }, { threshold: .35 }).observe(mapCard);
  }

  /* ---------- Лента объектов: шаг - одна карточка ---------- */
  var lens = d.getElementById('lens');
  var prev = d.getElementById('lensPrev'), next = d.getElementById('lensNext');
  function lensStep() {
    var c = lens.querySelector('.obj');
    var gap = parseFloat(getComputedStyle(lens).columnGap) || 18;
    return c ? c.getBoundingClientRect().width + gap : 300;
  }
  function lensState() {
    var max = lens.scrollWidth - lens.clientWidth;
    var fits = max <= 1;
    prev.hidden = next.hidden = fits;
    prev.disabled = lens.scrollLeft < 4;
    next.disabled = lens.scrollLeft > max - 4;
  }
  prev.addEventListener('click', function () { lens.scrollBy({ left: -lensStep(), behavior: 'smooth' }); });
  next.addEventListener('click', function () { lens.scrollBy({ left: lensStep(), behavior: 'smooth' }); });
  lens.addEventListener('scroll', lensState, { passive: true });
  lens.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { lens.scrollBy({ left: lensStep(), behavior: 'smooth' }); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { lens.scrollBy({ left: -lensStep(), behavior: 'smooth' }); e.preventDefault(); }
  });

  /* ---------- Липкая панель: после половины героя, прячется на контактах ---------- */
  var sticky = d.getElementById('sticky');
  var hero = d.getElementById('hero');
  var contacts = d.getElementById('contacts');
  function stickyState() {
    var y = w.scrollY || 0;
    var H = w.innerHeight;
    var show = y > hero.offsetHeight * .55 && contacts.getBoundingClientRect().top > H * .6;
    sticky.classList.toggle('on', show);
  }

  /* ---------- Форма: предзаполнение из кнопок и отправка в WhatsApp ---------- */
  var form = d.getElementById('leadForm');
  var err = d.getElementById('fErr');
  function setSelectByRu(sel, ruText) {
    var opts = sel.querySelectorAll('option');
    for (var i = 0; i < opts.length; i++) {
      var k = opts[i].getAttribute('data-i');
      if ((k && I18N.ru[k] === ruText) || opts[i].value === ruText) { sel.selectedIndex = i; return; }
    }
  }
  function prefill(ds) {
    var need = d.getElementById('f-need'), obj = d.getElementById('f-object'), task = d.getElementById('f-task');
    if (ds.need) setSelectByRu(need, ds.need);
    if (ds.obj) setSelectByRu(obj, ds.obj);
    if (ds.dir && !task.value) task.value = ds.dir;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = function (id) { return (d.getElementById(id).value || '').trim(); };
    if (v('f-website')) return;
    var ok = v('f-name') && v('f-phone').replace(/\D/g, '').length >= 10 && d.getElementById('f-agree').checked;
    err.hidden = !!ok;
    if (!ok) { err.textContent = t('fm.err'); return; }
    var lbl = function (k) { return t(k).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' '); };
    var lines = ['CleanTech by VISTA',
      lbl('fm.name') + ': ' + v('f-name'),
      lbl('fm.phone') + ': ' + v('f-phone'),
      v('f-company') ? lbl('fm.company') + ': ' + v('f-company') : '',
      v('f-object') ? lbl('fm.object') + ': ' + v('f-object') : '',
      lbl('fm.need') + ': ' + v('f-need'),
      v('f-task') ? lbl('fm.task') + ': ' + v('f-task') : '',
      v('f-comment') ? lbl('fm.comment') + ': ' + v('f-comment') : ''].filter(Boolean);
    w.open('https://wa.me/77018770033?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
    var btn = form.querySelector('button[type=submit] span');
    btn.textContent = t('fm.sent') || 'Заявка открыта в WhatsApp - нажмите «Отправить»';
    form.classList.add('is-sent');
  });

  /* ---------- Один цикл чтения на кадр ---------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    w.requestAnimationFrame(function () { hdrState(); stickyState(); ticking = false; });
  }
  w.addEventListener('scroll', onScroll, { passive: true });
  var lastW = w.innerWidth;
  w.addEventListener('resize', function () {
    if (w.innerWidth === lastW) return;
    lastW = w.innerWidth;
    lensState(); fitAll(); onScroll();
  });
  w.addEventListener('load', function () { lensState(); });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(fitAll);

  /* Старт: ?lang= главнее сохранённого выбора; язык браузера не угадываем */
  var forced = (location.search.match(/[?&]lang=(ru|kk|en)/) || [])[1];
  var saved = '';
  try { saved = localStorage.getItem('lang') || ''; } catch (e) {}
  var startLang = forced || saved || 'ru';
  hdrState(); mapTick(); lensState(); stickyState();
  if (startLang !== 'ru') setLang(startLang, false);
  else { d.querySelectorAll('.lang-b').forEach(function (b) { b.classList.toggle('is-active', b.dataset.lang === 'ru'); }); fitAll(); }
})();
