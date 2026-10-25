/* Заявки: POST JSON на send.php (письмо через msmtp, копия в localStorage).
   Тексты лендинга заданы в index.html. assets/content.json страница не читает:
   деплой не перезаписывает живой файл, и старые правки админки не должны
   подменять новый текст. Ключ likiya:leads — локальный резерв заявок. */
(function () {
  var LEAD_URL = 'send.php';
  var BUDGET_NO = 'нет, сейчас не по бюджету';

  (function () {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var wide = window.matchMedia('(min-width: 1024px)').matches;
    var root = document.documentElement;
    if (!reduce) root.classList.add('motion');

    if (!reduce && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('in');
          io.unobserve(en.target);
        });
      }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
      var order = new WeakMap();
      document.querySelectorAll('.band > .wrap > h2, .band > .wrap > .lead, .ethics, .theory, .fit, .way, .feat, .materials, .quote, .compare-card, .price-card, .case-card, .about-photo, .about-copy, .step.reveal').forEach(function (el) {
        el.classList.add('reveal');
        var parent = el.parentElement;
        var i = order.get(parent) || 0;
        order.set(parent, i + 1);
        if (wide) el.style.transitionDelay = Math.min(i, 4) * 40 + 'ms';
        var rect = el.getBoundingClientRect();
        var view = window.innerHeight || document.documentElement.clientHeight;
        if (rect.top < view * 0.92 && rect.bottom > 0) el.classList.add('in');
        else io.observe(el);
      });
    }

    var bar = document.querySelector('.progress span');
    var nav = document.querySelector('.topnav');
    var line = document.querySelector('.steps.timeline');
    var ticking = false;
    function frame() {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var p = max > 0 ? (doc.scrollTop || document.body.scrollTop) / max : 0;
      if (bar) bar.style.transform = 'scaleX(' + p + ')';
      if (nav) nav.classList.toggle('is-stuck', (doc.scrollTop || document.body.scrollTop) > 8);
      if (line && root.classList.contains('motion')) {
        var rect = line.getBoundingClientRect();
        var head = window.innerHeight * 0.62;
        var draw = (head - rect.top) / Math.max(rect.height, 1);
        line.style.setProperty('--draw', String(Math.min(1, Math.max(0, draw))));
      }
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(frame);
    }, { passive: true });
    frame();

    if (!reduce) {
      document.querySelectorAll('.faq details').forEach(function (d) {
        var summary = d.querySelector('summary');
        var box = d.querySelector('.faq-a');
        if (!summary || !box) return;
        summary.addEventListener('click', function (e) {
          e.preventDefault();
          if (d.open) {
            box.style.gridTemplateRows = '0fr';
            var closed = false;
            var finish = function () {
              if (closed) return;
              closed = true;
              d.open = false;
              box.style.gridTemplateRows = '';
            };
            box.addEventListener('transitionend', function onEnd(ev) {
              if (ev.propertyName !== 'grid-template-rows') return;
              box.removeEventListener('transitionend', onEnd);
              finish();
            });
            setTimeout(finish, 420);
          } else {
            d.open = true;
            box.style.gridTemplateRows = '0fr';
            requestAnimationFrame(function () {
              requestAnimationFrame(function () { box.style.gridTemplateRows = '1fr'; });
            });
          }
        });
      });
    }

    if (fine && wide && !reduce) {
      document.querySelectorAll('.quote, .way, .compare-card, .shot, .fit, .price-card').forEach(function (el) {
        el.setAttribute('data-tilt', '');
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          el.style.setProperty('--tx', (x * 5).toFixed(2) + 'deg');
          el.style.setProperty('--ty', ((-y) * 4).toFixed(2) + 'deg');
        });
        el.addEventListener('pointerleave', function () {
          el.style.setProperty('--tx', '0deg');
          el.style.setProperty('--ty', '0deg');
        });
      });
      document.querySelectorAll('.btn-pill').forEach(function (btn) {
        btn.addEventListener('pointermove', function (e) {
          var r = btn.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          btn.style.transform = 'translate(' + (x * 8).toFixed(1) + 'px,' + (y * 6 - 1).toFixed(1) + 'px)';
        });
        btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
      });
    }
  })();

  var anketaDialog = document.getElementById('anketa-dialog');
  var lastOpener = null;
  document.querySelectorAll('.open-form').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!anketaDialog || typeof anketaDialog.showModal !== 'function') return;
      lastOpener = btn;
      anketaDialog.showModal();
    });
  });
  if (anketaDialog) {
    anketaDialog.addEventListener('click', function (e) {
      if (e.target === anketaDialog) anketaDialog.close();
    });
    anketaDialog.addEventListener('close', function () {
      if (lastOpener && typeof lastOpener.focus === 'function') lastOpener.focus();
    });
    document.querySelectorAll('[data-close-form]').forEach(function (btn) {
      btn.addEventListener('click', function () { anketaDialog.close(); });
    });
  }

  document.querySelectorAll('[data-deadline]').forEach(function (card) {
    var parts = (card.getAttribute('data-deadline') || '').split('-');
    if (parts.length !== 3) return;
    var end = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var days = Math.round((end.getTime() - today.getTime()) / 86400000);
    var small = card.querySelector('small');
    if (!small) return;
    if (days > 0) small.textContent = 'осталось ' + days + ' дн.';
    else if (days === 0) small.textContent = 'сегодня';
    else small.textContent = 'срок прошёл';
  });

  var goalWrap = document.getElementById('goal-other-wrap');
  var goalOther = document.getElementById('goal-other');
  function syncGoal() {
    var on = document.querySelector('input[name="goal"]:checked');
    var show = !!(on && on.value === 'другое');
    if (goalWrap) goalWrap.hidden = !show;
    if (goalOther) {
      goalOther.required = show;
      if (!show) goalOther.value = '';
    }
  }
  document.querySelectorAll('input[name="goal"]').forEach(function (r) {
    r.addEventListener('change', syncGoal);
  });

  var form = document.getElementById('anketa');
  if (!form) return;
  var err = document.getElementById('form-error');
  var ok = document.getElementById('form-ok');
  var budgetNote = document.getElementById('form-budget');

  function field(name) {
    return form.elements[name];
  }
  function val(name) {
    var el = field(name);
    if (!el) return '';
    if (typeof el.length === 'number' && el[0] && el[0].type === 'radio') {
      var c = form.querySelector('input[name="' + name + '"]:checked');
      return c ? c.value : '';
    }
    return String(el.value || '').trim();
  }
  function showError(msg, el) {
    err.hidden = false;
    err.textContent = msg;
    if (el && typeof el.focus === 'function') el.focus();
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    err.hidden = true;
    var honey = field('_honey');
    if (honey && honey.value.trim()) return;

    var name = val('name');
    var telegram = val('telegram');
    var email = val('email');
    if (!name) return showError('Укажите имя', field('name'));
    if (!telegram && !email) return showError('Укажите Telegram или e-mail', field('telegram'));
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('Проверьте e-mail', field('email'));
    if (!val('work')) return showError('Выберите, над чем вы работаете', form.querySelector('input[name="work"]'));
    if (!val('book')) return showError('Напишите жанр и пару слов о книге', field('book'));
    if (!val('goal')) return showError('Выберите, чего хотите добиться', form.querySelector('input[name="goal"]'));
    if (val('goal') === 'другое' && !val('goal_other')) return showError('Напишите, чего хотите добиться', goalOther);
    if (!val('time')) return showError('Выберите, сколько времени готовы уделять книге', form.querySelector('input[name="time"]'));
    if (!val('budget')) return showError('Ответьте, подходит ли стоимость', form.querySelector('input[name="budget"]'));
    if (!val('format')) return showError('Ответьте, подходит ли формат', form.querySelector('input[name="format"]'));
    if (!field('privacy').checked) return showError('Подтвердите согласие с политикой конфиденциальности', field('privacy'));

    var payload = {
      name: name,
      telegram: telegram,
      email: email,
      work: val('work'),
      book: val('book'),
      goal: val('goal'),
      goal_other: val('goal') === 'другое' ? val('goal_other') : '',
      time: val('time'),
      budget: val('budget'),
      format: val('format'),
      sample: val('sample'),
      privacy: 'да',
      _honey: honey ? honey.value : ''
    };

    try {
      var stored = JSON.parse(localStorage.getItem('likiya:leads') || '[]');
      var copy = JSON.parse(JSON.stringify(payload));
      delete copy._honey;
      copy.ts = new Date().toISOString();
      stored.push(copy);
      localStorage.setItem('likiya:leads', JSON.stringify(stored));
    } catch (ignore) {}

    var btn = form.querySelector('[type="submit"]');
    var tx = btn.querySelector('.btn-tx');
    var prev = tx ? tx.textContent : '';
    btn.disabled = true;
    if (tx) tx.textContent = 'Отправляем…';
    try {
      var resp = await fetch(LEAD_URL, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = await resp.json().catch(function () { return null; });
      if (!resp.ok || !data || !data.ok) {
        throw new Error(data && data.error ? data.error : '');
      }
    } catch (ex) {
      btn.disabled = false;
      if (tx) tx.textContent = prev;
      var msg = ex && ex.message && /[А-Яа-яЁё]/.test(ex.message)
        ? ex.message
        : 'Не удалось отправить — проверьте соединение и попробуйте ещё раз.';
      return showError(msg);
    }

    var tight = payload.budget === BUDGET_NO;
    form.hidden = true;
    ok.hidden = false;
    if (budgetNote) budgetNote.hidden = !tight;
    ok.focus();
  });
})();
