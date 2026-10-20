import assert from "node:assert/strict";
import test from "node:test";
import { isBroadcastKey } from "./mailBroadcasts";
import { composeDraft } from "./letterCompose";
import { templateDraft } from "./mentorCompose";
import {
  applyLetterTemplate,
  cleanDraft,
  letterStorageKey,
  sameAsStandard,
  standardDraft,
  weeklyVolume,
} from "./letterTemplates";
import { weeklyTaskLetter } from "./notify";

const weekly = {
  title: "Комната",
  prompt: "Опиши комнату.",
  lengthHint: "полстраницы",
  publishedOn: "2026-10-24",
  nextPublishedOn: "2026-10-31",
};

test("без сохранённого шаблона письмо и черновик прежние", () => {
  const designed = weeklyTaskLetter({
    name: "Виктория",
    ...weekly,
    unsubscribeUrl: "https://studio.example/unsubscribe?token=weekly",
  });
  const out = applyLetterTemplate("weekly-task", null, { subject: "Задание недели", ...designed }, { имя: "Виктория" });
  assert.equal(out.html, designed.html);
  assert.equal(out.subject, "Задание недели");
  const draft = composeDraft("weekly", weekly, null, null);
  assert.deepEqual(draft, templateDraft("weekly", weekly, null));
  assert.equal(isBroadcastKey(letterStorageKey("weekly-task")), false);
});

test("правка подставляет поля и не принимает разметку", () => {
  const designed = { subject: "Задание недели", html: "<p>старое</p>", text: "старое" };
  const out = applyLetterTemplate(
    "weekly-task",
    { subject: "Тема для {имя}", body: "{имя}, смотрите.\n\n{задание}\n<script>alert(1)</script>" },
    designed,
    { имя: "Виктория", задание: "Комната", отписка: "https://studio.example/unsubscribe?token=1" },
  );
  assert.equal(out.subject, "Тема для Виктория");
  assert.match(out.html, /Комната/);
  assert.match(out.html, /Отписаться от заданий недели/);
  assert.match(out.html, /token=1/);
  assert.equal(out.html.includes("<script>"), false);
  assert.match(out.html, /&lt;script&gt;/);
  assert.equal(out.html.includes("font-size:22px"), false);
  assert.equal(sameAsStandard("weekly-task", standardDraft("weekly-task")), true);
  assert.equal(cleanDraft({ subject: "", body: "текст" }).error, "Нужна тема.");
});

test("ручная отправка берёт сохранённый текст и оставляет имя", () => {
  const stored = { subject: "Неделя для {имя}", body: "{имя}\n\n{задание}\n\n{срок}" };
  const draft = composeDraft("weekly", weekly, null, stored);
  assert.equal(draft.ready, true);
  assert.match(draft.subject, /\{имя\}/);
  assert.match(draft.body, /Комната/);
  assert.match(draft.body, /Открыто с 24 октября 2026 г\./);
  assert.equal(draft.body.includes("г.."), false);
  assert.equal(weeklyVolume("полстраницы"), "Объём: полстраницы");
  assert.equal(weeklyVolume(""), "");
});

test("свой текст задания остаётся в карточке, кнопке и подписи", () => {
  const designed = weeklyTaskLetter({
    name: "Виктория",
    ...weekly,
    unsubscribeUrl: "https://studio.example/unsubscribe?token=weekly",
  });
  const standard = standardDraft("weekly-task");
  const stored = {
    subject: "Неделя для {имя}",
    body: standard.body.replace("{имя}, на этой неделе такое задание.", "{имя}, держите задание этой недели."),
  };
  const out = applyLetterTemplate(
    "weekly-task",
    stored,
    { subject: "Задание недели", ...designed },
    {
      имя: "Виктория",
      задание: weekly.title,
      текст: weekly.prompt,
      срок: "Открыто с 24 октября 2026 г. Сдать до 30 октября 2026 г.",
      объём: "Объём: полстраницы",
      отписка: "https://studio.example/unsubscribe?token=weekly",
    },
  );
  assert.equal(out.subject, "Неделя для Виктория");
  assert.match(out.html, /Андреенко/);
  assert.match(out.html, /держите задание этой недели/);
  assert.match(out.html, /border-radius:16px/);
  assert.match(out.html, /24 октября 2026 г\./);
  assert.match(out.html, /Комната/);
  assert.match(out.html, /Опиши комнату\./);
  assert.match(out.html, /Объём: полстраницы/);
  assert.match(out.html, /Открыть задание/);
  assert.match(out.html, /Лиза Андреенко/);
  assert.match(out.html, /Отписаться от заданий недели/);
  assert.equal(out.html.includes("<script>"), false);
});

test("цитата, отчёт и правки остаются блоками письма", () => {
  const quote = applyLetterTemplate(
    "daily-quote",
    {
      subject: "Цитата для {имя}",
      body: "{имя}, вот строка на сегодня.\n\n«{цитата}»\n{автор}\n{источник}",
    },
    { subject: "Цитата дня", html: "<p>старое</p>", text: "старое" },
    {
      имя: "Виктория",
      цитата: "Краткость — сестра таланта.",
      автор: "Антон Чехов",
      источник: "Письмо",
      отписка: "https://studio.example/unsubscribe?token=quote",
    },
  );
  assert.match(quote.html, /вот строка на сегодня/);
  assert.match(quote.html, /font-size:26px/);
  assert.match(quote.html, /Антон Чехов/);
  assert.match(quote.html, /Андреенко/);
  assert.match(quote.html, /Отписаться от цитат дня/);

  const platform = standardDraft("platform");
  const report = applyLetterTemplate(
    "platform",
    { subject: platform.subject, body: platform.body.replace("{имя}, коротко", "{имя}, совсем коротко") },
    { subject: "Отчёт об обновлениях", html: "<p>старое</p>", text: "старое" },
    { имя: "Виктория" },
  );
  assert.match(report.html, /совсем коротко/);
  assert.match(report.html, /<h2[^>]*>Задания<\/h2>/);
  assert.match(report.html, /Куда нажать: левое меню, пункт «Задания»/);
  assert.match(report.html, /Открыть кабинет/);
  assert.match(report.html, /Лиза Андреенко/);

  const edits = applyLetterTemplate(
    "mentor-edit",
    { subject: "Правки для {имя}", body: "{имя}, я внесла правки в ваш кабинет.\n\n{правки}" },
    { subject: "Наставник внёс правку", html: "<p>старое</p>", text: "старое" },
    { имя: "Виктория", правки: "Задания\nПредложение\n\nСеттинг\nЗаметка", кабинет: "https://studio.example/dashboard/tasks" },
  );
  assert.match(edits.html, /<h2[^>]*>Задания<\/h2>/);
  assert.match(edits.html, /Предложение/);
  assert.match(edits.html, /<h2[^>]*>Сеттинг<\/h2>/);
  assert.match(edits.html, /Куда нажать: левое меню, пункт «Задания»/);
  assert.match(edits.html, /Открыть кабинет/);
});

test("пароль без ссылки не подменяет письмо", () => {
  const designed = { subject: "Восстановление пароля", html: "<p>ссылка</p>", text: "ссылка" };
  const out = applyLetterTemplate("password", { subject: "Новая тема", body: "Текст без кнопки." }, designed, { имя: "Виктория" });
  assert.equal(out.html, designed.html);
});
