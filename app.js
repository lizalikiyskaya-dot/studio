// Лиза Ликийская — логика лендинга (редизайн по Figma, 2026).
// Контент: assets/content.json (правится через админку, пишется save.php).
// Статьи: assets/posts.json (автосинк из Дзена) — читаются в окне-читалке.
// Заявки: свой send.php на сервере (msmtp → SMTP) + локальный резерв в localStorage.

// ===== Конфигурация =====
// Заявки уходят на сервер, а он шлёт письмо. Адрес получателя и доступ к почте
// живут в send.php / /etc/msmtprc — в клиентском коде их нет.
const LEAD_URL='send.php';
const DZEN_URL='https://dzen.ru/likiyawrites';

// Админка: пароль открывает режим редактирования. Сам пароль живёт только на сервере
// (переменная окружения LIZA_ADMIN_PASSWORD, её читает save.php) — в клиентском коде его нет.
// Введённое значение проверяет сервер, дальше оно держится в памяти до перезагрузки страницы.
const SAVE_URL='save.php';
let adminPassword='';

// Контент по умолчанию берётся из самого HTML (для SEO и работы без JS).
// content.json лишь переопределяет значения. Правки клиента → content.json.
let CONTENT={};

function esc(s){return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

// ===== helpers для путей вида "offers.0.title" =====
function getPath(obj,path){return path.split('.').reduce(function(o,k){return (o==null)?undefined:o[k];},obj);}
function setPath(obj,path,val){
  var parts=path.split('.'),o=obj;
  for(var i=0;i<parts.length-1;i++){
    var k=/^\d+$/.test(parts[i])?+parts[i]:parts[i];
    var nextIdx=/^\d+$/.test(parts[i+1]);
    if(o[k]==null)o[k]=nextIdx?[]:{};
    o=o[k];
  }
  var last=/^\d+$/.test(parts[parts.length-1])?+parts[parts.length-1]:parts[parts.length-1];
  o[last]=val;
}

// ===== применяем content.json поверх HTML =====
function mailHref(email){return 'https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(email);}
function applyMail(el,email){
  var at=email.indexOf('@');
  el.innerHTML=(at>0?esc(email.slice(0,at))+'<br>'+esc(email.slice(at)):esc(email));
  el.setAttribute('href',mailHref(email));
}
function applyContent(c){
  document.querySelectorAll('[data-e]').forEach(function(el){
    var v=getPath(c,el.dataset.e);
    if(v==null)return;
    if(el.hasAttribute('data-mail'))applyMail(el,String(v));
    else el.textContent=v;
  });
  document.querySelectorAll('[data-ei]').forEach(function(el){
    var v=getPath(c,el.dataset.ei);
    if(v)el.setAttribute('src',v);
  });
  // ссылка на Дзен-канал (логотип + подпись рядом с заголовком «Статьи»)
  var dz=getPath(c,'meta.dzenUrl');
  if(dz){var dl=document.getElementById('dzenLink');if(dl)dl.setAttribute('href',dz);}
  renderTags(getPath(c,'platform.tags'),false);
  renderPubs(getPath(c,'story.pubs'),false);
  renderReviews(getPath(c,'reviews'),false);
  renderSlides(getPath(c,'slides'),false);
  renderChannels(getPath(c,'contact.channels'),false);
  renderMarquee(getPath(c,'meta.marquee'),false);
  refreshPosts();
}
async function loadContent(){
  try{
    var res=await fetch('assets/content.json',{cache:'no-cache'});
    if(res.ok){var data=await res.json();if(data&&typeof data==='object')CONTENT=data;}
  }catch(e){}
  applyContent(CONTENT);
}

// ===== Таблетки платформы =====
function renderTags(list,editing){
  var box=document.querySelector('.plat-tags');if(!box)return;
  if(!Array.isArray(list)){ // нет данных — оставляем то, что в HTML (только помечаем для сбора)
    list=Array.prototype.map.call(box.querySelectorAll('.plat-tag'),function(t){return t.textContent.trim();});
  }
  box.innerHTML=list.map(function(t){
    return '<span class="plat-tag"'+(editing?' contenteditable="true"':'')+'>'+esc(t)+'</span>'
      +(editing?'<button type="button" class="tag-x" aria-label="Удалить">×</button>':'');
  }).join('')+(editing?'<button type="button" class="tag-add">+ добавить</button>':'');
}

// ===== Публикации в периодике (блок «Моя история») =====
// Светлый курсивный список под текстом. Правится в админке: клик по строке — текст,
// × — удалить, «+ публикация» — добавить.
function renderPubs(list,editing){
  var box=document.querySelector('.story-pubs-list');if(!box)return;
  if(!Array.isArray(list)){ // нет данных — оставляем то, что в HTML
    list=Array.prototype.map.call(box.querySelectorAll('.pub-t'),function(t){return t.textContent.trim();});
  }
  box.innerHTML=list.map(function(t){
    return '<li><span class="pub-t"'+(editing?' contenteditable="true"':'')+'>'+esc(t)+'</span>'
      +(editing?'<button type="button" class="pub-x" aria-label="Удалить публикацию">×</button>':'')+'</li>';
  }).join('');
}

// ===== Отзивы (слайдер) =====
function renderReviews(list,editing){
  var box=document.getElementById('quotes');if(!box)return;
  if(!Array.isArray(list)||!list.length){
    list=[{who:'Ян Ерковский',role:'начинающий писатель',q:'Увлеченность Лизы заразительна, способ коммуникации — полный восторг, личный пример мотивирует'},
          {who:'Ольга',role:'художник-перформер',q:'Она дала понятные материалы, и процесс стал структурированным и осознанным. Её вовлечённость не давала забросить работу.'},
          {who:'Константин',role:'начинающий писатель',q:'Спасибо за помощь начать писать! Занятия проходили в максимально поддерживающей атмосфере.'},
          {who:'Виктория',role:'начинающая писательница',q:'Теория сторителлинга дает понимание и структуру, очень нравится наше обучение.'},
          {who:'Надежда',role:'',q:'Лиза стала для меня не просто наставником, но и примером мастерства, мотивации и главным вдохновением'}];
  }
  var ce=editing?' contenteditable="true"':'';
  box.innerHTML=list.map(function(r){
    return '<article class="rv-card reveal">'
      +(editing?'<button type="button" class="rv-x" aria-label="Удалить отзыв">×</button>':'')
      +'<h3 class="rv-name" data-rv="who"'+ce+'>'+esc(r.who)+'</h3>'
      +'<div class="rv-body">'
      +'<div class="rv-ava" aria-hidden="true">'+esc((r.who||'•').charAt(0))+'</div>'
      +'<p class="rv-text" data-rv="q"'+ce+'>'+esc(r.q)+'<span class="rv-role" data-rv="role"'+ce+'>'+esc(r.role)+'</span></p>'
      +'</div></article>';
  }).join('')+(editing?'<button type="button" class="rv-add">+ отзыв</button>':'');
  observeReveals();
}

// ===== Каналы связи в форме заявки (редактируемые подписи ВКонтакте/TG/WhatsApp) =====
function renderChannels(list,editing){
  if(!Array.isArray(list)||!list.length){
    list=[{label:'ВКонтакте',ph:'Ссылка или ID профиля'},{label:'TG',ph:'@username или телефон'},{label:'WhatsApp',ph:'Номер телефона'}];
  }
  document.querySelectorAll('.fm-channels').forEach(function(box){
    box.innerHTML=list.map(function(c,i){
      var lab=editing?('<span class="chan-lb" contenteditable="true">'+esc(c.label)+'</span>'):esc(c.label);
      return '<button type="button" class="fm-chan'+(i===1?' on':'')+'" data-ch="'+esc(c.label)+'" data-ph="'+esc(c.ph||'')+'">'+lab+'</button>';
    }).join('');
  });
}

// ===== Бегущая строка «студия художественной прозы» (редактируемая) =====
function renderMarquee(text,editing){
  var t=(text&&String(text).trim())||'студия художественной прозы';
  document.querySelectorAll('.marquee-track').forEach(function(tr){
    if(editing){tr.innerHTML='<span class="mq-edit" contenteditable="true">'+esc(t)+'</span>';return;}
    var unit='<span>'+esc(t)+'</span><i>●</i>',s='';
    for(var i=0;i<9;i++)s+=unit;
    tr.innerHTML=s;
  });
}

// ===== Статьи: аккордеон + читалка на странице =====
// Основа списка — assets/posts.json (автосинк из Дзена), поверх накладываются правки
// из админки (content.posts) по id статьи: заголовок/анонс/текст/обложка. Так новые
// статьи из Дзена появляются сами, а сохранённые правки не теряются.
var POSTS=[];        // то, что сейчас показано (индексируется читалкой)
var FEED_POSTS=[];   // из assets/posts.json (автосинк Дзена)
// Поверх ленты накладываются только те поля, которые реально правятся в админке.
// Дата и подпись автора полей ввода не имеют — они лишь волочатся в data-атрибутах
// карточки, и старое сохранённое значение не должно перебивать дату из Дзена.
var POST_EDITABLE=['title','excerpt','full','link','image'];
function postKey(p){
  if(p&&p.id)return String(p.id);
  var m=/\/a\/([A-Za-z0-9_-]+)/.exec((p&&p.link)||'');
  return m?m[1]:'';
}
function currentPosts(){
  var cp=getPath(CONTENT,'posts');
  if(!Array.isArray(cp)||!cp.length)return FEED_POSTS;
  if(!FEED_POSTS.length)return cp;
  var over={};
  cp.forEach(function(p){var k=postKey(p);if(k)over[k]=p;});
  var out=FEED_POSTS.map(function(p){
    var k=postKey(p),o=over[k],f,m;
    if(!o)return p;
    m={};
    for(f in p)m[f]=p[f];
    POST_EDITABLE.forEach(function(f){if(o[f]!==''&&o[f]!=null)m[f]=o[f];});
    return m;
  });
  // Статьи из content.json, которых нет в ленте. Их два разных вида:
  //  — с id/ссылкой на dzen.ru/a/… — это правки к статье, СНЯТОЙ с публикации
  //    в Дзене. Полная синхронизация (просьба клиента 2026-08-08): раз статьи
  //    в канале больше нет, на сайте её тоже быть не должно — пропускаем.
  //  — без Дзен-id — статья, заведённая руками в админке. Лента про неё ничего
  //    не знает и удалить её не может: показываем, как и раньше, в конце.
  cp.forEach(function(p){if(!postKey(p))out.push(p);});
  return out;
}
function renderPosts(posts,editing){
  POSTS=posts||[];
  var box=document.getElementById('posts'),empty=document.getElementById('postsEmpty');
  if(!box)return;
  if(editing){
    box.innerHTML=POSTS.map(function(p,i){
      return '<article class="post-card post-edit" data-post="'+i+'" data-id="'+esc(p.id||'')+'" data-byline="'+esc(p.byline||'')+'" data-date="'+esc(p.date||'')+'">'
        +'<button type="button" class="post-x" aria-label="Удалить статью">×</button>'
        +'<figure class="post-pic bw post-imgpick" title="Кликните, чтобы заменить фото"><img src="'+esc(p.image||'')+'" alt=""></figure>'
        +'<label class="pe-lb">Заголовок</label><h3 data-pf="title" contenteditable="true">'+esc(p.title||'')+'</h3>'
        +'<label class="pe-lb">Анонс</label><p data-pf="excerpt" contenteditable="true">'+esc(p.excerpt||'')+'</p>'
        +'<label class="pe-lb">Полный текст</label><div class="pe-full" data-pf="full" contenteditable="true">'+esc(p.full||'')+'</div>'
        +'<label class="pe-lb">Ссылка в Дзене</label><input class="pe-link" data-pf="link" type="url" value="'+esc(p.link||'')+'">'
        +'</article>';
    }).join('')+'<button type="button" class="post-add">+ статья</button>';
    if(empty)empty.hidden=true;
    return;
  }
  if(!POSTS.length){box.innerHTML='';if(empty)empty.hidden=false;return;}
  if(empty)empty.hidden=true;
  box.innerHTML=POSTS.map(function(p,i){
    var pic=p.image?('<figure class="post-pic bw"><img src="'+esc(p.image)+'" alt="" loading="lazy" decoding="async"></figure>'):'<figure class="post-pic bw"></figure>';
    return '<article class="post-card" role="button" tabindex="0" data-post="'+i+'">'+pic
      +'<h3>'+esc(p.title)+'</h3>'
      +'<p>'+esc(p.excerpt||'')+'</p>'
      +'</article>';
  }).join('');
}
function refreshPosts(){renderPosts(currentPosts(),EDITING);}
async function loadFeed(){
  try{
    var res=await fetch('assets/posts.json',{cache:'no-cache'});
    if(res.ok){var data=await res.json();FEED_POSTS=Array.isArray(data)?data:[];}
  }catch(e){FEED_POSTS=[];}
  refreshPosts();
}
// тап/Enter по карточке — открыть статью в читалке на странице (в режиме правки не открываем).
// Переход в Дзен — только по отдельной кнопке (.dzen-link) рядом с заголовком «Статьи».
document.addEventListener('click',function(e){
  if(EDITING)return;
  var card=e.target.closest('.post-card');if(!card||card.classList.contains('post-edit'))return;
  var p=POSTS[+card.dataset.post];if(p)openReader(p);
});
document.addEventListener('keydown',function(e){
  if(EDITING)return;
  if((e.key==='Enter'||e.key===' ')&&document.activeElement&&document.activeElement.classList.contains('post-card')){
    e.preventDefault();var p=POSTS[+document.activeElement.dataset.post];if(p)openReader(p);
  }
});
// читалка: полный текст статьи прямо на странице
var reader=document.getElementById('reader');
function openReader(p){
  var fig=document.getElementById('rdFig'),img=document.getElementById('rdPic');
  if(p.image){fig.style.display='';img.src=p.image;}else{fig.style.display='none';img.removeAttribute('src');}
  document.getElementById('rdTitle').textContent=p.title||'';
  var by=[p.byline,p.date].filter(Boolean).join(' · ');
  document.getElementById('rdBy').textContent=by;
  var text=(p.full||p.excerpt||'').split(/\n{2,}|\r\n\r\n/).filter(Boolean);
  document.getElementById('rdText').innerHTML=text.length?text.map(function(par){return '<p>'+esc(par.trim())+'</p>';}).join(''):'';
  document.getElementById('rdLink').href=p.link||getPath(CONTENT,'meta.dzenUrl')||DZEN_URL;
  reader.classList.add('open');reader.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
}
function closeReader(){reader.classList.remove('open');reader.setAttribute('aria-hidden','true');document.body.style.overflow='';}
if(reader){
  reader.addEventListener('click',function(e){if(e.target.closest('[data-rclose]'))closeReader();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&reader.classList.contains('open'))closeReader();});
}

// ===== стрелки слайдеров (отзывы) =====
// листаем по одной карточке и зацикливаем: с последнего отзыва «вперёд» ведёт на первый
document.querySelectorAll('.sl-arrow').forEach(function(b){
  b.addEventListener('click',function(){
    var id=b.dataset.prev||b.dataset.next;
    var track=document.getElementById(id);if(!track)return;
    var step=track.clientWidth;if(!step)return;
    var count=Math.max(1,Math.round(track.scrollWidth/step));
    var i=Math.round(track.scrollLeft/step)+(b.dataset.prev?-1:1);
    if(i<0)i=count-1;else if(i>count-1)i=0;
    track.scrollTo({left:i*step,behavior:'smooth'});
  });
});

// ===== Узор-росчерк показываем после загрузки фото тарифов =====
(function(){
  var line=document.querySelector('.pricing-line');if(!line)return;
  var imgs=Array.prototype.slice.call(document.querySelectorAll('.offer-pic img'));
  if(!imgs.length){line.classList.add('in');return;}
  var left=imgs.length,shown=false,AFTER=650;
  function show(){if(!shown){shown=true;line.classList.add('in');}}
  function tick(){if(--left<=0)setTimeout(show,AFTER);}
  imgs.forEach(function(im){
    if(im.complete&&im.naturalWidth>0){tick();}
    else{im.addEventListener('load',tick,{once:true});im.addEventListener('error',tick,{once:true});}
  });
  setTimeout(show,3000);
})();

// ===== Модалка заявки =====
const fmodal=document.getElementById('formModal');
function openForm(){fmodal.classList.add('open');fmodal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';var f=fmodal.querySelector('input[name=name]');setTimeout(function(){try{f.focus();}catch(e){}},80);}
function closeForm(){fmodal.classList.remove('open');fmodal.setAttribute('aria-hidden','true');document.body.style.overflow='';}
fmodal.addEventListener('click',function(e){if(e.target.closest('[data-formclose]'))closeForm();});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeForm();}});
// кнопки «Оставить заявку»/«Заявка» открывают модалку (в режиме редактирования — не мешаем правке)
document.addEventListener('click',function(e){
  var a=e.target.closest('a');if(!a)return;
  var href=a.getAttribute('href')||'';
  if(href==='#contact'){e.preventDefault();if(!EDITING)openForm();}
});

// ===== Форма заявки =====
document.querySelectorAll('.fm-channels').forEach(function(box){
  box.addEventListener('click',function(e){
    if(EDITING)return; // в режиме правки клик = редактирование подписи, не выбор канала
    var b=e.target.closest('.fm-chan');if(!b)return;
    box.querySelectorAll('.fm-chan').forEach(function(x){x.classList.toggle('on',x===b);});
    var form=box.closest('.lead-form');
    var inp=form&&form.querySelector('input[name=contact]');if(inp&&b.dataset.ph)inp.placeholder=b.dataset.ph;
  });
});
document.querySelectorAll('.lead-form').forEach(function(form){form.addEventListener('submit',async function(e){
  e.preventDefault();
  // f.elements[...] — а не f.name/f.email: поле name="name" конфликтует со свойством form.name
  var f=e.target,el=function(n){return f.elements[n];};
  // honeypot: человек это поле не видит — заполнено только ботом, молча выходим
  var honey=el('_honey');
  if(honey&&honey.value.trim())return;
  var email=el('email').value.trim(),name=el('name').value.trim();
  if(!name){toast('Укажите имя');el('name').focus();return;}
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast('Проверьте электронную почту');el('email').focus();return;}
  if(!el('privacy').checked){toast('Подтвердите согласие с политикой конфиденциальности');return;}
  var onb=f.querySelector('.fm-chan.on');
  var channel=onb?onb.dataset.ch:'';
  var lead={ts:new Date().toISOString(),name:name,email:email,channel:channel,contact:el('contact').value.trim(),message:el('message').value.trim(),newsletter:el('newsletter').checked?'да':'нет'};
  try{var k='likiya:leads',arr=JSON.parse(localStorage.getItem(k)||'[]');arr.push(lead);localStorage.setItem(k,JSON.stringify(arr));}catch(_){}
  var btn=f.querySelector('.fm-submit'),btnText=btn?btn.textContent:'';
  if(LEAD_URL){
    if(btn){btn.disabled=true;btn.textContent='Отправляем…';}
    try{
      var resp=await fetch(LEAD_URL,{
        method:'POST',
        headers:{'Accept':'application/json','Content-Type':'application/json'},
        // _honey — ловушка для ботов: поле скрыто от человека, сервер отсеет заполненное
        body:JSON.stringify({name:name,email:email,channel:channel,contact:lead.contact,message:lead.message,newsletter:lead.newsletter,_honey:(honey?honey.value:'')})
      });
      var data=await resp.json().catch(function(){return null;});
      if(!resp.ok||!data||!data.ok)throw new Error(data&&data.error?data.error:'HTTP '+resp.status);
    }catch(err){
      if(btn){btn.disabled=false;btn.textContent=btnText;}
      toast(err&&err.message&&/^[А-Яа-я]/.test(err.message)?err.message:'Не удалось отправить — проверьте соединение и попробуйте ещё раз.');
      return;
    }
    if(btn){btn.disabled=false;btn.textContent=btnText;}
  }
  f.reset();
  // канал по умолчанию — второй чип (как в renderChannels): подписи правятся в админке,
  // поэтому сравнивать их с текстом «Telegram» нельзя — после правки ни один чип не выбирался
  f.querySelectorAll('.fm-chan').forEach(function(x,i){x.classList.toggle('on',i===1);});
  var ci=f.querySelector('input[name=contact]');if(ci)ci.placeholder='Контакт для связи...';
  if(f.closest('.fmodal'))closeForm();
  toast('Спасибо! Заявка отправлена — я свяжусь с вами.');
});});

/* ===== Слайдер обложек в форме заявки =====
   Слайды правятся в админке (заменить/удалить/добавить), поэтому список приходит
   из content.slides. Формат элемента: {src, alt} — старый формат (просто строка-путь)
   поддерживается для совместимости с уже сохранённым content.json.
   Обёртка #fmSlider, стрелки и точки живут в разметке и НЕ пересоздаются —
   обработчики вешаются один раз, при перерисовке слайдов не накапливаются. */
var slideTimer=null,SLIDE_I=0;
const SLIDE_MS=5500;
function reducedMotion(){return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);}
function slideImgs(){return document.querySelectorAll('.fm-slides img');}
function normSlides(list){
  return (Array.isArray(list)?list:[]).map(function(it){
    if(typeof it==='string')return {src:it,alt:''};
    return {src:(it&&it.src)||'',alt:(it&&it.alt)||''};
  }).filter(function(it){return it.src;});
}
function showSlide(i){
  var imgs=slideImgs();if(!imgs.length)return;
  SLIDE_I=((i%imgs.length)+imgs.length)%imgs.length;
  imgs.forEach(function(im,idx){im.classList.toggle('on',idx===SLIDE_I);});
  // следующий кадр подгружаем заранее — иначе ленивая картинка мигнёт пустотой
  [SLIDE_I,(SLIDE_I+1)%imgs.length].forEach(function(n){
    var im=imgs[n];if(im&&!im.complete)im.loading='eager';
  });
  document.querySelectorAll('#fmDots .fm-dot').forEach(function(d,idx){d.setAttribute('aria-current',idx===SLIDE_I?'true':'false');});
}
function stopSlides(){if(slideTimer){clearInterval(slideTimer);slideTimer=null;}}
function startSlides(){
  stopSlides();
  if(slideImgs().length<2)return;
  if(document.body.classList.contains('editing'))return;
  if(reducedMotion())return; // автопрокрутку отключаем при «уменьшить движение»
  slideTimer=setInterval(function(){showSlide(SLIDE_I+1);},SLIDE_MS);
}
function renderDots(items,editing){
  var ui=document.querySelector('.fm-slider-ui'),box=document.getElementById('fmDots');
  if(ui)ui.style.display=(editing||items.length<2)?'none':''; // одна обложка — управление не нужно
  if(!box)return;
  box.innerHTML=(editing||items.length<2)?'':items.map(function(it,i){
    return '<button type="button" class="fm-dot" data-i="'+i+'" aria-current="'+(i===0?'true':'false')+'" aria-label="'+esc(it.alt||('Обложка '+(i+1)))+'"></button>';
  }).join('');
}
function renderSlides(list,editing){
  var box=document.querySelector('.fm-slides');if(!box)return;
  stopSlides(); // старый таймер держал бы уже удалённые узлы
  var items=normSlides(list);
  if(!items.length){
    var imgs=getPath(CONTENT,'images')||{}; // обратная совместимость со старым content.json
    items=normSlides([imgs.slide1,imgs.slide2].filter(Boolean));
    if(!items.length)items=normSlides(Array.prototype.map.call(box.querySelectorAll('img'),function(im){
      return {src:im.getAttribute('src'),alt:im.getAttribute('alt')||''};
    }));
  }
  box.innerHTML=items.map(function(it,idx){
    // первая обложка грузится сразу, остальные — лениво
    var img='<img class="'+(idx===0?'on':'')+'" src="'+esc(it.src)+'" alt="'+esc(it.alt)+'"'+(idx?' loading="lazy"':'')+' decoding="async">';
    return editing?('<span class="sl-item">'+img+'<button type="button" class="sl-x" aria-label="Удалить фото">×</button></span>'):img;
  }).join('')+(editing?'<button type="button" class="sl-add">+ фото</button>':'');
  renderDots(items,editing);
  SLIDE_I=0;
  if(!editing)startSlides();
}
// управление слайдером: обложки сменяются сами; стрелок нет (просьба клиента),
// остаются точки, клавиатура и свайп + пауза при наведении/фокусе
(function(){
  var sl=document.getElementById('fmSlider');if(!sl)return;
  function go(i){showSlide(i);startSlides();} // ручное листание перезапускает таймер
  sl.addEventListener('click',function(e){
    var dot=e.target.closest('.fm-dot');
    if(dot)go(+dot.dataset.i);
  });
  sl.addEventListener('keydown',function(e){
    if(e.key==='ArrowLeft'){e.preventDefault();go(SLIDE_I-1);}
    else if(e.key==='ArrowRight'){e.preventDefault();go(SLIDE_I+1);}
  });
  sl.addEventListener('mouseenter',stopSlides);
  sl.addEventListener('mouseleave',function(){startSlides();});
  sl.addEventListener('focusin',stopSlides);
  sl.addEventListener('focusout',function(){startSlides();});
  var x0=null,y0=null;
  sl.addEventListener('touchstart',function(e){var t=e.changedTouches[0];x0=t.clientX;y0=t.clientY;},{passive:true});
  sl.addEventListener('touchend',function(e){
    if(x0===null)return;
    var t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;x0=null;
    if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy))go(SLIDE_I+(dx<0?1:-1));
  },{passive:true});
})();

// ===== тост =====
let toastT;function toast(m){const e=document.getElementById('toast');e.textContent=m;e.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>e.classList.remove('show'),2200);}

// ===== мягкое появление секций при скролле =====
const io=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}})},{threshold:.12});
function observeReveals(){document.querySelectorAll('.reveal:not(.in)').forEach(el=>io.observe(el));}

// логотип в плашке
(function(){
  var nav=document.querySelector('.topnav'),hero=document.querySelector('.hero');
  if(!nav||!hero)return;
  new IntersectionObserver(function(es){es.forEach(function(e){nav.classList.toggle('scrolled',!e.isIntersecting);});},{threshold:0,rootMargin:'-64px 0px 0px 0px'}).observe(hero);
})();

// при открытии/обновлении показываем первый экран
if('scrollRestoration' in history){history.scrollRestoration='manual';}
window.addEventListener('load',function(){if(!location.hash){window.scrollTo(0,0);}});

/* =========================================================
   АДМИН-ПАНЕЛЬ: правка текста/фото/юр.данных прямо на странице.
   Правки собираются в объект и уходят POST'ом в save.php → content.json.
   ========================================================= */
let EDITING=false;
var imgInput=null; // скрытый input для загрузки фото
// цель загрузки: строка-ключ data-ei | конкретный <img> (замена) | {add:true} (новый слайд)
var pendingImg=null;

function setEditable(on){
  document.querySelectorAll('[data-e]').forEach(function(el){
    if(on)el.setAttribute('contenteditable','true');else el.removeAttribute('contenteditable');
  });
}
function enterEdit(){
  EDITING=true;document.body.classList.add('editing');
  setEditable(true);
  renderTags(getPath(CONTENT,'platform.tags')||null,true);
  renderPubs(getPath(CONTENT,'story.pubs')||null,true);
  renderReviews(getPath(CONTENT,'reviews')||null,true);
  renderSlides(getPath(CONTENT,'slides')||null,true);
  renderChannels(getPath(CONTENT,'contact.channels')||null,true);
  renderMarquee(getPath(CONTENT,'meta.marquee')||null,true);
  renderPosts(currentPosts(),true);
  document.getElementById('adminBtn').style.display='none';
  var bar=document.getElementById('adminBar');bar.classList.add('show');bar.setAttribute('aria-hidden','false');
}
function exitEdit(){
  EDITING=false;document.body.classList.remove('editing');
  setEditable(false);
  renderTags(getPath(CONTENT,'platform.tags')||null,false);
  renderPubs(getPath(CONTENT,'story.pubs')||null,false);
  renderReviews(getPath(CONTENT,'reviews')||null,false);
  renderSlides(getPath(CONTENT,'slides')||null,false);
  renderChannels(getPath(CONTENT,'contact.channels')||null,false);
  renderMarquee(getPath(CONTENT,'meta.marquee')||null,false);
  applyContent(CONTENT); // откат к сохранённому
  var bar=document.getElementById('adminBar');bar.classList.remove('show');bar.setAttribute('aria-hidden','true');
  document.getElementById('adminBtn').style.display='';
}

// собрать текущее состояние страницы в объект контента
function collectContent(){
  var out={};
  document.querySelectorAll('[data-e]').forEach(function(el){
    if(el.closest('.fmodal'))return; // модалка — дубликат основной формы, правки берём из основной
    var v=el.hasAttribute('data-mail')?el.textContent.trim():el.textContent;
    setPath(out,el.dataset.e,v);
  });
  document.querySelectorAll('[data-ei]').forEach(function(el){
    if(el.closest('.fmodal'))return;
    setPath(out,el.dataset.ei,el.getAttribute('src'));
  });
  // таблетки платформы
  var tags=Array.prototype.map.call(document.querySelectorAll('.plat-tags .plat-tag'),function(t){return t.textContent.trim();}).filter(Boolean);
  setPath(out,'platform.tags',tags);
  // публикации в периодике
  var pubs=Array.prototype.map.call(document.querySelectorAll('.story-pubs-list .pub-t'),function(t){return t.textContent.trim();}).filter(Boolean);
  setPath(out,'story.pubs',pubs);
  // отзывы
  var reviews=Array.prototype.map.call(document.querySelectorAll('#quotes .rv-card'),function(card){
    return {
      who:(card.querySelector('[data-rv=who]')||{}).textContent||'',
      q:(card.querySelector('[data-rv=q]')?card.querySelector('[data-rv=q]').childNodes[0].textContent:'')||'',
      role:(card.querySelector('[data-rv=role]')||{}).textContent||''
    };
  });
  setPath(out,'reviews',reviews);
  // слайды формы (динамический список фото)
  var slides=Array.prototype.map.call(document.querySelectorAll('.fm-slides img'),function(im){
    return {src:im.getAttribute('src'),alt:im.getAttribute('alt')||''};
  }).filter(function(s){return s.src;});
  setPath(out,'slides',slides);
  // статьи (редактируемые карточки)
  var posts=Array.prototype.map.call(document.querySelectorAll('#posts .post-card.post-edit'),function(card){
    function txt(k){var el=card.querySelector('[data-pf="'+k+'"]');return el?el.textContent.trim():'';}
    var fullEl=card.querySelector('[data-pf="full"]'),img=card.querySelector('.post-pic img'),linkEl=card.querySelector('[data-pf="link"]');
    return {
      id:card.dataset.id||'',
      title:txt('title'),
      byline:card.dataset.byline||'',
      image:(img&&img.getAttribute('src'))||'',
      excerpt:txt('excerpt'),
      full:fullEl?(fullEl.innerText||fullEl.textContent||'').trim():'',
      link:linkEl?linkEl.value.trim():'',
      date:card.dataset.date||''
    };
  });
  setPath(out,'posts',posts);
  // каналы связи в форме
  var chBox=document.querySelector('.fm-channels');
  if(chBox){
    var channels=Array.prototype.map.call(chBox.querySelectorAll('.fm-chan'),function(b){
      var lb=b.querySelector('.chan-lb');
      return {label:(lb?lb.textContent:b.textContent).trim(),ph:b.dataset.ph||''};
    });
    setPath(out,'contact.channels',channels);
  }
  // бегущая строка
  var mq=document.querySelector('.marquee-track .mq-edit');
  if(mq)setPath(out,'meta.marquee',mq.textContent.trim());
  return out;
}

async function saveContent(){
  var bar=document.getElementById('adminBar'),status=document.getElementById('adminStatus');
  var content=collectContent();
  status.textContent='Сохраняем…';
  try{
    var res=await fetch(SAVE_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:adminPassword,content:content})});
    var data=await res.json().catch(function(){return null;});
    if(!res.ok||!data||!data.ok)throw new Error(data&&data.error?data.error:'HTTP '+res.status);
  }catch(err){
    status.textContent='Режим редактирования';
    toast('Не удалось сохранить: '+err.message);
    return;
  }
  CONTENT=content;
  status.textContent='Режим редактирования';
  exitEdit();
  toast('Опубликовано ✓ — правки сохранены');
}

// загрузка фото
function ensureImgInput(){
  if(imgInput)return imgInput;
  imgInput=document.createElement('input');imgInput.type='file';imgInput.accept='image/png,image/jpeg,image/webp';imgInput.style.display='none';
  document.body.appendChild(imgInput);
  imgInput.addEventListener('change',async function(){
    var file=imgInput.files&&imgInput.files[0];imgInput.value='';
    if(!file||!pendingImg)return;
    var target=pendingImg;pendingImg=null;
    toast('Загружаем фото…');
    var fd=new FormData();fd.append('password',adminPassword);fd.append('action','upload');fd.append('file',file);
    try{
      var res=await fetch(SAVE_URL,{method:'POST',body:fd});
      var data=await res.json().catch(function(){return null;});
      if(!res.ok||!data||!data.ok||!data.path)throw new Error(data&&data.error?data.error:'HTTP '+res.status);
      if(typeof target==='string'){                       // ключ data-ei — заменить все с этим ключом
        document.querySelectorAll('[data-ei="'+target+'"]').forEach(function(el){el.setAttribute('src',data.path);});
      }else if(target&&target.add){                        // новый слайд формы
        var box=document.querySelector('.fm-slides');
        if(box){
          var span=document.createElement('span');span.className='sl-item';
          var im=document.createElement('img');im.src=data.path;im.alt='';
          var x=document.createElement('button');x.type='button';x.className='sl-x';x.setAttribute('aria-label','Удалить фото');x.textContent='×';
          span.appendChild(im);span.appendChild(x);
          box.insertBefore(span,box.querySelector('.sl-add'));
        }
      }else if(target&&target.setAttribute){               // конкретный <img> — заменить его
        target.setAttribute('src',data.path);
      }
      toast('Фото заменено (не забудьте «Сохранить»)');
    }catch(err){toast('Не удалось загрузить фото: '+err.message);}
  });
  return imgInput;
}
function pickImage(target){pendingImg=target;ensureImgInput().click();}

// пароль проверяет сервер; при успехе запоминаем его для сохранений и загрузки фото
async function checkAdminPassword(p){
  try{
    var res=await fetch(SAVE_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:p,action:'check'})});
    var data=await res.json().catch(function(){return null;});
    if(res.ok&&data&&data.ok){adminPassword=p;enterEdit();return;}
    toast(data&&data.error?data.error:'Неверный пароль');
  }catch(err){toast('Сервер не ответил: '+err.message);}
}

// делегированные клики админки
document.addEventListener('click',function(e){
  // открыть режим
  if(e.target.closest('#adminBtn')){
    var p=prompt('Пароль администратора:');
    if(p===null)return;
    checkAdminPassword(p);
    return;
  }
  if(!EDITING)return;
  if(e.target.closest('#adminSave')){saveContent();return;}
  if(e.target.closest('#adminCancel')){exitEdit();return;}
  // слайды формы: добавить / удалить / заменить фото кликом
  if(e.target.classList.contains('sl-add')){e.preventDefault();pickImage({add:true});return;}
  if(e.target.classList.contains('sl-x')){var si=e.target.closest('.sl-item');if(si)si.remove();return;}
  var slImg=e.target.closest('.fm-slides img');
  if(slImg){e.preventDefault();pickImage(slImg);return;}
  // статьи: удалить / добавить / заменить фото
  if(e.target.classList.contains('post-x')){var pc=e.target.closest('.post-card');if(pc)pc.remove();return;}
  if(e.target.classList.contains('post-add')){
    var plist=collectContent().posts||[];
    plist.push({id:'',title:'Заголовок статьи',byline:'Лиза Ликийская',image:'',excerpt:'Короткий анонс статьи',full:'Полный текст статьи',link:'',date:''});
    renderPosts(plist,true);return;
  }
  var postFig=e.target.closest('.post-edit .post-pic');
  if(postFig){e.preventDefault();var pim=postFig.querySelector('img');if(pim)pickImage(pim);return;}
  // замена фото по клику
  var imgEl=e.target.closest('[data-ei]');
  if(imgEl){e.preventDefault();pickImage(imgEl.dataset.ei);return;}
  // таблетки: удалить/добавить
  // публикации: удалить/добавить
  if(e.target.classList.contains('pub-x')){var li=e.target.closest('li');if(li)li.remove();return;}
  if(e.target.classList.contains('pub-add')){
    var plist=Array.prototype.map.call(document.querySelectorAll('.story-pubs-list .pub-t'),function(t){return t.textContent.trim();});
    plist.push('Новое издание (год)');
    renderPubs(plist,true);
    var last=document.querySelector('.story-pubs-list li:last-child .pub-t');if(last)last.focus();
    return;
  }
  if(e.target.classList.contains('tag-x')){e.target.previousElementSibling&&e.target.previousElementSibling.remove();e.target.remove();return;}
  if(e.target.classList.contains('tag-add')){
    var span=document.createElement('span');span.className='plat-tag';span.setAttribute('contenteditable','true');span.textContent='новая возможность';
    var x=document.createElement('button');x.type='button';x.className='tag-x';x.setAttribute('aria-label','Удалить');x.textContent='×';
    e.target.parentNode.insertBefore(span,e.target);e.target.parentNode.insertBefore(x,e.target);
    span.focus();return;
  }
  // отзывы: удалить/добавить
  if(e.target.classList.contains('rv-x')){var c=e.target.closest('.rv-card');if(c)c.remove();return;}
  if(e.target.classList.contains('rv-add')){
    var list=collectContent().reviews||[];list.push({who:'Имя',role:'кто автор',q:'Текст отзыва'});
    renderReviews(list,true);return;
  }
},true);

// не даём кликам по фото/ссылкам «проваливаться» в навигацию в режиме правки
document.addEventListener('click',function(e){
  if(!EDITING)return;
  var a=e.target.closest('a');
  if(a&&!a.closest('#adminBar')){e.preventDefault();}
},true);

// ===== старт =====
loadContent();
loadFeed();
