import assert from "node:assert/strict";
import test from "node:test";
import { EMAIL_BRAND, EMAIL_SIGNATURE, mailFrom, renderEmail } from "./mail";
import { approvedLetter, guideOpenedLetter, mentorEditLetter, passwordResetLetter, registrationStudentLetter } from "./notify";

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
  assert.match(guideOpenedLetter({ name: "Саша", title: "Сцена", description: "", guideId: "g1" }).text, /Материалы → Методички/);
  assert.match(passwordResetLetter("Саша", "https://studio.example/reset").text, /Задать новый пароль: https:\/\/studio.example\/reset/);
  const sample = renderEmail({ title: "Проверка", paragraphs: ["Текст письма."] });
  assert.equal(sample.html.includes(EMAIL_SIGNATURE), false);
});
