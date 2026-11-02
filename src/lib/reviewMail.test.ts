import assert from "node:assert/strict";
import test from "node:test";
import { taskDecisionLetter } from "./reviewMail";

test("принято и доработка — разные письма, без тире", () => {
  const accepted = taskDecisionLetter({
    name: "Виктория",
    group: "accepted",
    title: "Черновик",
    url: "https://studio.example/dashboard/tasks?tab=accepted#task-1",
  });
  const revision = taskDecisionLetter({
    name: "Виктория Иванова",
    group: "revision",
    title: "Сцена",
    url: "https://studio.example/dashboard/tasks?tab=revision#task-2",
  });
  assert.match(accepted.text, /приняла задание «Черновик»/);
  assert.match(revision.text, /на доработку/);
  assert.match(revision.text, /сдаёте/);
  assert.equal(accepted.html.includes("—"), false);
  assert.equal(revision.html.includes("—"), false);
  assert.match(accepted.html, /tab=accepted#task-1/);
});
