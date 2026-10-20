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
  weeklyWhen,
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

test("пароль без ссылки не подменяет письмо", () => {
  const designed = { subject: "Восстановление пароля", html: "<p>ссылка</p>", text: "ссылка" };
  const out = applyLetterTemplate("password", { subject: "Новая тема", body: "Текст без кнопки." }, designed, { имя: "Виктория" });
  assert.equal(out.html, designed.html);
});
