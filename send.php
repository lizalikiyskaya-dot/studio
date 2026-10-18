<?php
/* send.php — приём заявки с формы сайта и отправка письма владелице.
   Зачем отдельный скрипт: адрес получателя и доступ к почте живут ТОЛЬКО на сервере,
   в клиентском app.js их нет (раньше форма стучалась напрямую в сторонний FormSubmit,
   и адрес был виден в исходнике страницы).
   Отправка идёт через mail() → /usr/sbin/sendmail → msmtp → SMTP-релей (см. /etc/msmtprc).
   Требуется PHP 7+. */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

const TO_EMAIL  = 'lizalikiyskaya@gmail.com';          // получатель заявок
const FROM_MAIL = 'lizalikiyskaya@gmail.com';          // должен совпадать с ящиком в /etc/msmtprc
const FROM_NAME = 'Сайт lizalikiyskaya.ru';
const MAX_BODY  = 65536;                               // тело больше 64 КБ — это не заявка
const MAX_FIELD = 5000;                                // предел на одно поле
const RATE_MAX  = 5;                                   // не больше 5 заявок
const RATE_WIN  = 3600;                                // с одного IP за час
const LEADS_DIR = '/var/lib/likiya';                   // страховка: заявки пишутся на диск

function fail(string $msg, int $code = 400) {
  http_response_code($code);
  echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
  exit;
}
/* в заголовки письма нельзя пускать перевод строки — иначе можно дописать свои заголовки */
function hdr(string $s): string { return trim(str_replace(["\r", "\n", "\0"], ' ', $s)); }
function mime(string $s): string { return '=?UTF-8?B?' . base64_encode($s) . '?='; }
function clean(?string $s): string {
  $s = trim((string)$s);
  if (mb_strlen($s) > MAX_FIELD) $s = mb_substr($s, 0, MAX_FIELD) . '…';
  return $s;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('Метод не поддерживается', 405);

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > MAX_BODY) fail('Слишком большой запрос', 413);
$in = json_decode($raw, true);
if (!is_array($in)) fail('Некорректные данные');

/* honeypot: поле скрыто от человека, заполняет его только бот.
   Отвечаем «ок», чтобы бот не понял, что его отсеяли, — но ничего не шлём. */
if (clean($in['_honey'] ?? '') !== '') { echo json_encode(['ok' => true]); exit; }

$name    = clean($in['name'] ?? '');
$email   = clean($in['email'] ?? '');
$channel = clean($in['channel'] ?? '');
$contact = clean($in['contact'] ?? '');
$message = clean($in['message'] ?? '');
$news    = clean($in['newsletter'] ?? '');

if ($name === '') fail('Укажите имя');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Проверьте электронную почту');

/* простая защита от заваливания формы: счётчик по IP в файле */
$ip  = (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
$dir = sys_get_temp_dir() . '/likiya-rate';
@mkdir($dir, 0700, true);
$rf   = $dir . '/' . hash('sha256', $ip);
$hits = array_values(array_filter(
  (array)@json_decode((string)@file_get_contents($rf), true),
  function ($t) { return is_int($t) && $t > time() - RATE_WIN; }
));
if (count($hits) >= RATE_MAX) fail('Слишком много заявок подряд. Попробуйте позже.', 429);
$hits[] = time();
@file_put_contents($rf, json_encode($hits), LOCK_EX);

/* письмо */
$rows = [
  'Имя'              => $name,
  'E-mail'           => $email,
  'Способ связи'     => $channel !== '' ? $channel : '—',
  'Контакт'          => $contact !== '' ? $contact : '—',
  'Сообщение'        => $message !== '' ? $message : '—',
  'Рассылка'         => $news !== '' ? $news : 'нет',
];
$html = '<html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;color:#141212">'
      . '<h2 style="font-weight:400">Новая заявка с сайта</h2>'
      . '<table cellpadding="8" cellspacing="0" border="0" style="border-collapse:collapse">';
foreach ($rows as $k => $v) {
  $html .= '<tr>'
        .  '<td style="border:1px solid #e2dedb;background:#faf8f7;white-space:nowrap"><b>' . htmlspecialchars($k, ENT_QUOTES, 'UTF-8') . '</b></td>'
        .  '<td style="border:1px solid #e2dedb">' . nl2br(htmlspecialchars($v, ENT_QUOTES, 'UTF-8')) . '</td>'
        .  '</tr>';
}
$html .= '</table><p style="color:#8a8480;font-size:12px">Отправлено с формы lizalikiyskaya.ru, '
      .  date('d.m.Y H:i') . ' (время сервера). Кнопка «Ответить» пишет прямо автору заявки.</p>'
      .  '</body></html>';

$replyTo = hdr($name) !== ''
  ? mime(hdr($name)) . ' <' . hdr($email) . '>'
  : hdr($email);
$headers = implode("\r\n", [
  'From: ' . mime(FROM_NAME) . ' <' . FROM_MAIL . '>',
  'Reply-To: ' . $replyTo,
  'MIME-Version: 1.0',
  'Content-Type: text/html; charset=UTF-8',
  'Content-Transfer-Encoding: base64',
]);
$subject = mime('Новая заявка с сайта — ' . $name);
$body    = chunk_split(base64_encode($html), 76, "\r\n");

/* страховка: заявка ложится на диск ДО отправки — даже если почта отвалится, лид не потеряется */
@mkdir(LEADS_DIR, 0750, true);
@file_put_contents(
  LEADS_DIR . '/leads.jsonl',
  json_encode(['ts' => date('c'), 'ip' => $ip] + $rows, JSON_UNESCAPED_UNICODE) . "\n",
  FILE_APPEND | LOCK_EX
);

$ok = @mail(TO_EMAIL, $subject, $body, $headers, '-f' . FROM_MAIL);
if (!$ok) fail('Письмо не ушло. Попробуйте ещё раз или напишите на почту.', 502);

echo json_encode(['ok' => true]);
