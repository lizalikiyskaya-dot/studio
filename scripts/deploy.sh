#!/usr/bin/env bash
# Deploy the app on the server. Invoked over SSH by .github/workflows/deploy.yml.
# Does not create or modify .env or .env.deploy.

set -euo pipefail

log() {
  printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

die() {
  printf 'Ошибка: %s\n' "$*" >&2
  exit 1
}

file_sha() {
  sha256sum "$1" | awk 'NR==1 { print $1 }'
}

strip_wrapping_quotes() {
  local value="$1"
  local len="${#value}"
  local first last
  if [ "$len" -ge 2 ]; then
    first="${value:0:1}"
    last="${value:len-1:1}"
    if [ "$first" = "$last" ] && { [ "$first" = '"' ] || [ "$first" = "'" ]; }; then
      value="${value:1:len-2}"
    fi
  fi
  printf '%s' "$value"
}

# Non-interactive SSH often has a minimal PATH. Source nvm when node is missing.
# A top-level `return` inside nvm.sh leaves this function immediately, so the
# caller restores `set -euo pipefail` afterwards.
load_node_path() {
  if command -v npm >/dev/null 2>&1 && command -v node >/dev/null 2>&1; then
    return 0
  fi
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    set +eu
    # shellcheck disable=SC1090,SC1091
    . "$HOME/.nvm/nvm.sh"
  fi
}

add_latest_nvm_node_to_path() {
  if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    return 0
  fi
  [ -d "$HOME/.nvm/versions/node" ] || return 0
  local latest
  latest="$(find "$HOME/.nvm/versions/node" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -n 1)"
  if [ -n "$latest" ] && [ -x "$latest/bin/node" ]; then
    export PATH="$latest/bin:$PATH"
  fi
  hash -r || true
}

require_node() {
  command -v node >/dev/null 2>&1 || die "node не найден в PATH=$PATH. Установите Node.js 20.9+ так, чтобы его видела неинтерактивная SSH-сессия. См. docs/deploy.md"
  command -v npm >/dev/null 2>&1 || die "npm не найден в PATH=$PATH"
  node <<'NODE'
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 9)) {
  console.error(`Node.js ${process.version} слишком старый. Нужен Node.js 20.9 или новее.`);
  process.exit(1);
}
NODE
}

# Read only restart settings. Do not source the file: it must not override DATABASE_URL.
apply_deploy_env_file() {
  local file="$APP_PATH/.env.deploy"
  [ -f "$file" ] || return 0
  local line key value
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    case "$line" in
      ""|\#*) continue ;;
    esac
    case "$line" in
      export\ *) line="${line#export }" ;;
    esac
    case "$line" in
      *=*) ;;
      *) continue ;;
    esac
    key="${line%%=*}"
    key="${key%"${key##*[![:space:]]}"}"
    value="${line#*=}"
    value="$(strip_wrapping_quotes "$value")"
    case "$key" in
      RESTART_CMD|PM2_APP_NAME|SYSTEMD_SERVICE) ;;
      *) continue ;;
    esac
    if [ -z "${!key:-}" ]; then
      printf -v "$key" '%s' "$value"
    fi
  done < "$file"
}

load_restart_settings() {
  local explicit_restart explicit_pm2 explicit_systemd
  explicit_restart="${RESTART_CMD:-}"
  explicit_pm2="${PM2_APP_NAME:-}"
  explicit_systemd="${SYSTEMD_SERVICE:-}"
  RESTART_CMD=""
  PM2_APP_NAME=""
  SYSTEMD_SERVICE=""
  apply_deploy_env_file
  if [ -n "$explicit_restart" ]; then
    RESTART_CMD="$explicit_restart"
  fi
  if [ -n "$explicit_pm2" ]; then
    PM2_APP_NAME="$explicit_pm2"
  fi
  if [ -n "$explicit_systemd" ]; then
    SYSTEMD_SERVICE="$explicit_systemd"
  fi
}

snapshot_protected_files() {
  ENV_SHA=""
  DEPLOY_ENV_SHA=""
  if [ -f "$APP_PATH/.env" ]; then
    ENV_SHA="$(file_sha "$APP_PATH/.env")"
  fi
  if [ -f "$APP_PATH/.env.deploy" ]; then
    DEPLOY_ENV_SHA="$(file_sha "$APP_PATH/.env.deploy")"
  fi
}

assert_protected_files() {
  local now
  if [ -n "$ENV_SHA" ]; then
    [ -f "$APP_PATH/.env" ] || die ".env исчез во время деплоя"
    now="$(file_sha "$APP_PATH/.env")"
    [ "$now" = "$ENV_SHA" ] || die ".env изменился во время деплоя. Скрипт его не должен трогать."
  elif [ -f "$APP_PATH/.env" ]; then
    die "Во время деплоя появился .env. Скрипт его не создаёт."
  fi
  if [ -n "$DEPLOY_ENV_SHA" ]; then
    [ -f "$APP_PATH/.env.deploy" ] || die ".env.deploy исчез во время деплоя"
    now="$(file_sha "$APP_PATH/.env.deploy")"
    [ "$now" = "$DEPLOY_ENV_SHA" ] || die ".env.deploy изменился во время деплоя"
  fi
}

require_restart_method() {
  if [ -z "${RESTART_CMD:-}${PM2_APP_NAME:-}${SYSTEMD_SERVICE:-}" ]; then
    cat >&2 <<EOF
Не задан способ перезапуска. Укажите один из вариантов в $APP_PATH/.env.deploy
(файл не коммитится) или в секретах GitHub Actions:

  PM2_APP_NAME=имя-из-pm2-list
  SYSTEMD_SERVICE=имя-сервиса
  RESTART_CMD=команда перезапуска

Если заданы несколько, используется RESTART_CMD, иначе PM2_APP_NAME, иначе SYSTEMD_SERVICE.
См. docs/deploy.md
EOF
    exit 1
  fi

  if [ -n "${RESTART_CMD:-}" ]; then
    log "Перезапуск будет через RESTART_CMD"
    return 0
  fi

  if [ -n "${PM2_APP_NAME:-}" ]; then
    [[ "$PM2_APP_NAME" =~ ^[A-Za-z0-9._-]+$ ]] || die "PM2_APP_NAME может содержать только буквы, цифры, точку, _ и -. Сейчас: $PM2_APP_NAME"
    command -v pm2 >/dev/null 2>&1 || die "PM2_APP_NAME=$PM2_APP_NAME, но команда pm2 не найдена в PATH=$PATH"
    if ! pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
      die "Процесс pm2 «$PM2_APP_NAME» не найден. Посмотрите список: pm2 list"
    fi
    log "Перезапуск будет через pm2: $PM2_APP_NAME"
    return 0
  fi

  [[ "$SYSTEMD_SERVICE" =~ ^[A-Za-z0-9@._-]+$ ]] || die "SYSTEMD_SERVICE содержит недопустимые символы: $SYSTEMD_SERVICE"
  command -v systemctl >/dev/null 2>&1 || die "systemctl не найден"
  if ! systemctl cat "$SYSTEMD_SERVICE" >/dev/null 2>&1; then
    die "Сервис systemd «$SYSTEMD_SERVICE» не найден. Проверьте: systemctl cat $SYSTEMD_SERVICE"
  fi
  log "Перезапуск будет через systemd: $SYSTEMD_SERVICE"
}

restart_app() {
  if [ -n "${RESTART_CMD:-}" ]; then
    log "Перезапуск командой RESTART_CMD"
    bash --noprofile --norc -c "$RESTART_CMD"
    return 0
  fi

  if [ -n "${PM2_APP_NAME:-}" ]; then
    log "Перезапуск pm2: $PM2_APP_NAME"
    # Without --update-env the process keeps the environment it was started with.
    pm2 restart "$PM2_APP_NAME"
    return 0
  fi

  local systemctl_bin
  systemctl_bin="$(command -v systemctl)"
  log "Перезапуск systemd: $SYSTEMD_SERVICE"
  if ! sudo -n "$systemctl_bin" restart "$SYSTEMD_SERVICE"; then
    cat >&2 <<EOF
systemctl restart не выполнился без пароля.
Добавьте правило (имя сервиса и путь к systemctl должны совпасть):

sudo visudo -f /etc/sudoers.d/studio-deploy

$(whoami) ALL=(root) NOPASSWD: $systemctl_bin restart $SYSTEMD_SERVICE, $systemctl_bin is-active --quiet $SYSTEMD_SERVICE
EOF
    exit 1
  fi
  if ! sudo -n "$systemctl_bin" is-active --quiet "$SYSTEMD_SERVICE"; then
    die "Сервис $SYSTEMD_SERVICE не в состоянии active после перезапуска. Журнал: journalctl -u $SYSTEMD_SERVICE -n 100 --no-pager"
  fi
}

main() {
  APP_PATH="${APP_PATH:-}"
  [ -n "$APP_PATH" ] || die "APP_PATH пуст. Задайте секрет APP_PATH или переменную APP_PATH."
  [ -d "$APP_PATH" ] || die "Каталог APP_PATH не существует: $APP_PATH"
  [ "$(id -u)" -ne 0 ] || die "Деплой от root запрещён. SSH_USER должен быть пользователем приложения."
  [ -w "$APP_PATH" ] || die "Нет прав на запись в $APP_PATH для пользователя $(whoami)"
  [ -d "$APP_PATH/.git" ] || die "$APP_PATH не является git-клоном. См. docs/deploy.md"
  [ -f "$APP_PATH/.env" ] || die "В $APP_PATH нет файла .env. Создайте его на сервере вручную. Этот скрипт .env не записывает."
  command -v sha256sum >/dev/null 2>&1 || die "Не найдена команда sha256sum"
  command -v git >/dev/null 2>&1 || die "Не найдена команда git"

  cd "$APP_PATH"
  load_node_path || true
  set -euo pipefail
  add_latest_nvm_node_to_path
  require_node
  load_restart_settings
  require_restart_method

  git remote get-url origin >/dev/null 2>&1 || die "В клоне нет remote origin"
  snapshot_protected_files

  log "Каталог: $APP_PATH"
  log "Пользователь: $(whoami)"
  log "Node: $(node -v)"
  log "Обновление origin/main"
  export GIT_TERMINAL_PROMPT=0
  git fetch origin main
  git rev-parse --verify origin/main >/dev/null 2>&1 || die "После fetch нет ветки origin/main"
  git reset --hard origin/main
  assert_protected_files

  log "Коммит: $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

  log "npm ci"
  npm ci

  log "prisma generate"
  npx prisma generate

  if [ -d prisma/migrations ]; then
    log "prisma migrate deploy"
    npx prisma migrate deploy
  else
    log "Каталога prisma/migrations нет, prisma migrate deploy пропущен"
  fi

  log "npm run build"
  npm run build
  assert_protected_files

  # Backup first, then docs/sql. A failure here must not reach restart_app:
  # the process that is already running keeps the previous code.
  log "База: резервная копия и новые docs/sql (до перезапуска)"
  bash ./scripts/apply-sql.sh

  restart_app
  log "Деплой завершён: $(git rev-parse --short HEAD)"
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"
fi
