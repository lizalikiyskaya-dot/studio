# Автодеплой лендинга lizalikiyskaya.ru

Пуш в ветку `site` выкладывает лендинг на тот же VPS, что и студию (`185.139.70.79`). Студия живёт в `/srv/studio/app` и этим деплоем не затрагивается: её workflow `.github/workflows/deploy.yml` запускается только с ветки `main`.

Workflow лендинга: `.github/workflows/deploy-site.yml`. На сервере он скачивает архив текущего коммита и запускает `scripts/deploy-site.sh`.

Пароль админки в репозиторий и в секреты GitHub не кладётся. Он по-прежнему читается из переменной `LIZA_ADMIN_PASSWORD` в конфиге php-fpm (см. `DEPLOY.md`, шаг 3).

## Что деплой делает и чего не делает

Обновляет код и статику: `index.html`, `privacy.html`, `styles.css`, `app.js`, `save.php`, `send.php`, `robots.txt`, `sitemap.xml`, картинки из репозитория, `scripts/fetch-dzen.js`.

Перед копированием снимает архив текущего каталога сайта.

Не перезаписывает и не удаляет:

| Путь | Кто пишет |
| --- | --- |
| `assets/content.json` | админка, `save.php` |
| `assets/content.json.tmp` | незавершённая запись `save.php` |
| `assets/posts.json` | cron `scripts/fetch-dzen.js` на сервере |
| `assets/img/upload_*` | фото, загруженные через админку |

Если на сервере ещё нет `content.json` или `posts.json`, первый деплой кладёт копию из репозитория. Следующие деплои серверный файл уже не трогают.

На живом сайте эти файлы уже не совпадают с копиями в git: в `content.json` другие тексты, отзывы и число слайдов, в `posts.json` другая лента. Обычный `unzip` или `rsync` без исключений откатил бы правки админки. Автодеплой этого не делает. Загрузок `upload_*` на сайте пока нет, но каталог для них всё равно не чистится.

Не входит в выкладку и на сервер не копируется: `preview.html`, `preview.css`, `docs/`, `.github/`, `README.md`, `DEPLOY.md`.

Не трогает:

- `/srv/studio` и `/srv/studio/app` — приложение студии;
- `/var/lib/likiya/leads.jsonl` — журнал заявок `send.php`;
- конфиг nginx и файл php-fpm с `LIZA_ADMIN_PASSWORD`.

Если обязательного секрета нет, workflow зелёный и в журнале написано «Деплой лендинга пропущен». Сервер в этом случае не меняется.

В командах ниже `SITE_PATH`, `WEB_GROUP` и `STUDIO_USER` — не переменные shell. Перед запуском замените их на свои значения, без `$` и без кавычек, если в пути нет пробелов.

## 1. Узнать корень лендинга

Команды ниже выполняет Михаил, пользователь с `sudo`. Пример в `DEPLOY.md` — `/var/www/likiya`. На сервере путь может быть другим. Берите тот, который указан в `root` у `server_name lizalikiyskaya.ru`.

```bash
sudo nginx -T | grep -n -E 'server_name|root '
```

Найдите блок с `lizalikiyskaya.ru`. Строка `root` — это значение секрета `SITE_PATH`. Дальше в командах оно записано как `SITE_PATH`: подставьте его без слэша в конце.

Проверка, что это именно лендинг, а не студия:

```bash
test -f SITE_PATH/index.html && test -f SITE_PATH/save.php && echo "лендинг на месте"
sudo readlink -f SITE_PATH
```

`readlink` не должен показать `/srv/studio` или что-то внутри него. Если каталога ещё нет, создайте ровно тот путь, который пропишите в nginx, и не кладите лендинг в `/srv/studio/app`:

```bash
sudo mkdir -p SITE_PATH
```

Группу php-fpm (её же пишет админка) посмотрите так:

```bash
ps -eo user,args | awk '/php-fpm: pool/ && $1 != "root" { print $1; exit }'
```

Дальше эта группа записана как `WEB_GROUP`. На Ubuntu это обычно `www-data`. Если команда ничего не напечатала, смотрите сокет и пул:

```bash
ls /run/php/
grep -R "^user\|^group" /etc/php/*/fpm/pool.d/*.conf
```

## 2. Пользователь деплоя и ключ

Отдельный пользователь `likiya`, без sudo. Приватный ключ на сервер не копируют: он уже лежит в секрете GitHub `SSH_KEY` (тот же, которым деплоится студия). На сервер попадает только соответствующая открытая строка из `authorized_keys` пользователя студии.

Пользователь студии — значение секрета `SSH_USER`. Его Лиза называет Михаилу. Ниже он записан как `STUDIO_USER`.

```bash
sudo useradd --create-home --shell /bin/bash --user-group likiya
sudo usermod -aG WEB_GROUP likiya
getent passwd STUDIO_USER
```

Домашний каталог из `getent` подставьте вместо `/home/STUDIO_USER`, если он другой.

```bash
sudo mkdir -p /home/likiya/.ssh
sudo chmod 755 /home/likiya
sudo chmod 700 /home/likiya/.ssh
sudo cp /home/STUDIO_USER/.ssh/authorized_keys /home/likiya/.ssh/authorized_keys
sudo chown -R likiya:likiya /home/likiya/.ssh
sudo chmod 600 /home/likiya/.ssh/authorized_keys
```

Если в файле студии несколько строк, оставьте у `likiya` только ту, которая относится к ключу GitHub Actions (одна строка, начинается с `ssh-ed25519` или `ssh-rsa`). Личные ключи администраторов копировать не нужно. Если строка одна — файл уже правильный.

Пользователя `likiya` не добавляйте в группу пользователя студии и не давайте ему `sudo`.

Если в sshd ограничен список пользователей, добавьте `likiya` и перечитайте конфиг:

```bash
sudo grep -nE '^(AllowUsers|AllowGroups)' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf 2>/dev/null || true
```

Пустой вывод — ничего менять не надо. Если `AllowUsers` есть и `likiya` в нём нет, допишите имя в эту строку и выполните:

```bash
sudo systemctl reload ssh || sudo systemctl reload sshd
```

`likiya` не должен читать и писать `/srv/studio/app`. Проверка от его имени (ожидается «нет» или отказ в доступе на запись):

```bash
sudo -u likiya test -w /srv/studio/app && echo "ОПАСНО: likiya пишет в студию" || echo "студия на запись закрыта"
```

## 3. Права на файлы лендинга

Владелец файлов — `likiya`, группа — `WEB_GROUP`. Писать php должен только в `assets/` (туда `save.php` кладёт `content.json.tmp`) и в `assets/img/` (загрузки). Остальное php достаточно читать.

```bash
sudo chown -R likiya:WEB_GROUP SITE_PATH
sudo find SITE_PATH -type d -exec chmod 755 {} \;
sudo find SITE_PATH -type f -exec chmod 644 {} \;
sudo chmod 2775 SITE_PATH/assets SITE_PATH/assets/img
sudo chmod 664 SITE_PATH/assets/content.json SITE_PATH/assets/posts.json
```

`2775` — это запись для группы и setgid: новые фото админки и новые файлы деплоя наследуют `WEB_GROUP`.

Журнал заявок не переносите и владельца не меняйте:

```bash
sudo ls -ld /var/lib/likiya /var/lib/likiya/leads.jsonl 2>/dev/null || true
```

Файл php-fpm с паролем тоже не трогайте. Он должен остаться доступен только root:

```bash
sudo ls -l /etc/php/*/fpm/pool.d/*likiya* 2>/dev/null || true
```

## 4. Каталог бэкапов и пакеты

Бэкапы лежат вне корня сайта, чтобы nginx их не отдавал. Хранится 8 последних архивов.

```bash
sudo mkdir -p /var/backups/likiya
sudo chown likiya:likiya /var/backups/likiya
sudo chmod 750 /var/backups/likiya
sudo apt-get install -y rsync curl ca-certificates tar
```

Проверка, что `likiya` может писать и в сайт, и в бэкапы:

```bash
sudo -u likiya test -w SITE_PATH && sudo -u likiya test -w /var/backups/likiya && echo ok
```

## 5. Секреты GitHub — это делает Лиза

Страница:

[https://github.com/lizalikiyskaya-dot/studio/settings/secrets/actions](https://github.com/lizalikiyskaya-dot/studio/settings/secrets/actions)

Кнопка **New repository secret**. Имя копируйте точно, регистр важен.

Уже должны быть заведены для студии. Их значения для лендинга те же, заново ключ не создавайте:

| Имя | Значение |
| --- | --- |
| `SSH_HOST` | `185.139.70.79` |
| `SSH_KEY` | весь приватный ключ, включая строки `BEGIN` и `END` (уже сохранён) |
| `SSH_PORT` | не задавать, если SSH на порту 22 |

Добавить для лендинга:

| Имя | Значение |
| --- | --- |
| `SITE_PATH` | корень из шага 1, например `/var/www/likiya` |
| `SITE_SSH_USER` | `likiya` |

Необязательные. Пустое значение — нормально, подставится указанный вариант:

| Имя | Если не задан |
| --- | --- |
| `SITE_URL` | проверка идёт на `https://lizalikiyskaya.ru` |
| `SITE_BACKUP_DIR` | `/var/backups/likiya`, а если он недоступен пользователю — каталог `likiya-backups` рядом с сайтом |
| `SITE_WEB_GROUP` | пользователь процесса `php-fpm`, иначе `www-data` |

`SITE_SSH_USER` можно не создавать, тогда вход пойдёт под `SSH_USER` (пользователь студии). Так делать не стоит: отдельный `likiya` не является владельцем `/srv/studio/app`.

Секрет `HEALTHCHECK_URL` относится к студии (`https://studio.lizalikiyskaya.ru`). Для лендинга его не используйте и не подменяйте. Адрес лендинга — это `SITE_URL`, и его лучше не задавать вовсе.

Не создавайте секрет с паролем админки. Имени `LIZA_ADMIN_PASSWORD` среди секретов GitHub быть не должно.

Пока нет `SSH_HOST`, `SSH_KEY`, `SITE_PATH` и хотя бы одного из `SITE_SSH_USER` / `SSH_USER`, пуш в `site` не падает и сервер не трогает.

## 6. Первый запуск

1. Влейте pull request в ветку `site`.
2. Михаил выполняет шаги 1–4.
3. Лиза сохраняет секреты из шага 5.
4. Любой следующий пуш в `site` выкладывает сайт сам.

Кнопка **Run workflow** на вкладке Actions для ручного запуска появится только когда файл `.github/workflows/deploy-site.yml` есть в ветке по умолчанию (`main`). Для обычной работы она не нужна: деплой запускает пуш в `site`. Копировать workflow в `main` имеет смысл только если захочется кнопка. Триггер push у этого файла — только ветка `site`, поэтому на выкладку студии он не влияет.

В запуске одно задание **Deploy site**:

- если секретов не хватает — зелёный пропуск и список имён;
- иначе проверка скрипта, вход по SSH, бэкап, копирование, проверка `https://lizalikiyskaya.ru`.

Успех проверки — ответ `2xx` и на странице есть текст «Лиза Андреенко». Дополнительно в журнале будут коды `GET /save.php` (норма `401` или `405`) и `GET /send.php` (норма `405`). Другой код — жёлтое предупреждение, само задание из-за него не краснеет: файлы уже скопированы, смотрите nginx.

Во время деплоя лучше не нажимать «Сохранить» в админке. Правка, которая успеет записаться в `content.json`, на сервере останется, но бэкап этого запуска её не содержит.

## 7. Откат

Архивы:

```bash
sudo ls -lt /var/backups/likiya
```

Посмотреть содержимое:

```bash
sudo tar -tzf /var/backups/likiya/likiya-ДАТА.tar.gz | head
```

Вернуть каталог из архива (подставьте имя файла). Команда перезаписывает файлы из архива и не удаляет более новые загрузки:

```bash
sudo -u likiya tar -xzf /var/backups/likiya/likiya-ДАТА.tar.gz -C SITE_PATH
sudo chmod 2775 SITE_PATH/assets SITE_PATH/assets/img
sudo chmod 664 SITE_PATH/assets/content.json SITE_PATH/assets/posts.json
```

Обычный откат кода — `git revert` коммита в ветке `site` и пуш. Следующий деплой привезёт предыдущие `index.html` / `app.js` / `styles.css` и снова не тронет `content.json`, `posts.json` и `upload_*`.

## Если что-то пошло не так

- **В журнале «Деплой лендинга пропущен».** Не задан `SSH_HOST`, `SSH_KEY`, `SITE_PATH` или оба имени пользователя. Секрет с опечаткой в имени для GitHub — это отсутствующий секрет.
- **SSH: Permission denied.** В `authorized_keys` пользователя `likiya` не та строка, файл не `600`, каталог `.ssh` не `700`, или `AllowUsers` не пускает `likiya`.
- **Нет права записи в SITE_PATH.** Повторите шаг 3 от root. Деплой от root скрипт не выполняет.
- **Не может отдать файлы группе www-data.** `sudo usermod -aG WEB_GROUP likiya`. Новая группа действует на следующем входе по SSH; повторный запуск workflow её уже увидит.
- **«Это не корень лендинга».** В каталоге нет `index.html` и `save.php`, либо `SITE_PATH` указывает на `/srv/studio`, `/var/www` целиком или `/var/lib/likiya`.
- **На сервере нет rsync.** `sudo apt-get install -y rsync`.
- **Сайт открывается, админка не сохраняет.** Права на `SITE_PATH/assets` должны быть `2775`, на `content.json` — `664`, группа — `WEB_GROUP`. Пароль по-прежнему только в php-fpm.
- **Форма заявки не уходит, в журнале предупреждение про send.php.** Сначала проверьте код, не меняя nginx:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://lizalikiyskaya.ru/send.php
```

`405` значит PHP уже отвечает, конфиг трогать не нужно. Другой код: в примере nginx из `DEPLOY.md` есть `location ~ \.php$ { deny all; }`. Он закрывает `send.php`, если для него нет отдельного `location`. Существующий конфиг целиком не заменяйте. В тот же `server`, где уже есть `location = /save.php`, добавьте блок без Basic-Auth и с тем же сокетом, что у `save.php`:

```nginx
location = /send.php {
    include fastcgi_params;
    fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root/send.php;
}
```

Сокет возьмите из действующей строки `fastcgi_pass` у `save.php` (`ls /run/php/`), не из примера. Затем:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

- **Проверка с GitHub не открывает сайт, а из браузера он открывается.** Файрвол режет адреса GitHub. Студийный деплой ходит на этот же сервер с тех же адресов; если студия после деплоя открывается, лендинг тоже должен открываться по `https://lizalikiyskaya.ru`.
- **Нужно вернуть файлы вручную.** Шаг 7. Скрипт сам откатывает каталог из свежего архива только если затёр `content.json`, `posts.json` или удалил `upload_*`.
