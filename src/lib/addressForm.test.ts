import assert from "node:assert/strict";
import test from "node:test";
import { addressForm, usesFormalAddress } from "./addressForm";
import { approvedLetter, guideOpenedLetter, passwordResetLetter, platformUpdateLetter, registrationStudentLetter } from "./notify";
import { buildPaymentReminder, moscowParts } from "./paymentReminders";
import { mentorWorkLetter } from "./activityLetters";

test("Виктория на «Вы», Надежда, Ваня и Ян на «ты»", () => {
  assert.equal(usesFormalAddress("Виктория"), true);
  assert.equal(usesFormalAddress("виктория петрова"), true);
  assert.equal(usesFormalAddress("Надежда"), false);
  assert.equal(usesFormalAddress("Ваня"), false);
  assert.equal(usesFormalAddress("Ян"), false);
  const formal = addressForm("Виктория");
  assert.equal(formal.passwordAsk, "Вы попросила сменить пароль.");
  assert.equal(formal.write, "напишите");
  const plain = addressForm("Надежда");
  assert.equal(plain.passwordAsk.includes("сделал"), false);
  assert.equal(plain.passwordAsk.includes("сделала"), false);
  assert.equal(plain.write, "напиши");
});

test("готовые письма ученику: тебе у Саши и Вам у Виктории", () => {
  const sasha = guideOpenedLetter({ name: "Саша", title: "Сцена", description: "", guideId: "g" });
  const vika = guideOpenedLetter({ name: "Виктория", title: "Сцена", description: "", guideId: "g" });
  assert.match(sasha.text, /я открыла тебе методичку/);
  assert.match(vika.text, /я открыла Вам методичку/);
  assert.match(registrationStudentLetter("Саша").text, /твою заявку/);
  assert.match(registrationStudentLetter("Виктория").text, /Вашу заявку/);
  assert.match(approvedLetter("Надежда").text, /открыла тебе кабинет/);
  assert.match(approvedLetter("Надежда").text, /Входи той же почтой и паролем, которые указаны при регистрации/);
  assert.equal(approvedLetter("Ваня").text.includes("указали"), false);
  assert.match(approvedLetter("Виктория").text, /открыла Вам кабинет/);
  assert.match(approvedLetter("Виктория").text, /Входите той же почтой и паролем, что Вы указала при регистрации/);
  assert.match(passwordResetLetter("Ваня", "https://studio.example/reset").text, /вот ссылка, чтобы сменить пароль/);
  assert.equal(/попросил/.test(passwordResetLetter("Ян", "https://studio.example/reset").text), false);
  assert.match(passwordResetLetter("Виктория", "https://studio.example/reset").text, /Вы попросила сменить пароль/);
  const parts = moscowParts(new Date("2026-10-19T06:30:00Z"));
  assert.match(buildPaymentReminder({ name: "Саша", paymentAmount: null }, parts).text, /напиши мне в Телеграме/);
  assert.match(buildPaymentReminder({ name: "Виктория", paymentAmount: null }, parts).text, /напишите мне в Телеграме/);
  assert.match(platformUpdateLetter({ name: "Саша" }).text, /когда правишь текст/);
  assert.match(platformUpdateLetter({ name: "Виктория" }).text, /когда Вы правите текст/);
  assert.match(mentorWorkLetter({ name: "Саша", studentId: "s", pieces: [] }).text, /в твой кабинет/);
  assert.match(mentorWorkLetter({ name: "Виктория", studentId: "s", pieces: [] }).text, /в Ваш кабинет/);
});
