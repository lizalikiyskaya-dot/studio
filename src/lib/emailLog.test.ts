import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { findDestructive } from "../../scripts/sql-guard.mjs";
import { prisma } from "./prisma";
import { sendMail, setMailTransportForTests } from "./mail";

const sqlPath = path.resolve(import.meta.dirname, "../../docs/sql/2026-10-19-email-log.sql");

function withoutSmtp<T>(run: () => Promise<T>): Promise<T> {
  const keys = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_PORT"] as const;
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  return run().finally(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    setMailTransportForTests(undefined);
  });
}

async function row(subject: string) {
  return prisma.emailLog.findFirst({ where: { subject }, orderBy: { createdAt: "desc" } });
}

test("журнал писем только добавляет таблицу", () => {
  const sql = fs.readFileSync(sqlPath, "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "EmailLog"/);
  assert.deepEqual(findDestructive(sql), []);
});

test("sendMail пишет попытку и не ходит в SMTP", async () => {
  await withoutSmtp(async () => {
    const missed = "journal-test-miss";
    const sent = "journal-test-sent";
    const failed = "journal-test-failed";
    await prisma.emailLog.deleteMany({ where: { subject: { in: [missed, sent, failed] } } });
    try {
    setMailTransportForTests(null);
    const missedOk = await sendMail({
      to: "anna@example.com",
      subject: missed,
      html: "<p>нет</p>",
      type: "guide",
      recipientUserId: null,
    });
    assert.equal(missedOk, false);
    const missedRow = await row(missed);
    assert.equal(missedRow?.status, "failed");
    assert.equal(missedRow?.error, "SMTP не настроен");
    assert.equal(missedRow?.type, "guide");
    assert.equal(missedRow?.recipientEmail, "anna@example.com");
    assert.match(missedRow?.html ?? "", /<p>нет<\/p>/);

    let calls = 0;
    setMailTransportForTests({
      sendMail: async () => {
        calls += 1;
        return {};
      },
    });
    const sentOk = await sendMail({
      to: "elena@example.com",
      subject: sent,
      html: "<p>да</p>",
      text: "да",
      type: "payment",
    });
    assert.equal(sentOk, true);
    assert.equal(calls, 1);
    const sentRow = await row(sent);
    assert.equal(sentRow?.status, "sent");
    assert.equal(sentRow?.error, null);
    assert.equal(sentRow?.type, "payment");

    process.env.SMTP_PASSWORD = "secret-value";
    setMailTransportForTests({
      sendMail: async () => {
        throw new Error("mailbox full secret-value");
      },
    });
    const failedOk = await sendMail({
      to: "liza@example.com",
      subject: failed,
      html: "<p>нет</p>",
      type: "password",
    });
    assert.equal(failedOk, false);
    const failedRow = await row(failed);
    assert.equal(failedRow?.status, "failed");
    assert.equal(failedRow?.error?.includes("secret-value"), false);
    assert.match(failedRow?.error ?? "", /mailbox full/);

    } finally {
      await prisma.emailLog.deleteMany({ where: { subject: { in: [missed, sent, failed] } } });
    }
  });
});
