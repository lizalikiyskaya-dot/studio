/* Заявки: POST JSON на send.php (письмо через msmtp, копия в localStorage).
   Тексты лендинга заданы в index.html. assets/content.json страница не читает:
   деплой не перезаписывает живой файл, и старые правки админки не должны
   подменять новый текст. Ключ likiya:leads — локальный резерв заявок. */
(function () {
  var LEAD_URL = 'send.php';
  var BUDGET_NO = 'нет, сейчас не по бюджету';

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
