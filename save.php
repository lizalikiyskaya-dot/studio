<?php
/**
 * Серверный обработчик правок админ-панели. Страница лендинга этот файл не вызывает:
 * тексты заданы в index.html, чтобы живой content.json не подменял их при деплое.
 *
 * Две операции (обе требуют пароль):
 *   1) POST application/json  {password, content}      → пишет assets/content.json
 *   2) POST multipart/form-data (password, action=upload, file) → сохраняет фото в assets/img/,
 *      возвращает {ok:true, path:"assets/img/upload_XXXX.jpg"}
 *
 * Пароль задаётся на сервере переменной окружения LIZA_ADMIN_PASSWORD
 * (пул php-fpm: env[LIZA_ADMIN_PASSWORD] = ...; или fastcgi_param в nginx).
 * В коде и в app.js его нет. Без переменной админка отвечает 503 и ничего не пишет.
 * Третья операция — POST application/json {password, action:"check"}: только проверка пароля.
 */

const CONTENT_FILE = __DIR__ . '/assets/content.json';
const IMG_DIR = __DIR__ . '/assets/img';
const MAX_UPLOAD = 8 * 1024 * 1024;      // 8 МБ на фото

header('Content-Type: application/json; charset=utf-8');

function fail($msg, $code = 400) {
  http_response_code($code);
  echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
  exit;
}

function require_password($given) {
  $expected = getenv('LIZA_ADMIN_PASSWORD');
  if ($expected === false || $expected === '') $expected = $_SERVER['LIZA_ADMIN_PASSWORD'] ?? '';
  if ((string)$expected === '') fail('Админка не настроена на сервере', 503);
  if (!hash_equals((string)$expected, (string)$given)) {
    usleep(800000); // притормозить перебор
    fail('Неверный пароль', 403);
  }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  fail('Только POST', 405);
}

$ctype = $_SERVER['CONTENT_TYPE'] ?? '';

/* ---------- Загрузка фото (multipart) ---------- */
if (strpos($ctype, 'multipart/form-data') !== false) {
  require_password($_POST['password'] ?? '');
  if (($_POST['action'] ?? '') !== 'upload' || !isset($_FILES['file'])) fail('Нет файла');

  $f = $_FILES['file'];
  if ($f['error'] !== UPLOAD_ERR_OK) fail('Ошибка загрузки файла');
  if ($f['size'] > MAX_UPLOAD) fail('Файл больше 8 МБ');

  $finfo = new finfo(FILEINFO_MIME_TYPE);
  $mime = $finfo->file($f['tmp_name']);
  $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$mime] ?? null;
  if (!$ext) fail('Только JPG, PNG или WebP');
  // defense-in-depth: файл должен реально декодироваться как изображение (не полиглот с magic-байтами)
  $dim = @getimagesize($f['tmp_name']);
  if ($dim === false) fail('Файл не является корректным изображением');

  if (!is_dir(IMG_DIR)) mkdir(IMG_DIR, 0755, true);
  $name = 'upload_' . date('Ymd_His') . '_' . bin2hex(random_bytes(3)) . '.' . $ext;
  $dest = IMG_DIR . '/' . $name;
  if (!move_uploaded_file($f['tmp_name'], $dest)) fail('Не удалось сохранить файл', 500);

  echo json_encode(['ok' => true, 'path' => 'assets/img/' . $name], JSON_UNESCAPED_UNICODE);
  exit;
}

/* ---------- Сохранение контента (JSON) ---------- */
$raw = file_get_contents('php://input');
if (strlen($raw) > 512 * 1024) fail('Слишком большой объём данных'); // защита от переполнения диска (content.json ~3 КБ)
$data = json_decode($raw, true);
if (!is_array($data)) fail('Некорректный JSON');
require_password($data['password'] ?? '');
if (($data['action'] ?? '') === 'check') {
  echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
  exit;
}
if (!isset($data['content']) || !is_array($data['content'])) fail('Нет контента');

$json = json_encode($data['content'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
if ($json === false) fail('Не удалось сериализовать контент', 500);

/* атомарная запись: во временный файл, затем rename */
$tmp = CONTENT_FILE . '.tmp';
if (file_put_contents($tmp, $json, LOCK_EX) === false) fail('Не удалось записать файл (права?)', 500);
if (!rename($tmp, CONTENT_FILE)) { @unlink($tmp); fail('Не удалось заменить файл', 500); }

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
