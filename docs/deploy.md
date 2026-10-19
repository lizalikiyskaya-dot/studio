# Автодеплой студии

После одноразовой настройки каждый push в ветку `main` сам обновляет сайт [https://studio.lizalikiyskaya.ru](https://studio.lizalikiyskaya.ru).

Пока секреты GitHub не добавлены, push в `main` всё равно проходит: сборка в GitHub выполняется, а шаг деплоя пишет «Деплой пропущен» и завершается успешно. Сервер при этом не меняется.

Скрипт на сервере не создаёт и не изменяет файлы `.env` и `.env.deploy`.

## Что понадобится

- Доступ к серверу по SSH. Сейчас сайт отвечает с адреса `185.139.70.79`, SSH-порт `22`. Если заходите другим именем хоста, используйте его.
- Пользователь, под которым уже крутится приложение. Это не `root`.
- Файл `.env` в каталоге приложения. Какие переменные в нём нужны, перечислено в `.env.example` (`DATABASE_URL`, `JWT_SECRET` и при необходимости остальные). Секреты в git не кладутся. Скрипт деплоя `.env.example` поверх `.env` не копирует.

Дальше команды рассчитаны на человека, который умеет открыть терминал и вставить команду. Имена `APP_USER` и `APP_PATH` ниже — это то, что вы найдёте на сервере в шаге 1. Подставляйте их без угловых скобок.

## 1. Узнать пользователя и каталог

Зайдите на сервер так, как заходите обычно.

```bash
whoami
ps aux | grep -E 'next-server|next start|node' | grep -v grep
```

В колонке пользователя будет `APP_USER`. Каталог процесса можно посмотреть так (подставьте PID из второй колонки):

```bash
ls -l /proc/PID/cwd
```

Запомните полный путь. Это `APP_PATH`, например `/var/www/studio`.

Проверьте, не запущен ли процесс уже через pm2 или systemd:

```bash
pm2 list
systemctl list-units --type=service --state=running | grep -Ei 'node|next|studio' || true
```

Одна из этих команд может написать «команда не найдена». Это нормально: значит, этого способа на сервере нет. Какой способ есть, такой и настраиваем в шаге 5.

## 2. Отдельный SSH-ключ для GitHub

Ключ нужен только для деплоя. Личный ключ, которым вы сами заходите на сервер, в GitHub не кладите.

На своём компьютере (macOS, Linux или Windows с OpenSSH):

```bash
ssh-keygen -t ed25519 -a 200 -f ./studio_deploy_key -C "github-actions-deploy-studio" -N ""
```

Появятся два файла:

- `studio_deploy_key` — секретный ключ. Его содержимое потом станет секретом `SSH_KEY`.
- `studio_deploy_key.pub` — открытый ключ. Его кладём на сервер.

Пока секретный файл не удалён, не отправляйте его в чаты и не коммитьте.

## 3. Открытый ключ — пользователю приложения

На сервере каталог `.ssh` должен принадлежать `APP_USER`, не root.

Если вы зашли уже как `APP_USER`:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

На своём компьютере одной командой допишите открытый ключ (подставьте пользователя, адрес и порт, если он не 22):

```bash
ssh APP_USER@185.139.70.79 'mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys' < ./studio_deploy_key.pub
```

Если зайти как `APP_USER` пока нельзя, а есть другой пользователь с `sudo`:

```bash
sudo -u APP_USER mkdir -p ~APP_USER/.ssh
sudo -u APP_USER chmod 700 ~APP_USER/.ssh
sudo -u APP_USER tee -a ~APP_USER/.ssh/authorized_keys < ./studio_deploy_key.pub
sudo -u APP_USER chmod 600 ~APP_USER/.ssh/authorized_keys
sudo chown -R APP_USER:APP_USER ~APP_USER/.ssh
```

Проверка со своего компьютера:

```bash
ssh -i ./studio_deploy_key -p 22 APP_USER@185.139.70.79 'whoami'
```

Ответ должен быть `APP_USER`. Если спрашивает пароль, открытый ключ лёг не в тот файл или права на `~/.ssh` другие: у каталога `700`, у `authorized_keys` — `600`, владелец — `APP_USER`.

## 4. Каталог приложения — клон репозитория

Репозиторий публичный: `https://github.com/lizalikiyskaya-dot/studio.git`.

Проверьте текущий каталог:

```bash
cd APP_PATH
git remote -v
git status --short
```

Если `git remote -v` показывает этот репозиторий, шаг почти готов. Remote должен называться `origin`. Ветка на сервере может быть любой: деплой всё равно ставит код в состояние `origin/main`.

Файл `.env` должен лежать в этом же каталоге. Правки в отслеживаемых файлах на сервере деплой затрёт. `.env`, `.env.deploy` и каталог `certs/` в git не входят, скрипт их не удаляет.

Если каталог ещё не клон, перенесите текущую копию в сторону и склонируйте репозиторий на то же место. Сначала сохраните `.env`:

```bash
cp APP_PATH/.env ~/studio.env.backup
ls APP_PATH/certs 2>/dev/null && cp -a APP_PATH/certs ~/studio.certs.backup || true
```

Остановите приложение на время переноса (`pm2 stop имя` или `sudo systemctl stop имя`), затем:

```bash
mv APP_PATH APP_PATH.manual-backup
git clone https://github.com/lizalikiyskaya-dot/studio.git APP_PATH
cp ~/studio.env.backup APP_PATH/.env
chmod 600 APP_PATH/.env
if [ -d ~/studio.certs.backup ]; then cp -a ~/studio.certs.backup APP_PATH/certs; fi
```

Если клонировали от root, отдайте каталог пользователю приложения:

```bash
sudo chown -R APP_USER:APP_USER APP_PATH
```

Дальше все команды в каталоге — от `APP_USER`.

Старую копию `APP_PATH.manual-backup` удаляйте только после того, как сайт открылся из нового каталога.

## 5. Node.js

На сервере нужен Node.js 20.9 или новее. В GitHub сборка идёт на Node.js 22. Проверка именно так, как заходит деплой (неинтерактивно):

```bash
ssh -i ./studio_deploy_key -p 22 APP_USER@185.139.70.79 'bash --noprofile --norc -lc "command -v node; node -v; command -v npm; npm -v"'
```

Если версия уже `v20.9` или выше и обе команды находятся, ничего ставить не нужно.

Если Node стоит через nvm и в этой проверке его не видно, скрипт деплоя сам подхватывает `~/.nvm/nvm.sh`. Для systemd надёжнее поставить Node в систему, чтобы путь был `/usr/bin/node`. На Ubuntu/Debian от `APP_USER` этого не сделать; пользователь с `sudo` может поставить Node.js 22 с [nodejs.org](https://nodejs.org/) тем способом, который принят на этом сервере (пакет дистрибутива или NodeSource). После установки снова выполните проверку выше.

## 6. Как приложение перезапускается

Нужен один способ. Если заданы несколько, скрипт берёт их в таком порядке: `RESTART_CMD`, затем `PM2_APP_NAME`, затем `SYSTEMD_SERVICE`.

Запишите выбор в файл `APP_PATH/.env.deploy`. Этот файл не попадает в git (шаблон `.env*` уже есть в `.gitignore`). Пример для pm2:

```bash
printf '%s\n' 'PM2_APP_NAME=studio' > APP_PATH/.env.deploy
chmod 600 APP_PATH/.env.deploy
```

Строка без `export`, без пробелов вокруг `=`. Кавычки по краям значения можно не ставить.

Те же три имени можно вместо файла положить в секреты GitHub (шаг 7). Непустое значение секрета важнее файла на сервере.

### pm2

Посмотрите имя уже запущенного процесса:

```bash
pm2 list
```

В `.env.deploy` запишите это имя в `PM2_APP_NAME`. Имя может состоять из букв, цифр, точки, `_` и `-`.

Если pm2 есть, а процесса ещё нет (вы только что склонировали каталог и собрали проект вручную):

```bash
cd APP_PATH
npm ci
npx prisma generate
npm run build
pm2 start npm --name studio -- start
pm2 save
pm2 startup
```

Команда `pm2 startup` напечатает строку с `sudo`. Её нужно выполнить один раз, иначе после перезагрузки сервера процесс не поднимется. Имя в `--name` и в `PM2_APP_NAME` должно совпадать.

Проверка:

```bash
pm2 describe studio
curl -sS -o /dev/null -w '%{http_code}\n' -L https://studio.lizalikiyskaya.ru
```

Код `2xx` (часто `200`) значит, что сайт открылся. Главная без входа перенаправляет на страницу входа, поэтому в проверке есть флаг `-L`.

### systemd

Если сервиса ещё нет, пользователь с `sudo` создаёт юнит. Подставьте пользователя, путь и путь к `npm` (`command -v npm`).

Файл `/etc/systemd/system/studio.service`:

```ini
[Unit]
Description=Liza Studio (Next.js)
After=network.target

[Service]
Type=simple
User=APP_USER
Group=APP_USER
WorkingDirectory=/ABS/APP_PATH
Environment=NODE_ENV=production
EnvironmentFile=/ABS/APP_PATH/.env
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Дальше:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now studio
sudo systemctl status studio
```

В `.env.deploy` запишите `SYSTEMD_SERVICE=studio` (имя без `.service`, как в имени файла до точки).

Деплой перезапускает сервис через `sudo` без пароля. Разрешите только эти две команды. Путь узнайте командой `command -v systemctl` (часто `/usr/bin/systemctl`):

```bash
sudo visudo -f /etc/sudoers.d/studio-deploy
```

Одна строка, имена подставьте свои:

```sudoers
APP_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart studio, /usr/bin/systemctl is-active --quiet studio
```

Сохраните и закройте редактор. Проверка от `APP_USER` не должна спрашивать пароль:

```bash
sudo -n /usr/bin/systemctl restart studio
sudo -n /usr/bin/systemctl is-active --quiet studio && echo active
```

### Своя команда

Если процесс поднимается иначе, запишите полную команду:

```bash
printf '%s\n' 'RESTART_CMD=pm2 restart studio' > APP_PATH/.env.deploy
```

Скрипт выполняет её через `bash -c`.

## 7. Секреты GitHub

Откройте страницу секретов репозитория:

[https://github.com/lizalikiyskaya-dot/studio/settings/secrets/actions](https://github.com/lizalikiyskaya-dot/studio/settings/secrets/actions)

Кнопка **New repository secret**. Имя копируйте точно, регистр важен.

Обязательные:

| Имя | Что вставить |
| --- | --- |
| `SSH_HOST` | `185.139.70.79` или тот хост, через который вы заходите |
| `SSH_USER` | `APP_USER` |
| `SSH_KEY` | Весь файл `studio_deploy_key`, включая строки `BEGIN` и `END` |
| `APP_PATH` | Полный путь каталога, например `/var/www/studio` |

Необязательные:

| Имя | Когда нужно |
| --- | --- |
| `SSH_PORT` | Только если SSH слушает не порт `22` |
| `PM2_APP_NAME` | Имя процесса из `pm2 list`, если не записали его в `.env.deploy` |
| `SYSTEMD_SERVICE` | Имя сервиса, если не записали его в `.env.deploy` |
| `RESTART_CMD` | Своя команда перезапуска. Если секрет задан, он важнее pm2 и systemd |
| `HEALTHCHECK_URL` | Адрес для проверки после деплоя. По умолчанию `https://studio.lizalikiyskaya.ru` |

После того как секрет `SSH_KEY` сохранён в GitHub, секретный файл на своём компьютере удалите:

```bash
rm ./studio_deploy_key
```

Открытый `.pub` можно оставить, чтобы помнить, какой ключ лежит на сервере.

## 8. Первый деплой и логи

1. Влейте эту настройку в `main` (через pull request).
2. Добавьте секреты из шага 7 и подготовьте сервер из шагов 1–6.
3. Откройте вкладку **Actions** репозитория, слева выберите workflow **Deploy**, справа **Run workflow**, ветка `main`, кнопка **Run workflow**.

Обычный push в `main` после этого запускает тот же workflow сам.

В запуске два задания:

- **Build** — `npm ci` и `npm run build` на GitHub с фиктивными `DATABASE_URL` и `JWT_SECRET`. База для этого не нужна. Линтер в этот workflow не входит: в проекте уже есть предупреждения React Hooks, из-за них деплой не останавливается.
- **Deploy** — заходит на сервер, запускает `scripts/deploy.sh`, затем открывает сайт. Код ответа должен быть `2xx`. Переход на страницу входа считается успехом.

Если обязательного секрета нет, **Deploy** зелёный и в журнале написано, каких имён не хватает.

Журнал на сервере:

```bash
pm2 logs studio --lines 100
```

или

```bash
journalctl -u studio -n 100 --no-pager
```

Что делает `scripts/deploy.sh` по порядку:

1. Проверяет, что это не root, каталог — git-клон, файл `.env` на месте, Node.js подходит, и заранее известен способ перезапуска.
2. Запоминает контрольную сумму `.env` и `.env.deploy`.
3. `git fetch origin main` и `git reset --hard origin/main`.
4. `npm ci`, `npx prisma generate`.
5. `npx prisma migrate deploy` только если в репозитории есть каталог `prisma/migrations`. Сейчас его нет, шаг пропускается.
6. `npm run build`.
7. Снова проверяет, что `.env` и `.env.deploy` не изменились.
8. Новые файлы `docs/sql/*.sql`: сначала бэкап базы, потом каждый файл один раз. Если бэкапа нет или SQL падает, скрипт здесь останавливается.
9. Перезапускает приложение.

Если сборка, бэкап или SQL падают, перезапуска нет. Уже работающий процесс остаётся на старом коде. Новые файлы на диске сами по себе сайт не переключают.

## Схема базы

Правки схемы лежат в `docs/sql/`. Правила для нового файла — в `docs/sql/README.md`: только добавление, повтор безопасен, имя лучше `YYYY-MM-DD-описание.sql`.

Пока в каталоге нет нового файла, деплой базу не трогает. Когда файл появляется в `main`, следующий деплой делает так:

1. Читает `DATABASE_URL` из `.env` в каталоге приложения (тот же файл, что у сервиса `studio`). В журнал строка подключения не пишется.
2. Снимает бэкап. Если на сервере есть `pg_dump`, файл будет `.dump`. Если нет — бэкап всё равно снимается средствами Node, файл будет `.sql`. Без бэкапа SQL не запускается.
3. Применяет только те файлы, которых ещё нет в служебной таблице `_applied_sql`. Каждый — своей транзакцией, один раз. Повторный деплой их пропускает.
4. `docs/sql/baseline.txt` — файлы, которые уже выполняли на проде руками. Сейчас список пустой. Новые файлы туда не добавлять.
5. Файл с `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE` или `RENAME` деплой отклоняет целиком, базу не меняет и сайт не перезапускает.

Бэкапы лежат в `/srv/studio/backups`, если каталог `/srv/studio` есть и пользователь приложения может туда писать. Иначе — в домашнем каталоге, `~/studio-backups`. Имя: `studio-backup-ГГГГММДДTЧЧММССZ.dump` или `.sql`. Хранятся последние 10, более старые удаляются.

Клиент PostgreSQL ставить не обязательно. Если `psql` есть, деплой пользуется им. Если нет — тем же пакетом `pg`, который уже ставится вместе с приложением.

## 9. Откат

Обычный откат — вернуть код в `main`, чтобы следующий деплой привёз старую версию.

На своём компьютере в клоне репозитория:

```bash
git checkout main
git pull origin main
git revert --no-edit SHA
git push origin main
```

`SHA` — коммит, который нужно отменить. Его видно в журнале Actions или через `git log --oneline`. Push в `main` сам запустит деплой.

Срочно, если сайт уже лежит, а ждать GitHub нельзя. Зайдите как `APP_USER` и соберите нужный коммит вручную. Скрипт `scripts/deploy.sh` для этого не подходит: он всегда ставит `origin/main`.

```bash
cd APP_PATH
git fetch origin
git log --oneline -10
git reset --hard ХОРОШИЙ_SHA
npm ci
npx prisma generate
npm run build
pm2 restart studio
```

Для systemd вместо последней строки:

```bash
sudo -n systemctl restart studio
```

Следующий автоматический деплой снова поставит `origin/main`. Поэтому после ручного отката всё равно сделайте `git revert` в GitHub, иначе плохой коммит вернётся.

Откат кода не убирает уже применённый SQL: файлы в `docs/sql/` только добавляют столбцы и таблицы, старый код с ними работает. Базу откатывать нужно, только если новые данные уже испортились. Перед таким SQL деплой сам кладёт бэкап (каталог — в разделе «Схема базы» выше). Сайт на время восстановления остановите.

Файл `.dump` (его сделал `pg_dump`):

```bash
sudo systemctl stop studio
cd /srv/studio/app
# Пароль остаётся в .env. В чат и в историю команд целиком строку не копируйте.
url=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)
url=${url#\"}; url=${url%\"}; url=${url#\'}; url=${url%\'}
pg_restore --clean --if-exists --no-owner --no-acl -d "$url" /srv/studio/backups/ФАЙЛ.dump
unset url
sudo systemctl start studio
```

`--clean` сначала убирает текущие таблицы и заливает данные из бэкапа. Это и есть откат базы. Команду не запускайте «на всякий случай».

Файл `.sql` (его сделал Node, потому что `pg_dump` на сервере не было) рассчитан на пустую базу. Его нельзя накатывать поверх живой: ключи совпадут и команда остановится.

Остановите сайт: `sudo systemctl stop studio`. Имя пользователя базы и имя самой базы — это куски `DATABASE_URL` в `.env`: пользователь до `@`, база после последнего `/`. Пароль никуда не копируйте.

```bash
sudo -u postgres psql -c 'CREATE DATABASE studio_restore OWNER "ПОЛЬЗОВАТЕЛЬ_ИЗ_DATABASE_URL";'
```

Дальше в строке подключения замените только имя базы на `studio_restore` и залейте файл:

```bash
cd /srv/studio/app
psql "postgresql://ПОЛЬЗОВАТЕЛЬ@ХОСТ:5432/studio_restore" -v ON_ERROR_STOP=1 -f /srv/studio/backups/ФАЙЛ.sql
```

Когда команда закончилась без ошибки, переименуйте базы. `СТАРАЯ_БАЗА` — то имя, которое было в `.env`.

```bash
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname IN ('СТАРАЯ_БАЗА', 'studio_restore');"
sudo -u postgres psql -c 'ALTER DATABASE "СТАРАЯ_БАЗА" RENAME TO studio_before_restore;'
sudo -u postgres psql -c 'ALTER DATABASE studio_restore RENAME TO "СТАРАЯ_БАЗА";'
sudo systemctl start studio
```

Что уже применено:

```bash
cd /srv/studio/app
url=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)
url=${url#\"}; url=${url%\"}; url=${url#\'}; url=${url%\'}
psql "$url" -c 'SELECT "filename", "applied_at" FROM "_applied_sql" ORDER BY "applied_at";'
unset url
```

## Если что-то пошло не так

- **GitHub пишет «Деплой пропущен».** Не задан один из секретов `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `APP_PATH`. Имена смотрите в тексте шага.
- **`git fetch`: Host key verification failed.** В каталоге приложения `origin` должен быть `https://github.com/lizalikiyskaya-dot/studio.git`. Адрес `git@github.com:...` для публичного репозитория не нужен.
- **SSH: Permission denied.** В `SSH_KEY` попал не весь ключ, это открытый `.pub`, или открытый ключ не в `authorized_keys` пользователя `SSH_USER`.
- **APP_PATH is not a git clone.** Повторите шаг 4.
- **Нет .env.** Скопируйте сохранённый `~/studio.env.backup` в `APP_PATH/.env`. Скрипт файл не создаст.
- **Процесс pm2 не найден.** Имя в `PM2_APP_NAME` должно совпадать с `pm2 list`.
- **sudo просит пароль.** Строка в `/etc/sudoers.d/studio-deploy` должна совпадать с путём `systemctl` и именем сервиса. Готовую строку скрипт печатает в журнал, если перезапуск не удался.
- **Сборка на сервере убита по памяти.** Добавьте swap или соберите проект ещё раз: `cd APP_PATH && npm run build`. Workflow обрывает удалённую команду через 30 минут.
- **Сайт после деплоя отвечает не `2xx`.** Смотрите `pm2 logs` или `journalctl`. Частые причины: в `.env` нет `DATABASE_URL` или `JWT_SECRET`, Node смотрит не на тот порт, nginx проксирует не на тот порт. Порт приложения этот workflow не меняет: `npm start` слушает порт `3000`, если в окружении не задан `PORT`.
- **Большой файл без gzip обрывается около 16 КБ.** Это не лечится кодом Next. В `server` nginx для студии и лендинга нужны `ssl_buffer_size 4k` и `gzip on` из `deploy/nginx-tls-stall.conf`. Деплой этот файл не применяет: правка nginx требует root, а ошибка в конфиге остановит сайт. После правки: `sudo nginx -t && sudo systemctl reload nginx`.
- **Деплой остановился на SQL.** Сайт не переключался на новый код, старый процесс ещё работает. В журнале будет имя файла. Если написано «запрещённая команда», в файле есть удаление или переименование — такой файл на прод класть нельзя. Если написано «не удалось применить», транзакция этого файла отменилась. Бэкап, если он успел сняться, лежит в каталоге из раздела «Схема базы».
- **«Не удалось снять бэкап».** SQL не запускался. Место на диске и права на `/srv/studio/backups` или `~/studio-backups`. Клиент `postgresql-client` для этого не обязателен.
