#!/usr/bin/env node
/*
 * Тянет статьи Дзен-канала и ЗЕРКАЛИТ их в assets/posts.json: файл содержит
 * ровно то, что сейчас опубликовано в канале (новые сверху, дедуп по id).
 * Снятая с публикации статья исчезает и с сайта. Если лента вернула пусто
 * (сеть/бан/смена API) — файл не трогается, чтобы не обнулить блок статей.
 *
 * Два источника, по приоритету:
 *   1) RSS-экспорт канала (если Лиза включила его в студии Дзена) — тогда
 *      доступен ПОЛНЫЙ текст статьи (<content:encoded>), и читалка на сайте
 *      показывает статью целиком.
 *   2) Публичный ленточный API (launcher/export) — фолбэк, когда RSS закрыт
 *      логином: отдаёт только заголовок + лид (~600 симв.) + обложку + ссылку.
 *
 * Запуск:  DZEN_CHANNEL=likiyawrites node scripts/fetch-dzen.js
 * Переопределить URL RSS:  DZEN_RSS='https://dzen.ru/likiyawrites?rss' node ...
 *
 * Чтобы включить полный текст: студия Дзена → настройки канала → экспорт/RSS
 * → включить RSS с полным содержимым. После этого скрипт сам подхватит текст.
 */
const fs = require('fs');
const path = require('path');

const CHANNEL = process.env.DZEN_CHANNEL || 'likiyawrites';
const RSS_URL = process.env.DZEN_RSS || `https://dzen.ru/${CHANNEL}?rss`;
const MAX = Number(process.env.DZEN_MAX || 24);
const MAX_PAGES = Number(process.env.DZEN_PAGES || 5);
const OUT = path.join(__dirname, '..', 'assets', 'posts.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля',
  'августа','сентября','октября','ноября','декабря'];
function fmtDate(d) { return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
// Дзен отдаёт publication_date меткой времени (секунды, иногда миллисекунды).
// Без неё дата статьи = день, когда синк её впервые увидел, — это неверно
// для всего, что опубликовано до первого запуска.
function pubDate(ts) {
  const n = Number(ts);
  if (!n || !isFinite(n)) return '';
  const d = new Date(n > 1e12 ? n : n * 1000);
  return isNaN(d) ? '' : fmtDate(d);
}

function clip(s, n) {
  s = (s || '').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:—-]+$/, '') + '…';
}
function idFromLink(link) {
  const m = (link || '').match(/\/a\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : '';
}
const ENT = { '&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'",'&#039;':"'",
  '&laquo;':'«','&raquo;':'»','&mdash;':'—','&ndash;':'–','&hellip;':'…','&rsquo;':'’','&lsquo;':'‘' };
function decodeEntities(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-z]+;|&#0?39;/gi, m => ENT[m] != null ? ENT[m] : m);
}
// HTML статьи → абзацы (текст), разделённые пустой строкой
function htmlToParagraphs(html) {
  let s = String(html || '');
  s = s.replace(/<figure[\s\S]*?<\/figure>/gi, '')
       .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, '')
       .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<br\s*\/?>/gi, '\n')
       .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n\n')
       .replace(/<li[^>]*>/gi, '• ');
  s = s.replace(/<[^>]+>/g, '');
  s = decodeEntities(s);
  return s.split(/\n{2,}/).map(p => p.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim())
          .filter(Boolean).join('\n\n');
}
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  if (!m) return '';
  return m[1].replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}
function imgFrom(block, contentHtml) {
  let m = block.match(/<enclosure[^>]*url="([^"]+)"/i)
       || block.match(/<media:content[^>]*url="([^"]+)"/i)
       || block.match(/<media:thumbnail[^>]*url="([^"]+)"/i);
  if (m) return m[1];
  m = String(contentHtml || block).match(/<img[^>]*src="([^"]+)"/i);
  return m ? m[1] : '';
}

// ---- источник 1: RSS ----
async function fromRss() {
  let res;
  try { res = await fetch(RSS_URL, { headers: { 'user-agent': UA, 'accept': 'application/rss+xml, application/xml, text/xml' }, redirect: 'follow' }); }
  catch (e) { return null; }
  const finalUrl = res.url || RSS_URL;
  if (!res.ok || /passport|sso\./.test(finalUrl)) return null; // ушли на логин — RSS не включён
  const xml = await res.text();
  if (!/<rss|<feed|<channel/i.test(xml)) return null; // не XML-лента
  const items = (xml.match(/<item[\s\S]*?<\/item>/gi) || []);
  const out = [];
  for (const it of items) {
    const link = decodeEntities(tag(it, 'link')).split('?')[0];
    const id = idFromLink(link);
    if (!id) continue;
    const contentHtml = tag(it, 'content:encoded') || tag(it, 'description');
    const full = htmlToParagraphs(contentHtml);
    const title = decodeEntities(tag(it, 'title'));
    const pd = tag(it, 'pubDate');
    const dt = pd ? new Date(pd) : null;
    out.push({
      id, title, byline: 'Лиза Ликийская',
      image: imgFrom(it, contentHtml),
      excerpt: clip(full, 180), full, link,
      _date: dt && !isNaN(dt) ? fmtDate(dt) : ''
    });
  }
  return out.filter(p => p.title && p.full);
}

// ---- источник 2: API-лента (фолбэк, только лид) ----
function mapApiItems(items) {
  return (Array.isArray(items) ? items : [])
    .filter(it => it && it.title && (it.share_link || it.link))
    .map(it => {
      const link = (it.share_link || String(it.link || '')).split('?')[0];
      const id = idFromLink(link) || String(it.publication_id || it.id || '');
      const text = String(it.text || '').replace(/\s+/g, ' ').trim();
      return { id, title: String(it.title).trim(), byline: 'Лиза Ликийская',
        image: it.image || '', excerpt: clip(text, 180), full: text, link,
        _date: pubDate(it.publication_date) };
    })
    .filter(p => p.id);
}
// Лента отдаётся страницами: первая — launcher/export, следующие — по ссылке
// data.more.link. Обойти ВСЕ страницы обязательно: список статей из ленты теперь
// зеркалится в posts.json один-в-один, и статья, не попавшая в выдачу, будет
// удалена с сайта. Пока канал маленький, вторая страница приходит пустой.
async function fromApi() {
  let url = `https://dzen.ru/api/v3/launcher/export?channel_name=${encodeURIComponent(CHANNEL)}`;
  const out = [];
  const seen = new Set();
  for (let page = 0; page < MAX_PAGES && url; page++) {
    const res = await fetch(url, { headers: { 'user-agent': UA, 'accept': 'application/json' } });
    if (!res.ok) {
      if (page === 0) throw new Error('HTTP ' + res.status + ' для ' + url);
      break; // первая страница уже есть — довольствуемся ей, чем терять ленту целиком
    }
    const data = await res.json();
    const batch = mapApiItems(data.items);
    if (!batch.length) break;
    for (const p of batch) if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
    url = (data.more && data.more.link) || '';
  }
  return out;
}

async function main() {
  let fetched = await fromRss();
  const source = fetched && fetched.length ? 'RSS (полный текст)' : 'API (анонс)';
  if (!fetched || !fetched.length) fetched = await fromApi();

  let existing = [];
  try { const p = JSON.parse(fs.readFileSync(OUT, 'utf8')); if (Array.isArray(p)) existing = p; } catch (e) {}

  // ПУСТАЯ ВЫДАЧА — НИЧЕГО НЕ ПИШЕМ. Лента зеркалится, поэтому сбой сети,
  // редизайн API или бан по UA иначе стёрли бы все статьи с сайта разом.
  if (!fetched.length) {
    console.error(`Дзен @${CHANNEL}: лента вернула 0 статей — ${OUT} оставлен без изменений (${existing.length} шт.)`);
    return;
  }

  // ЗЕРКАЛО, а не накопление: в posts.json остаются РОВНО те статьи, что сейчас
  // есть в канале. Снятая с публикации статья пропадает и с сайта — это и есть
  // «полная синхронизация» (просьба клиента 2026-08-08). Раньше сюда же
  // дописывались все ранее виденные статьи, и удалённые висели вечно.
  const today = fmtDate(new Date());
  const posts = fetched.slice(0, MAX).map(p => {
    const prev = existing.find(e => e && e.id === p.id);
    const date = p._date || (prev && prev.date) || today;
    const { _date, ...rest } = p;
    return Object.assign({}, rest, { date });
  });

  const gone = existing.filter(e => e && e.id && !posts.some(p => p.id === e.id));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(posts, null, 2) + '\n');
  console.log(`Дзен @${CHANNEL} [${source}]: в канале ${fetched.length}, записано ${posts.length}`
    + (gone.length ? `, удалено ${gone.length} (${gone.map(e => e.title).join('; ')})` : '')
    + ` → ${path.relative(process.cwd(), OUT)}`);
}
main().catch(e => { console.error('Ошибка синхронизации Дзен:', e.message); process.exit(1); });
