import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { guideOpenShouldEmail } from "./openGuide";

const root = path.resolve(import.meta.dirname, "../../..");

test("письмо только при новом открытии и выборе «Отправить»", () => {
  assert.equal(guideOpenShouldEmail({ visible: true, wasVisible: false, notify: true }), true);
  assert.equal(guideOpenShouldEmail({ visible: true, wasVisible: false, notify: false }), false);
  assert.equal(guideOpenShouldEmail({ visible: true, wasVisible: true, notify: true }), false);
  assert.equal(guideOpenShouldEmail({ visible: false, wasVisible: true, notify: true }), false);
  assert.equal(guideOpenShouldEmail({ visible: false, wasVisible: false, notify: false }), false);
});

test("открытие методички не шлёт письмо само и не ведёт на отдельную страницу", () => {
  const actions = fs.readFileSync(path.join(root, "src/features/guides/actions.ts"), "utf8");
  const notify = fs.readFileSync(path.join(root, "src/lib/notify.ts"), "utf8");
  const cabinet = fs.readFileSync(path.join(root, "src/features/materials/LibraryGuides.tsx"), "utf8");
  const library = fs.readFileSync(path.join(root, "src/features/guides/GuidesLibrary.tsx"), "utf8");
  const guides = fs.readFileSync(path.join(root, "src/lib/guides.ts"), "utf8");
  const studentPage = fs.readFileSync(path.join(root, "src/app/dashboard/guides/[guideId]/page.tsx"), "utf8");
  const mentorPage = fs.readFileSync(path.join(root, "src/app/mentor/guides/[guideId]/page.tsx"), "utf8");

  assert.match(actions, /guideOpenShouldEmail/);
  assert.doesNotMatch(actions, /notifyOnOpen/);
  assert.doesNotMatch(actions, /backfill/i);
  assert.match(notify, /dashboard\/materials\?tab=handouts/);
  assert.doesNotMatch(notify, /\/dashboard\/guides\//);
  assert.match(cabinet, /Отправить уведомление на почту\?/);
  assert.match(cabinet, /«Отправить»|Отправить/);
  assert.match(cabinet, /Не отправлять/);
  assert.doesNotMatch(cabinet, /\/dashboard\/guides\/|\/mentor\/guides\//);
  assert.doesNotMatch(cabinet, /ChevronDown|aria-expanded/);
  assert.match(library, /показать/);
  assert.doesNotMatch(library, /notifyOnOpen|Письмо ученику/);
  assert.doesNotMatch(library, /\/mentor\/guides\/\$\{/);
  assert.match(guides, /includeHidden \? rows : rows\.filter\(\(guide\) => guide\.visible\)/);
  assert.match(studentPage, /redirect\("\/dashboard\/materials\?tab=handouts"\)/);
  assert.match(mentorPage, /redirect\("\/mentor\/guides"\)/);
  assert.equal(fs.existsSync(path.join(root, "src/features/guides/GuideReader.tsx")), false);
});
