# Деплой на VPS — чеклист

> **Автодеплой.** Пуш в ветку `site` выкладывает лендинг сам. Одноразовая настройка сервера и секретов GitHub — в [docs/deploy-site.md](docs/deploy-site.md). Ниже — как устроен сервер (nginx, PHP, пароль админки), если сайт поднимают с нуля или правят конфиг. Пароль в репозиторий и в секреты деплоя не кладут.

Статический сайт + один PHP-обработчик (`save.php`) для админки. Нужен **nginx + PHP-FPM 7.4+**.
Домен: `lizalikiyskaya.ru`. Корень примера: `/var/www/likiya`.

---

## 1. Залить файлы

Распаковать `lizalikiyskaya-site.zip` в корень сайта:

```bash
sudo mkdir -p /var/www/likiya
sudo unzip lizalikiyskaya-site.zip -d /var/www/likiya
```

В архиве: `index.html`, `privacy.html`, `styles.css`, `app.js`, `save.php`, `robots.txt`,
`sitemap.xml`, `assets/` (фото, favicon, `content.json`, `posts.json`), `scripts/fetch-dzen.js`.

## 2. Права доступа

Владелец файлов — пользователь nginx/php-fpm (обычно `www-data`). Запись нужна ТОЛЬКО там,
куда пишет админка: `assets/content.json` и папка `assets/img/` (загрузка фото).

```bash
sudo chown -R www-data:www-data /var/www/likiya
sudo find /var/www/likiya -type f -exec chmod 644 {} \;
sudo find /var/www/likiya -type d -exec chmod 755 {} \;
# запись для админки:
sudo chmod 664 /var/www/likiya/assets/content.json
sudo chmod 775 /var/www/likiya/assets/img
```

## 3. Пароль админки — переменная окружения  ⚠️ обязательно

Пароля в коде нет. `save.php` читает его из переменной окружения `LIZA_ADMIN_PASSWORD`;
`app.js` только спрашивает пароль и отдаёт его серверу на проверку. Пока переменная не задана,
админка отвечает «Админка не настроена на сервере» и ничего не записывает.

Задать в пуле php-fpm (файл читает только root):

```bash
sudo tee /etc/php/8.3/fpm/pool.d/zz-likiya-admin.conf >/dev/null <<'CONF'
[www]
env[LIZA_ADMIN_PASSWORD] = "сюда-пароль"
CONF
sudo chmod 600 /etc/php/8.3/fpm/pool.d/zz-likiya-admin.conf
sudo php-fpm8.3 -t && sudo systemctl reload php8.3-fpm
```

Сменить пароль — поправить строку в этом файле и снова `reload php8.3-fpm`.

## 4. nginx: конфиг сайта

`/etc/nginx/sites-available/likiya`:

```nginx
server {
    listen 80;
    server_name lizalikiyskaya.ru www.lizalikiyskaya.ru;
    root /var/www/likiya;
    index index.html;

    # статика
    location / {
        try_files $uri $uri/ =404;
    }

    # запретить исполнение PHP в папке загрузок (важно для безопасности)
    location ~* ^/assets/img/.*\.php$ { deny all; }

    # админ-обработчик — PHP + Basic-Auth (см. шаг 5)
    location = /save.php {
        auth_basic "Admin";
        auth_basic_user_file /etc/nginx/.htpasswd-likiya;
        include fastcgi_params;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;   # ← проверьте версию/сокет php-fpm
        fastcgi_param SCRIPT_FILENAME $document_root/save.php;
    }

    # прочий PHP не обслуживаем
    location ~ \.php$ { deny all; }

    # кэш статики
    location ~* \.(jpg|jpeg|png|webp|svg|css|js|woff2)$ {
        expires 30d;
        add_header Cache-Control "public";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/likiya /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Сокет php-fpm уточнить: `ls /run/php/` (напр. `php8.2-fpm.sock`).

## 5. Basic-Auth на save.php (по желанию)

Дополнительный слой поверх пароля из шага 3: без логина nginx запрос до `save.php` вообще не дойдёт.

```bash
sudo apt install apache2-utils        # даёт htpasswd
sudo htpasswd -c /etc/nginx/.htpasswd-likiya liza   # задать логин/пароль для админки
sudo systemctl reload nginx
```

Браузер спросит логин/пароль при первом сохранении в админке — это нормально.

## 6. HTTPS (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d lizalikiyskaya.ru -d www.lizalikiyskaya.ru
```

## 7. Форма заявок (FormSubmit)  — действие Лизы

Форма шлёт на `lizalikiyskaya@gmail.com` через FormSubmit.co без регистрации.
**При первой реальной заявке** придёт письмо «Activate Form» — перейти по ссылке ОДИН раз,
иначе заявки не доставляются. Пока не активировано, заявки лежат только в localStorage браузера.

## 8. (Опционально) Автосинк статей из Дзена

`posts.json` в архиве — снапшот (2 статьи). Для авто-обновления на VPS — cron:

```bash
# нужен node 18+; крон раз в час
0 * * * * cd /var/www/likiya && /usr/bin/node scripts/fetch-dzen.js >> /var/log/likiya-dzen.log 2>&1
```

> Полный текст статей появится в читалке, только если Лиза включит **RSS-экспорт** в студии Дзена
> (скрипт сам подхватит `content:encoded`). Пока RSS закрыт — читалка показывает анонс + ссылку в Дзен.
> Альтернатива cron — деплой из GitHub-репо на Pages/Netlify/Vercel с готовым Action `sync-dzen.yml`.

⚠️ Если на сервере `posts.json` уже полнее архивного — **не затирать** его файлом из зипа. Автодеплой из ветки `site` этот файл не перезаписывает и не удаляет.

## 9. Смоук-тест после деплоя

- [ ] `https://lizalikiyskaya.ru/` открывается, фото грузятся
- [ ] `/privacy.html`, `/robots.txt`, `/sitemap.xml` отдают 200
- [ ] На телефоне: блоки цен (заголовок→фото), отзывы (вертикальный список, не зависает)
- [ ] Кнопка «Редактировать» в футере → ввод пароля → правка текста/фото → «Сохранить»
      (nginx спросит Basic-Auth) → `content.json` обновился, правки видны после перезагрузки
- [ ] В админке: слайд формы — заменить/удалить/добавить фото, сохранить
- [ ] Отправить тестовую заявку → активировать FormSubmit по письму → повторная заявка доходит на почту

---

## Что редактируется через админку (для Лизы)

Кнопка **«Редактировать»** внизу страницы → пароль → правка прямо на сайте:
тексты (заголовки, цены, описания, ИНН, ФИО, e-mail), **все фото кликом**, пункты платформы (+/−),
отзывы (+/−), **слайды в форме заявки** (заменить/удалить/**добавить** свои фото). Затем «Сохранить».
