import { appUrl, renderEmail, type RenderedEmail } from "@/lib/mail";
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

/** Письмо ученику. Одно на пачку правок наставника. */
export function mentorWorkLetter(input: { name: string; studentId: string; pieces: DigestPiece[] }): RenderedEmail {
  const name = input.name.trim() || "Здравствуйте";
  const pieces = input.pieces.length > 0 ? input.pieces : [{ section: "tasks", detail: "" }];
  return renderEmail({
    title: "Наставник внёс правку",
    blocks: [
      { kind: "p", text: `${name}, я внесла правки в ваш кабинет.` },
      ...pieces.map((piece) => ({
        kind: "section" as const,
        title: sectionLabel(piece.section),
        items: bullets(piece.detail, piece.section),
        hint: `Куда нажать: левое меню, пункт «${sectionLabel(piece.section)}».`,
      })),
    ],
    action: { label: "Открыть кабинет", url: hrefFor("student", input.studentId, pieces[0].section) },
    footnote: "Одно письмо на пачку правок, не на каждое сохранение. Отключить такие письма можно в профиле.",
    signature: "Лиза Андреенко",
  });
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
      letter: mentorWorkLetter({ name: "Виктория", studentId: "sample", pieces }),
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
