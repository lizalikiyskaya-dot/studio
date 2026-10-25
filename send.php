<?php
/* Приём заявки и письмо владелице.
   Адрес получателя и почта живут только на сервере (mail → sendmail → msmtp).
   Новая анкета: имя обязательно, Telegram или e-mail — хотя бы одно.
   Старый набор полей (name, email, channel, contact, message) по-прежнему принимается,
   чтобы уже открытая страница могла дослать заявку. */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

const TO_EMAIL  = 'lizalikiyskaya@gmail.com';
const FROM_MAIL = 'lizalikiyskaya@gmail.com';
const FROM_NAME = 'Сайт lizandwriter.ru';
const MAX_BODY  = 65536;
const MAX_FIELD = 5000;
const RATE_MAX  = 5;
const RATE_WIN  = 3600;
const LEADS_DIR = '/var/lib/likiya';

function fail(string $msg, int $code = 400) {
  http_response_code($code);
  echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
  exit;
}
function hdr(string $s): string { return trim(str_replace(["\r", "\n", "\0"], ' ', $s)); }
function mime(string $s): string { return '=?UTF-8?B?' . base64_encode($s) . '?='; }
function clean(?string $s): string {
  $s = trim((string)$s);
  if (mb_strlen($s) > MAX_FIELD) $s = mb_substr($s, 0, MAX_FIELD) . '…';
  return $s;
}
function one_of(string $value, array $allowed, string $error): string {
  if (!in_array($value, $allowed, true)) fail($error);
  return $value;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('Метод не поддерживается', 405);

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > MAX_BODY) fail('Слишком большой запрос', 413);
$in = json_decode($raw, true);
if (!is_array($in)) fail('Некорректные данные');

if (clean($in['_honey'] ?? '') !== '') { echo json_encode(['ok' => true]); exit; }

$name = clean($in['name'] ?? '');
if ($name === '') fail('Укажите имя');

$isNew = array_key_exists('work', $in) || array_key_exists('budget', $in) || array_key_exists('telegram', $in);

if ($isNew) {
  $email = clean($in['email'] ?? '');
  $telegram = clean($in['telegram'] ?? '');
  if ($telegram === '' && $email === '') fail('Укажите Telegram или e-mail');
  if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Проверьте e-mail');

  $work = one_of(clean($in['work'] ?? ''), [
    'пока только хочу начать писать',
    'есть идея',
    'есть черновые главы',
    'рукопись готова',
  ], 'Выберите, над чем вы работаете');
  $book = clean($in['book'] ?? '');
  if ($book === '') fail('Напишите жанр и пару слов о книге');
  $goal = one_of(clean($in['goal'] ?? ''), [
    'подать в издательство',
    'участвовать в конкурсах',
    'научиться писать и развиваться',
    'другое',
  ], 'Выберите, чего хотите добиться');
  $goalOther = clean($in['goal_other'] ?? '');
  if ($goal === 'другое' && $goalOther === '') fail('Напишите, чего хотите добиться');
  $time = one_of(clean($in['time'] ?? ''), [
    '30–60 минут в день',
    'в основном по выходным',
    'пока не знаю',
  ], 'Выберите, сколько времени готовы уделять книге');
  $budget = one_of(clean($in['budget'] ?? ''), [
    'да, готов(а) начать',
    'да, но позже',
    'нет, сейчас не по бюджету',
  ], 'Ответьте, подходит ли стоимость');
  $format = one_of(clean($in['format'] ?? ''), [
    'да',
    'есть вопросы',
  ], 'Ответьте, подходит ли формат');
  $sample = clean($in['sample'] ?? '');
  if (clean($in['privacy'] ?? '') === '') fail('Подтвердите согласие с политикой конфиденциальности');

  $rows = [
    'Имя' => $name,
    'Telegram' => $telegram !== '' ? $telegram : '—',
    'E-mail' => $email !== '' ? $email : '—',
    'Над чем работает' => $work,
    'О книге' => $book,
    'Чего хочет добиться' => $goal === 'другое' ? ('другое: ' . $goalOther) : $goal,
    'Сколько времени' => $time,
    'Стоимость' => $budget,
    'Формат без созвонов' => $format,
    'Фрагмент' => $sample !== '' ? $sample : '—',
    'Согласие' => 'да',
  ];
  $replyEmail = $email;
} else {
  $email = clean($in['email'] ?? '');
  $channel = clean($in['channel'] ?? '');
  $contact = clean($in['contact'] ?? '');
  $message = clean($in['message'] ?? '');
  $news = clean($in['newsletter'] ?? '');
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Проверьте электронную почту');
  $rows = [
    'Имя' => $name,
    'E-mail' => $email,
    'Способ связи' => $channel !== '' ? $channel : '—',
    'Контакт' => $contact !== '' ? $contact : '—',
    'Сообщение' => $message !== '' ? $message : '—',
    'Рассылка' => $news !== '' ? $news : 'нет',
  ];
  $replyEmail = $email;
}

$ip = (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
$dir = sys_get_temp_dir() . '/likiya-rate';
@mkdir($dir, 0700, true);
$rf = $dir . '/' . hash('sha256', $ip);
$hits = array_values(array_filter(
  (array)@json_decode((string)@file_get_contents($rf), true),
  function ($t) { return is_int($t) && $t > time() - RATE_WIN; }
));
if (count($hits) >= RATE_MAX) fail('Слишком много заявок подряд. Попробуйте позже.', 429);
$hits[] = time();
@file_put_contents($rf, json_encode($hits), LOCK_EX);

$html = '<html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;color:#202020">'
      . '<h2 style="font-weight:400">Новая заявка с сайта</h2>'
      . '<table cellpadding="8" cellspacing="0" border="0" style="border-collapse:collapse">';
foreach ($rows as $k => $v) {
  $html .= '<tr>'
        .  '<td style="border:1px solid #ececec;background:#f4f4f4;white-space:nowrap;vertical-align:top"><b>' . htmlspecialchars($k, ENT_QUOTES, 'UTF-8') . '</b></td>'
        .  '<td style="border:1px solid #ececec">' . nl2br(htmlspecialchars($v, ENT_QUOTES, 'UTF-8')) . '</td>'
        .  '</tr>';
}
$html .= '</table><p style="color:#6a6a6a;font-size:12px">Отправлено с формы lizandwriter.ru, '
      .  date('d.m.Y H:i') . ' (время сервера). Кнопка «Ответить» пишет автору, если в заявке есть e-mail.</p>'
      .  '</body></html>';

$headerLines = [
  'From: ' . mime(FROM_NAME) . ' <' . FROM_MAIL . '>',
  'MIME-Version: 1.0',
  'Content-Type: text/html; charset=UTF-8',
  'Content-Transfer-Encoding: base64',
];
if ($replyEmail !== '' && filter_var($replyEmail, FILTER_VALIDATE_EMAIL)) {
  $headerLines[] = 'Reply-To: ' . (hdr($name) !== '' ? mime(hdr($name)) . ' <' . hdr($replyEmail) . '>' : hdr($replyEmail));
}
$headers = implode("\r\n", $headerLines);
$subject = mime('Новая заявка с сайта — ' . $name);
$body = chunk_split(base64_encode($html), 76, "\r\n");

@mkdir(LEADS_DIR, 0750, true);
@file_put_contents(
  LEADS_DIR . '/leads.jsonl',
  json_encode(['ts' => date('c'), 'ip' => $ip] + $rows, JSON_UNESCAPED_UNICODE) . "\n",
  FILE_APPEND | LOCK_EX
);

$ok = @mail(TO_EMAIL, $subject, $body, $headers, '-f' . FROM_MAIL);
if (!$ok) fail('Письмо не ушло. Попробуйте ещё раз или напишите на почту.', 502);

echo json_encode(['ok' => true]);
