import { addressForm, withGreeting } from "@/lib/addressForm";
import { appUrl, escapeHtml, renderEmail, type RenderedEmail } from "@/lib/mail";
import { optOutLinkLabel } from "@/lib/mailOptOut";
import { sectionLabel } from "@/lib/sections";

export type DigestPiece = { section: string; detail: string };

function hrefFor(who: "student" | "mentor", studentId: string, section: string): string {
  const path = section === "notes" ? "tasks" : section;
  if (who === "student") return `${appUrl()}/dashboard/${path}`;
  return `${appUrl()}/student-view/${studentId}/${path}`;
}

function bullets(detail: string, section: string): string[] {
  const parts = detail.split("; ").map((item) => item.trim()).filter(Boolean);
  const label = sectionLabel(section);
  const own = parts.filter((item) => item !== label);
  return own.length > 0 ? own : ["Есть новые правки."];
}

const MENTOR_GROUP_LABEL: Record<string, string> = {
  accepted: "Принято",
  revision: "На доработке",
  note: "Заметки",
  text: "Правки",
  feedback: "Отзыв",
};

/** Группы письма. Старые строки без ссылки остаются отдельными пунктами. */
export function mentorDigestGroups(pieces: DigestPiece[]): { title: string; items: string[] }[] {
  const order = ["accepted", "revision", "note", "text", "feedback"];
  const buckets = new Map<string, string[]>();
  const rest: DigestPiece[] = [];
  for (const piece of pieces) {
    const group = piece.section.split(":")[0] ?? "";
    if (order.includes(group) && piece.detail.includes("\t")) {
      const list = buckets.get(group) ?? [];
      if (!list.includes(piece.detail.trim())) list.push(piece.detail.trim());
      buckets.set(group, list);
    } else if (piece.detail.trim()) {
      rest.push(piece);
    }
  }
  const groups = order.filter((key) => buckets.has(key)).map((key) => ({
    title: MENTOR_GROUP_LABEL[key] ?? key,
    items: buckets.get(key) ?? [],
  }));
  for (const piece of rest) {
    groups.push({ title: piece.section, items: [piece.detail] });
  }
  return groups;
}

function digestFoot(url: string | undefined): string {
  const base = "Одно письмо на пачку правок за час, не на каждое сохранение.";
  if (!url) return base;
  return `${base}<br><a href="${escapeHtml(url)}" style="color:#4B3FC0;text-decoration:underline;">${escapeHtml(optOutLinkLabel("mail"))}</a>`;
}

/** Письмо ученику. Одно на пачку правок наставника, группы со ссылками. */
export function mentorWorkLetter(input: {
  name: string;
  studentId: string;
  pieces: DigestPiece[];
  unsubscribeUrl?: string;
}): RenderedEmail {
  const pieces = input.pieces.length > 0 ? input.pieces : [{ section: "tasks", detail: "" }];
  const groups = mentorDigestGroups(pieces);
  const blocks = groups.length > 0
    ? groups.map((group) => {
        const linked = group.items.some((item) => item.includes("\t"));
        const title = SECTION_READY(group.title) ? group.title : sectionLabel(group.title);
        return {
          kind: "section" as const,
          title,
          items: group.items.flatMap((item) => (item.includes("\t") ? [item] : bullets(item, group.title))),
          hint: linked ? undefined : `Куда нажать: левое меню, пункт «${sectionLabel(group.title)}».`,
        };
      })
    : pieces.map((piece) => ({
        kind: "section" as const,
        title: sectionLabel(piece.section),
        items: bullets(piece.detail, piece.section),
        hint: `Куда нажать: левое меню, пункт «${sectionLabel(piece.section)}».`,
      }));
  const firstLink = groups.flatMap((group) => group.items).map((item) => item.split("\t")[1]?.trim()).find((url) => url?.startsWith("http"));
  return renderEmail({
    title: "Наставник внёс правку",
    blocks: [{ kind: "p", text: withGreeting(input.name, `я внесла правки в ${addressForm(input.name).yourM} кабинет.`) }, ...blocks],
    action: { label: "Открыть кабинет", url: firstLink || hrefFor("student", input.studentId, pieces[0].section.split(":")[0] || "tasks") },
    footnote: digestFoot(input.unsubscribeUrl),
    signature: "Лиза Андреенко",
  });
}

function SECTION_READY(title: string): boolean {
  return title === "Принято" || title === "На доработке" || title === "Заметки" || title === "Правки" || title === "Отзыв";
}

/** Письмо наставнику. Имя ученика, без угадывания рода. */
export function studentWorkLetter(input: { name: string; studentId: string; pieces: DigestPiece[] }): RenderedEmail {
  const name = input.name.trim() || "Ученик";
  const pieces = input.pieces.length > 0 ? input.pieces : [{ section: "tasks", detail: "" }];
  return renderEmail({
    title: "Ученик внёс правку",
    blocks: [
      { kind: "p", text: `${name}: в кабинете есть новые правки.` },
      ...pieces.map((piece) => ({
        kind: "section" as const,
        title: sectionLabel(piece.section),
        items: bullets(piece.detail, piece.section),
        hint: `Куда нажать: кабинет, пункт «${sectionLabel(piece.section)}».`,
      })),
    ],
    action: { label: "Открыть кабинет", url: hrefFor("mentor", input.studentId, pieces[0].section) },
    footnote: "Одно письмо на пачку правок, не на каждое сохранение.",
  });
}

export function studentOnlineLetter(input: { name: string; studentId: string; when: string }): RenderedEmail {
  const name = input.name.trim() || "Ученик";
  return renderEmail({
    title: "Ученик онлайн",
    blocks: [
      { kind: "p", text: `${name} в кабинете.` },
      { kind: "p", text: input.when },
    ],
    action: { label: "Открыть кабинет", url: hrefFor("mentor", input.studentId, "tasks") },
    footnote: "Письмо отмечает начало захода, не каждый пинг открытой вкладки.",
  });
}

export function activityLetterSamples() {
  const pieces = [
    { section: "tasks", detail: "Предложение; Комментарий" },
    { section: "setting", detail: "Заметка" },
  ];
  return {
    "mentor-edit": {
      subject: "Наставник внёс правку",
      letter: mentorWorkLetter({
        name: "Виктория",
        studentId: "sample",
        unsubscribeUrl: "https://studio.lizandwriter.ru/unsubscribe?token=preview-edit",
        pieces: [
          { section: "accepted:task:1", detail: "Черновик первой главы\thttps://studio.lizandwriter.ru/dashboard/tasks?tab=accepted#task-1" },
          { section: "revision:arc:2", detail: "Арка героя\thttps://studio.lizandwriter.ru/dashboard/exercises?focus=arc#exercise-2" },
          { section: "note:n1", detail: "Посмотри сцену в кафе\thttps://studio.lizandwriter.ru/dashboard/tasks" },
          { section: "text:chapter:3", detail: "Глава 3\thttps://studio.lizandwriter.ru/dashboard/plan#chapter-3" },
          { section: "feedback:task:1", detail: "Черновик первой главы\thttps://studio.lizandwriter.ru/dashboard/tasks#task-1" },
        ],
      }),
    },
    "student-edit": {
      subject: "Виктория: новые правки в кабинете",
      letter: studentWorkLetter({ name: "Виктория", studentId: "sample", pieces }),
    },
    "student-online": {
      subject: "Виктория в кабинете",
      letter: studentOnlineLetter({ name: "Виктория", studentId: "sample", when: "20 октября, 10:15, Москва" }),
    },
  };
}
