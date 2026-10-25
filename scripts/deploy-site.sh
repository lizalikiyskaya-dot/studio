#!/usr/bin/env bash
# Выкладка лендинга lizandwriter.ru. Запускается по SSH из
# .github/workflows/deploy-site.yml.
#
# Не читает и не пишет пароли. Не трогает /srv/studio (приложение студии)
# и /var/lib/likiya (журнал заявок send.php).
#
# Серверные данные админки и крона не перезаписываются и не удаляются:
#   assets/content.json      — правки из save.php
#   assets/content.json.tmp  — незавершённая запись save.php
#   assets/posts.json        — лента, её обновляет cron scripts/fetch-dzen.js
#   assets/img/upload_*      — фото, загруженные через админку
#
# Окружение:
#   SITE_PATH          абсолютный корень сайта (секрет GitHub)
#   RELEASE_DIR        распакованный архив коммита
#   SITE_BACKUP_DIR    необязательно, иначе /var/backups/likiya или соседний каталог
#   SITE_WEB_GROUP     необязательно, иначе группа процесса php-fpm или www-data

set -euo pipefail

log() {
  printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*" >&2
}

die() {
  printf 'Ошибка: %s\n' "$*" >&2
  exit 1
}

trim() {
  local value="$1"
  value="${value//$'\r'/}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

file_sha() {
  sha256sum "$1" | awk 'NR==1 { print $1 }'
}

group_can_write() {
  local mode
  mode="$(stat -c '%A' "$1")"
  [ "${mode:5:1}" = "w" ]
}

dir_is_setgid() {
  local mode
  mode="$(stat -c '%A' "$1")"
  case "${mode:6:1}" in
    s|S) return 0 ;;
    *) return 1 ;;
  esac
}

refuse_tree() {
  local path="$1"
  local label="$2"
  case "$path" in
    /|/bin|/sbin|/usr|/etc|/opt|/root|/home|/tmp|/var|/var/www|/srv)
      die "$label — слишком общий путь ($path). Нужен отдельный каталог сайта."
      ;;
    /srv/studio|/srv/studio/*)
      die "$label попадает в каталог студии ($path). Лендинг туда выкладывать нельзя."
      ;;
    /var/lib/likiya|/var/lib/likiya/*)
      die "$label попадает в журнал заявок ($path). Его деплой не меняет."
      ;;
  esac
}

normalize_absolute() {
  local path="$1"
  local label="$2"
  path="$(trim "$path")"
  path="${path%/}"
  [ -n "$path" ] || die "$label пустой"
  case "$path" in
    /*) ;;
    *) die "$label должен быть абсолютным путём, сейчас: $path" ;;
  esac
  case "$path" in
    *..*) die "$label не должен содержать .. ($path)" ;;
  esac
  case "$path" in
    *[!A-Za-z0-9._/-]*) die "$label содержит недопустимый символ: $path" ;;
  esac
  printf '%s' "$path"
}

detect_web_group() {
  local configured detected
  configured="$(trim "${SITE_WEB_GROUP:-}")"
  if [ -n "$configured" ]; then
    getent group "$configured" >/dev/null 2>&1 || die "Группа SITE_WEB_GROUP=$configured не найдена на сервере"
    printf '%s' "$configured"
    return 0
  fi
  detected="$(ps -eo user,args 2>/dev/null | awk '/php-fpm: pool/ && $1 != "root" { print $1; exit }' || true)"
  if [ -n "$detected" ] && getent group "$detected" >/dev/null 2>&1; then
    printf '%s' "$detected"
    return 0
  fi
  if getent group www-data >/dev/null 2>&1; then
    printf '%s' www-data
    return 0
  fi
  die "Не удалось определить группу php-fpm. Задайте SITE_WEB_GROUP (обычно www-data)."
}

backup_inside_site() {
  case "$1" in
    "$2"|"$2"/*) return 0 ;;
    *) return 1 ;;
  esac
}

# Каталог бэкапов выбирается, когда SITE_BACKUP_DIR не задан.
# Явный путь проверяет main до mkdir, чтобы не создать каталог внутри сайта.
choose_backup_dir() {
  local preferred sibling
  preferred="/var/backups/likiya"
  if mkdir -p "$preferred" 2>/dev/null && [ -w "$preferred" ]; then
    printf '%s' "$preferred"
    return 0
  fi
  sibling="$(dirname "$SITE_PATH")/likiya-backups"
  sibling="$(normalize_absolute "$sibling" "каталог бэкапов")"
  if backup_inside_site "$sibling" "$SITE_PATH"; then
    die "Автоматический каталог бэкапов попал внутрь сайта. Задайте SITE_BACKUP_DIR вне SITE_PATH."
  fi
  mkdir -p "$sibling" || die "Не удалось создать каталог бэкапов $sibling. Создайте /var/backups/likiya и отдайте его пользователю деплоя. См. docs/deploy-site.md"
  [ -w "$sibling" ] || die "Нет права записи в $sibling"
  log "Каталог /var/backups/likiya недоступен, бэкапы пишу в $sibling"
  printf '%s' "$sibling"
}

prepare_backup_dir() {
  local candidate
  if [ -n "$(trim "${SITE_BACKUP_DIR:-}")" ]; then
    candidate="$(normalize_absolute "$(trim "$SITE_BACKUP_DIR")" "SITE_BACKUP_DIR")"
    if backup_inside_site "$candidate" "$SITE_PATH"; then
      die "Бэкапы нельзя класть внутрь $SITE_PATH: nginx отдаст архив наружу"
    fi
    refuse_tree "$candidate" "Каталог бэкапов"
    mkdir -p "$candidate" || die "Не удалось создать SITE_BACKUP_DIR=$candidate"
    [ -w "$candidate" ] || die "Нет права записи в SITE_BACKUP_DIR=$candidate"
  else
    candidate="$(choose_backup_dir)"
  fi
  candidate="$(realpath "$candidate")"
  if backup_inside_site "$candidate" "$SITE_PATH"; then
    die "Бэкапы нельзя класть внутрь $SITE_PATH: nginx отдаст архив наружу"
  fi
  refuse_tree "$candidate" "Каталог бэкапов"
  printf '%s' "$candidate"
}

assert_release() {
  local rel="$1"
  [ -d "$rel" ] || die "RELEASE_DIR не каталог: $rel"
  local file
  for file in index.html save.php send.php app.js styles.css assets/content.json assets/posts.json scripts/fetch-dzen.js; do
    [ -f "$rel/$file" ] || die "В архиве коммита нет $file — деплой остановлен, сайт не менялся"
  done
}

assert_live_tree() {
  if [ ! -d "$SITE_PATH" ]; then
    die "Каталог $SITE_PATH не существует. Создайте корень лендинга (nginx root) и повторите. См. docs/deploy-site.md"
  fi
  [ -w "$SITE_PATH" ] || die "Нет права записи в $SITE_PATH. Права — в docs/deploy-site.md"
  local marker
  marker="$(find "$SITE_PATH" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null || true)"
  if [ -n "$marker" ]; then
    [ -f "$SITE_PATH/index.html" ] || die "В $SITE_PATH нет index.html. Это не корень лендинга — деплой остановлен."
    [ -f "$SITE_PATH/save.php" ] || die "В $SITE_PATH нет save.php. Это не корень лендинга — деплой остановлен."
  fi
}

preflight_group() {
  local probe
  probe="$(mktemp "$SITE_PATH/.deploy-probe.XXXXXX")"
  if ! chgrp "$WEB_GROUP" "$probe" 2>/dev/null; then
    rm -f "$probe"
    die "Пользователь $(id -un) не может отдавать файлы группе $WEB_GROUP. Выполните: sudo usermod -aG $WEB_GROUP $(id -un) и зайдите по SSH заново. См. docs/deploy-site.md"
  fi
  rm -f "$probe"
  if [ -d "$SITE_PATH/assets" ] && [ ! -w "$SITE_PATH/assets" ]; then
    die "Нет права записи в $SITE_PATH/assets"
  fi
  if [ -d "$SITE_PATH/assets/img" ] && [ ! -w "$SITE_PATH/assets/img" ]; then
    die "Нет права записи в $SITE_PATH/assets/img"
  fi
}

backup_live() {
  local stamp
  stamp="$(date -u +'%Y%m%dT%H%M%S%NZ')-$$"
  BACKUP_FILE="$SITE_BACKUP_DIR/likiya-$stamp.tar.gz"
  if [ -z "$(find "$SITE_PATH" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null || true)" ]; then
    BACKUP_FILE=""
    log "Каталог сайта пуст, бэкап не нужен"
    return 0
  fi
  tar -C "$SITE_PATH" -czf "$BACKUP_FILE" .
  log "Бэкап текущего сайта: $BACKUP_FILE"
}

prune_backups() {
  local old
  while IFS= read -r old; do
    [ -n "$old" ] || continue
    rm -f "$old"
    log "Удалён старый бэкап $(basename "$old")"
  done < <(find "$SITE_BACKUP_DIR" -maxdepth 1 -type f -name 'likiya-*.tar.gz' -printf '%T@ %p\n' | sort -nr | awk 'NR>8 { print $2 }')
}

list_uploads() {
  if [ ! -d "$SITE_PATH/assets/img" ]; then
    return 0
  fi
  find "$SITE_PATH/assets/img" -maxdepth 1 -type f -name 'upload_*' -printf '%f\n' | sort
}

seed_if_missing() {
  local relative="$1"
  local mode="$2"
  local dest="$SITE_PATH/$relative"
  if [ -e "$dest" ]; then
    log "Оставляю серверный $relative"
    return 0
  fi
  mkdir -p "$(dirname "$dest")"
  cp "$RELEASE_DIR/$relative" "$dest"
  chmod "$mode" "$dest" || true
  chgrp "$WEB_GROUP" "$dest" 2>/dev/null || true
  log "На сервере не было $relative — положил начальную копию из репозитория"
}

ensure_admin_perms() {
  local assets="$SITE_PATH/assets"
  local img="$assets/img"
  mkdir -p "$img"
  local path
  for path in "$assets" "$img"; do
    if [ "$(stat -c '%G' "$path")" != "$WEB_GROUP" ]; then
      chgrp "$WEB_GROUP" "$path" || die "Не удалось назначить группу $WEB_GROUP на $path"
    fi
    if ! chmod 2775 "$path"; then
      if group_can_write "$path" && dir_is_setgid "$path"; then
        log "chmod 2775 $path не удался, каталог уже групповой и setgid — продолжаю"
      else
        die "Не удалось выставить 2775 на $path. Владелец каталога должен быть пользователем деплоя. См. docs/deploy-site.md"
      fi
    fi
  done
  if [ -f "$assets/content.json" ]; then
    chgrp "$WEB_GROUP" "$assets/content.json" 2>/dev/null || true
    if ! chmod 664 "$assets/content.json"; then
      if group_can_write "$assets/content.json"; then
        log "chmod 664 content.json не удался, группа уже может писать — продолжаю"
      else
        die "Группа $WEB_GROUP не может писать assets/content.json. Админка не сохранит правки. См. docs/deploy-site.md"
      fi
    fi
  fi
}

sync_release() {
  umask 022
  # Без --delete: лишние файлы на сервере (загрузки, чужие заметки) остаются.
  # Без --perms: не сбрасываем 2775 на assets/ в середину копирования.
  # --ignore-times: одинаковый размер и секунда mtime не должны пропускать новый файл.
  rsync -rl --ignore-times --omit-dir-times \
    --exclude '.git/' \
    --exclude '.github/' \
    --exclude 'docs/' \
    --exclude 'preview.html' \
    --exclude 'preview.css' \
    --exclude 'README.md' \
    --exclude 'DEPLOY.md' \
    --exclude '.gitignore' \
    --exclude '.well-known/' \
    --exclude 'assets/content.json' \
    --exclude 'assets/content.json.tmp' \
    --exclude 'assets/posts.json' \
    --exclude 'assets/img/upload_*' \
    "$RELEASE_DIR"/ "$SITE_PATH"/
}

guard_preserved() {
  local name before after release_sha failed=0
  for name in assets/content.json assets/posts.json; do
    before="${PRESERVE_SHA[$name]:-}"
    if [ -z "$before" ]; then
      continue
    fi
    if [ ! -f "$SITE_PATH/$name" ]; then
      log "Пропал $name"
      failed=1
      continue
    fi
    after="$(file_sha "$SITE_PATH/$name")"
    release_sha="$(file_sha "$RELEASE_DIR/$name")"
    if [ "$before" != "$after" ] && [ "$after" = "$release_sha" ]; then
      log "Файл $name затёрт копией из репозитория" >&2 || true
      failed=1
    elif [ "$before" != "$after" ]; then
      log "Внимание: $name изменился во время деплоя и не совпал с архивом. Оставляю серверную версию (правка админки или cron)."
    else
      log "Серверный $name не изменился"
    fi
  done

  local upload
  if [ -n "${UPLOADS_BEFORE:-}" ]; then
    while IFS= read -r upload; do
      [ -n "$upload" ] || continue
      if [ ! -f "$SITE_PATH/assets/img/$upload" ]; then
        log "Пропала загрузка assets/img/$upload" >&2 || true
        failed=1
      fi
    done <<< "$UPLOADS_BEFORE"
  fi

  if [ "$failed" -ne 0 ]; then
    if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
      log "Восстанавливаю сайт из $BACKUP_FILE"
      tar -xzf "$BACKUP_FILE" -C "$SITE_PATH"
    fi
    die "Деплой задел серверные данные. Сайт восстановлен из бэкапа, если он был."
  fi
}

main() {
  [ "$(id -u)" -ne 0 ] || die "Деплой от root запрещён: файлы станут недоступны php-fpm. См. docs/deploy-site.md"

  command -v rsync >/dev/null 2>&1 || die "На сервере нет rsync. Установите: sudo apt-get install -y rsync"
  command -v tar >/dev/null 2>&1 || die "На сервере нет tar"
  command -v sha256sum >/dev/null 2>&1 || die "На сервере нет sha256sum"

  SITE_PATH="$(normalize_absolute "${SITE_PATH:-}" "SITE_PATH")"
  RELEASE_DIR="$(normalize_absolute "${RELEASE_DIR:-}" "RELEASE_DIR")"
  refuse_tree "$SITE_PATH" "SITE_PATH"
  [ -d "$RELEASE_DIR" ] || die "RELEASE_DIR не существует: $RELEASE_DIR"

  local site_real release_real
  site_real="$(realpath "$SITE_PATH")"
  release_real="$(realpath "$RELEASE_DIR")"
  SITE_PATH="$site_real"
  RELEASE_DIR="$release_real"
  refuse_tree "$SITE_PATH" "SITE_PATH"
  [ "$SITE_PATH" != "$RELEASE_DIR" ] || die "RELEASE_DIR совпадает с SITE_PATH"
  case "$SITE_PATH" in
    "$RELEASE_DIR"/*) die "SITE_PATH лежит внутри каталога релиза" ;;
  esac
  case "$RELEASE_DIR" in
    "$SITE_PATH"/*) die "Каталог релиза лежит внутри сайта" ;;
  esac

  assert_release "$RELEASE_DIR"
  assert_live_tree

  BACKUP_FILE=""
  WEB_GROUP="$(detect_web_group)"
  log "Группа php: $WEB_GROUP"
  preflight_group

  SITE_BACKUP_DIR="$(prepare_backup_dir)"

  log "Сайт: $SITE_PATH"
  log "Релиз: $RELEASE_DIR"
  log "Студию /srv/studio/app этот скрипт не открывает и не меняет"

  declare -gA PRESERVE_SHA
  local name
  for name in assets/content.json assets/posts.json; do
    if [ -f "$SITE_PATH/$name" ]; then
      PRESERVE_SHA["$name"]="$(file_sha "$SITE_PATH/$name")"
    fi
  done
  UPLOADS_BEFORE="$(list_uploads || true)"

  backup_live
  sync_release
  seed_if_missing assets/content.json 664
  seed_if_missing assets/posts.json 664
  ensure_admin_perms
  guard_preserved
  prune_backups

  local upload_count=0
  if [ -n "${UPLOADS_BEFORE:-}" ]; then
    upload_count="$(printf '%s\n' "$UPLOADS_BEFORE" | wc -l | awk '{ print $1 }')"
  fi
  log "Лендинг обновлён. Серверные content.json, posts.json и загрузки админки сохранены (файлов upload_*: $upload_count)."
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"
fi
