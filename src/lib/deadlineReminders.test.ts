import assert from "node:assert/strict";
import test from "node:test";
import { defaultBroadcast, normalizeBroadcast } from "./mailBroadcasts";
import {
  buildDeadlineLetter,
  deadlineMarker,
  deadlinePreviewBaseUrl,
  deadlinePreviewLetters,
  matchDeadlineStudent,
  deadlineReminderLogLine,
  deliverDeadlineReminders,
  FORMAL_ADDRESS_NAMES,
  formatDeadline,
  isDueTomorrow,
  statusNeedsReminder,
  tomorrowMoscow,
  usesFormalAddress,
  type DeadlineStudent,
  type DeadlineTask,
} from "./deadlineReminders";

const BASE = "https://studio.example";
const MORNING = new Date("2026-10-25T06:00:00Z");

function student(partial: Partial<DeadlineStudent> = {}): DeadlineStudent {
  return {
    id: "sasha",
    name: "Саша",
    email: "sasha@example.com",
    status: "APPROVED",
    emailNotifications: true,
    ...partial,
  };
}

function task(partial: Partial<DeadlineTask> & Pick<DeadlineTask, "id">): DeadlineTask {
  return {
    title: "Сцена",
    status: "IN_PROGRESS",
    deadline: new Date("2026-10-26T00:00:00Z"),
    studentId: "sasha",
    ...partial,
  };
}

function setting() {
  return defaultBroadcast("deadline");
}

test("напоминание о сроке включено в 9:00 Москвы, окно час, отправитель студии", () => {
  const row = setting();
  assert.equal(row.enabled, true);
  assert.equal(row.hour, 9);
  assert.equal(row.minute, 0);
  assert.equal(row.windowMinutes, 60);
  assert.equal(row.timeZone, "Europe/Moscow");
  assert.equal(row.weekdays, "");
  assert.equal(row.sender, "env");
  const saved = normalizeBroadcast({ ...row, hour: 9, windowMinutes: 60 });
  assert.equal(saved.value.hour, 9);
  assert.equal(saved.value.windowMinutes, 60);
  assert.equal(FORMAL_ADDRESS_NAMES.includes("Виктория"), true);
});

test("завтра считается по календарю Москвы", () => {
  assert.equal(tomorrowMoscow(MORNING), "2026-10-26");
  assert.equal(tomorrowMoscow(new Date("2026-10-25T21:30:00Z")), "2026-10-27");
  assert.equal(isDueTomorrow(new Date("2026-10-26T00:00:00Z"), MORNING), true);
  assert.equal(isDueTomorrow(new Date("2026-10-25T21:00:00Z"), MORNING), true);
  assert.equal(isDueTomorrow(new Date("2026-10-25T20:59:00Z"), MORNING), false);
  assert.equal(isDueTomorrow(new Date("2026-10-26T21:00:00Z"), MORNING), false);
  assert.equal(isDueTomorrow(new Date("2026-10-25T00:00:00Z"), MORNING), false);
  assert.equal(formatDeadline(new Date("2026-10-26T00:00:00Z")), "26 октября");
});

test("окно отправки: с 9:00 до 10:00 по Москве", async () => {
  const people = [student()];
  const tasks = [task({ id: "a" })];
  const sent: string[] = [];
  const run = (now: Date) =>
    deliverDeadlineReminders({
      now,
      setting: setting(),
      students: people,
      tasks,
      baseUrl: BASE,
      alreadySent: async () => false,
      send: async (input) => {
        sent.push(input.to);
        return true;
      },
    });
  assert.equal((await run(new Date("2026-10-25T05:59:00Z"))).skipped, "not-morning");
  assert.equal((await run(MORNING)).sent, 1);
  assert.equal((await run(new Date("2026-10-25T06:59:00Z"))).sent, 1);
  assert.equal((await run(new Date("2026-10-25T07:00:00Z"))).skipped, "not-morning");
  assert.equal(sent.length, 2);
});

test("сданные и принятые задания не попадают в письмо", async () => {
  const sent: string[] = [];
  const result = await deliverDeadlineReminders({
    now: MORNING,
    setting: setting(),
    students: [student(), student({ id: "vika", name: "Виктория", email: "v@example.com" })],
    tasks: [
      task({ id: "open", title: "Сцена в кухне", status: "IN_PROGRESS" }),
      task({ id: "plan", title: "План", status: "PLANNED" }),
      task({ id: "back", title: "Вернуть", status: "NEEDS_REVISION" }),
      task({ id: "sent", title: "Уже сдано", status: "SUBMITTED" }),
      task({ id: "done", title: "Принято", status: "ACCEPTED" }),
      task({ id: "quiet", studentId: "off", title: "Чужое" }),
      task({ id: "v", studentId: "vika", title: "Черновик", status: "SUBMITTED" }),
    ],
    baseUrl: BASE,
    alreadySent: async () => false,
    send: async (input) => {
      sent.push(input.html);
      return true;
    },
  });
  assert.equal(result.planned, 1);
  assert.equal(result.sent, 1);
  assert.match(sent[0], /Сцена в кухне/);
  assert.match(sent[0], /План/);
  assert.match(sent[0], /Вернуть/);
  assert.equal(sent[0].includes("Уже сдано"), false);
  assert.equal(sent[0].includes("Принято"), false);
  assert.equal(statusNeedsReminder("SUBMITTED"), false);
  assert.equal(statusNeedsReminder("ACCEPTED"), false);
  assert.equal(statusNeedsReminder("NEEDS_REVISION"), true);
});

test("повторный прогон не шлёт то же задание и тот же срок, новый срок шлёт", async () => {
  const sentKeys: string[] = [];
  const seen = new Set<string>();
  const options = {
    now: MORNING,
    setting: setting(),
    students: [student()],
    tasks: [task({ id: "a", title: "Сцена в кухне" })],
    baseUrl: BASE,
    alreadySent: async (studentId: string, taskId: string, dueOn: string) => seen.has(`${studentId}:${deadlineMarker(taskId, dueOn)}`),
    send: async (input: { html: string; to: string; subject: string; text: string; type: "deadline"; recipientUserId: string }) => {
      sentKeys.push(input.html);
      const marker = input.html.match(/data-deadline-task="[^"]+"/)?.[0];
      assert.ok(marker);
      seen.add(`${input.recipientUserId}:${marker}`);
      return true;
    },
  };
  const first = await deliverDeadlineReminders(options);
  const second = await deliverDeadlineReminders(options);
  assert.equal(first.sent, 1);
  assert.equal(second.sent, 0);
  assert.equal(second.planned, 0);
  assert.equal(second.alreadySent, 1);
  assert.match(sentKeys[0], /data-deadline-task="a:2026-10-26"/);

  const moved = await deliverDeadlineReminders({
    ...options,
    now: new Date("2026-10-26T06:00:00Z"),
    tasks: [task({ id: "a", title: "Сцена в кухне", deadline: new Date("2026-10-27T00:00:00Z") })],
  });
  assert.equal(moved.sent, 1);
  assert.match(sentKeys[1], /data-deadline-task="a:2026-10-27"/);
});

test("несколько заданий на завтра собираются в одно письмо, уже отправленное выпадает", async () => {
  const sent: { subject: string; html: string }[] = [];
  const result = await deliverDeadlineReminders({
    now: MORNING,
    setting: setting(),
    students: [student({ name: "Виктория" })],
    tasks: [
      task({ id: "a", title: "Сцена в кухне" }),
      task({ id: "b", title: "Ночной разговор" }),
    ],
    baseUrl: BASE,
    alreadySent: async (_studentId, taskId) => taskId === "a",
    send: async (input) => {
      sent.push({ subject: input.subject, html: input.html });
      return true;
    },
  });
  assert.equal(result.planned, 1);
  assert.equal(result.sent, 1);
  assert.equal(result.alreadySent, 1);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].subject, "Завтра срок по заданию");
  assert.match(sent[0].html, /Ночной разговор/);
  assert.equal(sent[0].html.includes("Сцена в кухне"), false);
  assert.match(sent[0].html, /data-deadline-task="b:2026-10-26"/);
  assert.equal(sent[0].html.includes("data-deadline-task=\"a:"), false);

  const both = await deliverDeadlineReminders({
    now: MORNING,
    setting: setting(),
    students: [student()],
    tasks: [
      task({ id: "a", title: "Сцена в кухне" }),
      task({ id: "b", title: "Ночной разговор" }),
    ],
    baseUrl: BASE,
    alreadySent: async () => false,
    send: async (input) => {
      sent.push({ subject: input.subject, html: input.html });
      return true;
    },
  });
  assert.equal(both.sent, 1);
  assert.equal(sent[1].subject, "Завтра сроки по заданиям");
  assert.match(sent[1].html, /срок по заданиям:/);
  assert.match(sent[1].html, /Если нужно больше времени на задания, пожалуйста, напиши мне!\)/);
  assert.match(sent[1].html, /Сцена в кухне/);
  assert.match(sent[1].html, /Ночной разговор/);
  assert.match(sent[1].html, /data-deadline-task="a:2026-10-26"/);
  assert.match(sent[1].html, /data-deadline-task="b:2026-10-26"/);
  assert.match(sent[1].html, new RegExp(`${BASE}/dashboard/tasks`));
  assert.equal(sent[1].html.includes("#task-"), false);
  assert.equal(sent[1].html.includes("Ваша работа"), false);
});

test("Виктория на «Вы», остальные на «ты», отключившие почту пропускаются", async () => {
  assert.equal(usesFormalAddress("Виктория"), true);
  assert.equal(usesFormalAddress("виктория петрова"), true);
  assert.equal(usesFormalAddress("Саша"), false);
  assert.equal(usesFormalAddress("Вика"), false);

  const formal = buildDeadlineLetter({
    name: "Виктория",
    baseUrl: BASE,
    tasks: [{ id: "scene", title: "Сцена в кухне", deadline: new Date("2026-10-26T00:00:00Z") }],
  });
  assert.match(formal.text, /Виктория, напоминаю: завтра, 26 октября, срок по заданию «Сцена в кухне»/);
  assert.match(formal.html, /Если работа уже сдана, это письмо можно не читать/);
  assert.match(formal.text, /Если нужно больше времени на задание, пожалуйста, напишите мне!\)/);
  assert.equal(/(^|[^А-Яа-яЁё])сдали([^А-Яа-яЁё]|$)/.test(formal.html), false);
  assert.equal(formal.html.includes("Ваша работа"), false);
  assert.equal((formal.html.match(/<a /g) ?? []).length, 2);
  assert.match(formal.html, /Лиза Андреенко/);
  assert.match(formal.html, /#task-scene/);
  assert.equal(formal.html.includes("—"), false);
  assert.equal(formal.subject, "Завтра срок по заданию");

  const informal = buildDeadlineLetter({
    name: "Саша",
    baseUrl: BASE,
    tasks: [{ id: "night", title: "Ночной разговор", deadline: new Date("2026-10-26T00:00:00Z") }],
  });
  assert.match(informal.text, /Саша, напоминаю: завтра, 26 октября, срок по заданию «Ночной разговор»/);
  assert.equal(/(^|[^А-Яа-яЁё])Вы([^А-Яа-яЁё]|$)/.test(informal.html), false);
  assert.equal(informal.html.includes("Ваш"), false);
  assert.match(informal.html, /Если работа уже сдана, это письмо можно не читать/);
  assert.match(informal.text, /Если нужно больше времени на задание, пожалуйста, напиши мне!\)/);
  assert.equal(/(^|[^А-Яа-яЁё])сдал([^А-Яа-яЁё]|$)/.test(informal.html), false);

  const preview = deadlinePreviewLetters("https://studio.lizandwriter.ru");
  assert.match(preview.formal.html, /studio\.lizandwriter\.ru/);
  assert.match(preview.formal.text, /studio\.lizandwriter\.ru/);
  assert.equal(preview.formal.html.includes("lizalikiyskaya"), false);
  assert.match(preview.several.text, /срок по заданиям:/);
  assert.match(preview.several.text, /Если нужно больше времени на задания, пожалуйста, напишите мне!\)/);
  const found = matchDeadlineStudent([student(), student({ id: "v", name: "Виктория", email: "v@example.com" })], "v@example.com");
  assert.equal("student" in found ? found.student.id : "", "v");
  assert.equal("error" in matchDeadlineStudent([student(), student({ id: "s2", name: "Саша", email: "s2@example.com" })], "Саша"), true);
  assert.equal(deadlinePreviewBaseUrl({} as unknown as NodeJS.ProcessEnv), "https://studio.lizandwriter.ru");
  assert.equal(deadlinePreviewBaseUrl({ APP_URL: "https://studio.example/" } as unknown as NodeJS.ProcessEnv), "https://studio.example");

  const sent: string[] = [];
  const result = await deliverDeadlineReminders({
    now: MORNING,
    setting: setting(),
    students: [
      student({ id: "v", name: "Виктория", email: "v@example.com" }),
      student({ id: "quiet", name: "Саша", email: "s@example.com", emailNotifications: false }),
    ],
    tasks: [
      task({ id: "v1", studentId: "v", title: "Сцена в кухне" }),
      task({ id: "q1", studentId: "quiet", title: "Ночной разговор" }),
    ],
    baseUrl: BASE,
    alreadySent: async () => false,
    send: async (input) => {
      sent.push(input.to);
      return true;
    },
  });
  assert.deepEqual(sent, ["v@example.com"]);
  assert.equal(result.sent, 1);
});

test("ручной прогон отправляет вне окна 9:00 и в dry-run не вызывает почту", async () => {
  const afternoon = new Date("2026-10-25T12:00:00Z");
  const closed = await deliverDeadlineReminders({
    now: afternoon,
    setting: setting(),
    students: [student()],
    tasks: [task({ id: "a", title: "Ночной разговор" })],
    baseUrl: BASE,
    alreadySent: async () => false,
    send: async () => true,
  });
  assert.equal(closed.skipped, "not-morning");
  let called = false;
  const forced = await deliverDeadlineReminders({
    now: afternoon,
    setting: setting(),
    force: true,
    dryRun: true,
    students: [student()],
    tasks: [task({ id: "a", title: "Ночной разговор" })],
    baseUrl: BASE,
    alreadySent: async () => false,
    send: async () => {
      called = true;
      return true;
    },
  });
  assert.equal(called, false);
  assert.equal(forced.sent, 1);
  assert.equal(forced.deliveries[0]?.subject, "Завтра срок по заданию");
  assert.deepEqual(forced.deliveries[0]?.titles, ["Ночной разговор"]);
});

test("неудачная отправка не считается отправленной и пишется в строку журнала", async () => {
  const result = await deliverDeadlineReminders({
    now: MORNING,
    setting: setting(),
    students: [student()],
    tasks: [task({ id: "a" })],
    baseUrl: BASE,
    dryRun: true,
    alreadySent: async () => false,
    send: async () => {
      throw new Error("dry-run не должен отправлять");
    },
  });
  assert.equal(result.dryRun, true);
  assert.equal(result.sent, 1);
  assert.equal(result.planned, 1);
  assert.match(deadlineReminderLogLine(result), /\[deadline-reminder\] завтра 2026-10-26: к отправке 1, ушло 1, уже было 0, ошибок 0, dry-run true/);

  const failed = await deliverDeadlineReminders({
    now: MORNING,
    setting: setting(),
    students: [student()],
    tasks: [task({ id: "a" })],
    baseUrl: BASE,
    alreadySent: async () => false,
    send: async () => false,
  });
  assert.equal(failed.failed, 1);
  assert.equal(failed.sent, 0);
  assert.match(deadlineReminderLogLine(failed), /ошибок 1, dry-run false/);
});
