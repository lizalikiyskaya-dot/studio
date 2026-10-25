import assert from "node:assert/strict";
import test from "node:test";
import {
  EMAIL_BRAND,
  EMAIL_SIGNATURE,
  isRetryableMailError,
  mailFrom,
  pickIpv4SmtpHost,
  renderEmail,
  sendMail,
  setEmailLogForTests,
  setMailTransportSourceForTests,
} from "./mail";
import { approvedLetter, dailyQuoteLetter, designerLetterPreviews, guideOpenedLetter, mentorEditLetter, passwordResetLetter, platformUpdateLetter, registrationStudentLetter, weeklyTaskLetter } from "./notify";

function withEnv(values: Record<string, string | undefined>, run: () => void) {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(values)) previous.set(key, process.env[key]);
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("SMTP берёт IPv4 и оставляет имя хоста для TLS", () => {
  assert.deepEqual(pickIpv4SmtpHost("smtp.gmail.com", ["2a00:1450:4010:c1e::6d", "172.217.21.109"]), {
    host: "172.217.21.109",
    servername: "smtp.gmail.com",
  });
  assert.deepEqual(pickIpv4SmtpHost("smtp.gmail.com", []), { host: "smtp.gmail.com" });
  assert.deepEqual(pickIpv4SmtpHost("142.250.185.109", ["1.2.3.4"]), { host: "142.250.185.109" });
});

test("отправитель по умолчанию прежний, новый адрес только из окружения", () => {
  withEnv(
    { MAIL_FROM: undefined, MAIL_FROM_NAME: undefined, MAIL_FROM_ADDRESS: undefined, SMTP_USER: "lizalikiyskaya@gmail.com" },
    () => {
      assert.equal(mailFrom(), "Студия художественной прозы <lizalikiyskaya@gmail.com>");
    },
  );
  withEnv(
    {
      MAIL_FROM: "Андреенко · студия художественной прозы <lizaandreenko@example.com>",
      SMTP_USER: "lizalikiyskaya@gmail.com",
    },
    () => {
      assert.equal(mailFrom(), "Андреенко · студия художественной прозы <lizaandreenko@example.com>");
    },
  );
});

test("письма ученику: бренд, подпись, текст и прежние формулировки", () => {
  const letters = [
    registrationStudentLetter("Саша"),
    approvedLetter("Саша"),
    guideOpenedLetter({
      name: "Саша",
      title: "Сцена",
      description: "Как собрать сцену.",
      guideId: "g1",
    }),
    passwordResetLetter("Саша", "https://studio.example/reset-password?token=abc"),
    mentorEditLetter("Задания"),
  ];
  for (const letter of letters) {
    assert.match(letter.html, new RegExp(EMAIL_BRAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(letter.text, new RegExp(EMAIL_BRAND.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(letter.html, new RegExp(EMAIL_SIGNATURE));
    assert.match(letter.text, new RegExp(EMAIL_SIGNATURE));
    assert.equal(letter.html.includes("Закладка"), false);
    assert.equal(letter.text.includes("Закладка"), false);
  }
  assert.match(guideOpenedLetter({ name: "Саша", title: "Сцена", description: "", guideId: "g1" }).text, /я открыла вам методичку/);
  assert.match(guideOpenedLetter({ name: "Саша", title: "Сцена", description: "", guideId: "g1" }).text, /Материалы/);
  assert.doesNotMatch(guideOpenedLetter({ name: "Саша", title: "Сцена", description: "", guideId: "g1" }).text, /\/dashboard\/guides\//);
  assert.match(passwordResetLetter("Саша", "https://studio.example/reset").text, /Задать новый пароль: https:\/\/studio.example\/reset/);
  const sample = renderEmail({ title: "Проверка", paragraphs: ["Текст письма."] });
  assert.equal(sample.html.includes(EMAIL_SIGNATURE), false);
  const update = platformUpdateLetter({ name: "Саша" });
  assert.match(update.text, /Отчёт об обновлениях/);
  assert.match(update.text, /Лиза Андреенко/);
  assert.match(update.text, /Еженедельное задание/);
  assert.match(update.text, /Цитата дня/);
  assert.match(update.text, /Задание недели/);
  assert.match(update.text, /Скачать/);
  assert.match(update.text, /Итог/);
  assert.doesNotMatch(update.text, /над календарём/);
  assert.doesNotMatch(update.text, /PDF открывается/);
  assert.doesNotMatch(update.text, /—/);
  assert.match(update.html, /#F6F1E8/);
  assert.match(update.html, /#FFD43B/);
  assert.match(update.html, /max-width:600px/);

  const weekly = weeklyTaskLetter({
    name: "Саша",
    title: "Комната после новости",
    prompt: "Опиши комнату.",
    lengthHint: "полстраницы",
    publishedOn: "2026-10-24",
    nextPublishedOn: "2026-10-31",
  });
  assert.match(weekly.text, /Комната после новости/);
  assert.match(weekly.text, /Опиши комнату/);
  assert.match(weekly.text, /Сдать до 30 октября 2026/);
  assert.match(weekly.text, /Открыть задание: .*\/dashboard\/weekly/);
  assert.doesNotMatch(weekly.text, /—/);

  const quote = dailyQuoteLetter({
    name: "Саша",
    text: "Краткость — сестра таланта.",
    author: "Антон Чехов",
    source: "Письмо",
  });
  assert.match(quote.text, /Антон Чехов/);
  assert.doesNotMatch(quote.text, /над календарём/);
  assert.match(quote.html, /max-width:600px/);
  assert.match(quote.text, /Открыть кабинет: .*\/dashboard\/tasks/);

  const previews = designerLetterPreviews();
  assert.match(previews.weekly.text, /полстраницы/);
  assert.match(previews.quote.text, /Чехов/);
  assert.match(previews.platform.text, /Саша|Виктория/);
});

test("обрыв SMTP сбрасывает транспорт и повторяет отправку один раз", async () => {
  assert.equal(isRetryableMailError(Object.assign(new Error("Connection timeout"), { code: "ETIMEDOUT" })), true);
  assert.equal(isRetryableMailError(Object.assign(new Error("Mailbox unavailable"), { responseCode: 550 })), false);

  const logs: { status: string; error: string | null }[] = [];
  setEmailLogForTests(async (_input, status, error) => {
    logs.push({ status, error });
  });
  let opened = 0;
  try {
    setMailTransportSourceForTests(async () => {
      opened += 1;
      if (opened === 1) {
        return { sendMail: async () => { throw Object.assign(new Error("Connection timeout"), { code: "ETIMEDOUT" }); } };
      }
      return { sendMail: async () => {} };
    });
    const sent = await sendMail({
      to: "demo@example.com",
      subject: "Проверка",
      html: "<p>Текст</p>",
      from: "Студия <demo@example.com>",
    });
    assert.equal(sent, true);
    assert.equal(opened, 2);
    assert.deepEqual(logs, [{ status: "sent", error: null }]);

    opened = 0;
    logs.length = 0;
    setMailTransportSourceForTests(async () => {
      opened += 1;
      return { sendMail: async () => { throw new Error("Connection timeout"); } };
    });
    const failed = await sendMail({
      to: "demo@example.com",
      subject: "Проверка",
      html: "<p>Текст</p>",
      from: "Студия <demo@example.com>",
    });
    assert.equal(failed, false);
    assert.equal(opened, 2);
    assert.equal(logs.length, 1);
    assert.equal(logs[0]?.status, "failed");
    assert.match(logs[0]?.error ?? "", /Connection timeout/);

    opened = 0;
    logs.length = 0;
    setMailTransportSourceForTests(async () => {
      opened += 1;
      return { sendMail: async () => { throw Object.assign(new Error("Mailbox unavailable"), { responseCode: 550 }); } };
    });
    const rejected = await sendMail({
      to: "demo@example.com",
      subject: "Проверка",
      html: "<p>Текст</p>",
      from: "Студия <demo@example.com>",
    });
    assert.equal(rejected, false);
    assert.equal(opened, 1);
    assert.equal(logs.length, 1);
    assert.equal(logs[0]?.status, "failed");
  } finally {
    setMailTransportSourceForTests(null);
    setEmailLogForTests(null);
  }
});
