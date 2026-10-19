import { prisma } from "@/lib/prisma";
import { foldedDescription } from "@/features/acts/chapterText";

export type SuggestableModel =
  | "Book"
  | "Cycle"
  | "PlanChapter"
  | "Character"
  | "PopArcCharacter"
  | "Act"
  | "BeliefCard"
  | "FreeSection"
  | "StoryCircleCard"
  | "GrapesSetting";

// Поля дополнительной таблицы GRAPES, которые разрешено писать через правки.
const GRAPES_SETTING_FIELDS = new Set([
  "title",
  "grapesGeography",
  "grapesReligion",
  "grapesAchievements",
  "grapesPolitics",
  "grapesEconomy",
  "grapesSocial",
]);

type RegistryEntry = {
  getStudentId: (recordId: string) => Promise<string>;
  getCurrentValue: (recordId: string, field: string) => Promise<string>;
  apply: (recordId: string, field: string, value: string) => Promise<void>;
};

async function getJsonFieldValue(
  obj: Record<string, unknown> | null,
  field: string
): Promise<string> {
  if (!obj) return "";
  const v = obj[field];
  return typeof v === "string" ? v : "";
}

export const SUGGESTION_REGISTRY: Record<SuggestableModel, RegistryEntry> = {
  Book: {
    getStudentId: async (id) => (await prisma.book.findUniqueOrThrow({ where: { id } })).studentId,
    getCurrentValue: async (id, field) => {
      const book = await prisma.book.findUniqueOrThrow({ where: { id } });
      const value = (book as unknown as Record<string, unknown>)[field];
      return typeof value === "string" ? value : "";
    },
    apply: async (id, field, value) => {
      // Доли сеттинга — числа, их пишет saveSettingMix, не строковое поле.
      if (field === "settingMix") return;
      await prisma.book.update({ where: { id }, data: { [field]: value } });
    },
  },
  Cycle: {
    getStudentId: async (id) => (await prisma.cycle.findUniqueOrThrow({ where: { id } })).studentId,
    getCurrentValue: async (id, field) => {
      const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id } });
      const value = (cycle as unknown as Record<string, unknown>)[field];
      return typeof value === "string" ? value : "";
    },
    apply: async (id, field, value) => {
      if (field === "settingMix") return;
      await prisma.cycle.update({ where: { id }, data: { [field]: value } });
    },
  },
  PlanChapter: {
    getStudentId: async (id) => {
      const chapter = await prisma.planChapter.findUniqueOrThrow({ where: { id } });
      const book = await prisma.book.findUniqueOrThrow({ where: { id: chapter.bookId } });
      return book.studentId;
    },
    getCurrentValue: async (id, field) => {
      const chapter = await prisma.planChapter.findUniqueOrThrow({ where: { id } });
      const value = (chapter as unknown as Record<string, unknown>)[field];
      return typeof value === "string" ? value : "";
    },
    apply: async (id, field, value) => {
      if (field === "summary" || field === "dramaticArgument" || field === "note" || field === "images") {
        const chapter = await prisma.planChapter.findUniqueOrThrow({ where: { id } });
        const next = { ...chapter, [field]: value };
        const description = foldedDescription(next);
        await prisma.planChapter.update({ where: { id }, data: { [field]: value, description } });
        return;
      }
      await prisma.planChapter.update({ where: { id }, data: { [field]: value } });
    },
  },
  Character: {
    getStudentId: async (id) => {
      const character = await prisma.character.findUniqueOrThrow({ where: { id } });
      const book = await prisma.book.findUniqueOrThrow({ where: { id: character.bookId } });
      return book.studentId;
    },
    getCurrentValue: async (id, field) => {
      const character = await prisma.character.findUniqueOrThrow({ where: { id } });
      if (field === "name") return character.name;
      return getJsonFieldValue(character.data as Record<string, unknown>, field);
    },
    apply: async (id, field, value) => {
      if (field === "name") {
        await prisma.character.update({ where: { id }, data: { name: value } });
        return;
      }
      const character = await prisma.character.findUniqueOrThrow({ where: { id } });
      const data = (character.data as Record<string, string>) ?? {};
      data[field] = value;
      await prisma.character.update({ where: { id }, data: { data } });
    },
  },
  PopArcCharacter: {
    getStudentId: async (id) => (await prisma.popArcCharacter.findUniqueOrThrow({ where: { id } })).studentId,
    getCurrentValue: async (id, field) => {
      const character = await prisma.popArcCharacter.findUniqueOrThrow({ where: { id } });
      if (field === "name") return character.name;
      return getJsonFieldValue(character.data as Record<string, unknown>, field);
    },
    apply: async (id, field, value) => {
      if (field === "name") {
        await prisma.popArcCharacter.update({ where: { id }, data: { name: value } });
        return;
      }
      const character = await prisma.popArcCharacter.findUniqueOrThrow({ where: { id } });
      const data = (character.data as Record<string, string>) ?? {};
      data[field] = value;
      await prisma.popArcCharacter.update({ where: { id }, data: { data } });
    },
  },
  Act: {
    getStudentId: async (id) => {
      const act = await prisma.act.findUniqueOrThrow({ where: { id } });
      const book = await prisma.book.findUniqueOrThrow({ where: { id: act.bookId } });
      return book.studentId;
    },
    getCurrentValue: async (id, field) => {
      const act = await prisma.act.findUniqueOrThrow({ where: { id } });
      const value = (act as unknown as Record<string, unknown>)[field];
      return typeof value === "string" ? value : "";
    },
    apply: async (id, field, value) => {
      await prisma.act.update({ where: { id }, data: { [field]: value } });
    },
  },
  BeliefCard: {
    getStudentId: async (id) => (await prisma.beliefCard.findUniqueOrThrow({ where: { id } })).studentId,
    getCurrentValue: async (id, field) => {
      const card = await prisma.beliefCard.findUniqueOrThrow({ where: { id } });
      const value = (card as unknown as Record<string, unknown>)[field];
      return typeof value === "string" ? value : "";
    },
    apply: async (id, field, value) => {
      await prisma.beliefCard.update({ where: { id }, data: { [field]: value } });
    },
  },
  FreeSection: {
    getStudentId: async (id) => (await prisma.freeSection.findUniqueOrThrow({ where: { id } })).studentId,
    getCurrentValue: async (id, field) => {
      const section = await prisma.freeSection.findUniqueOrThrow({ where: { id } });
      const value = (section as unknown as Record<string, unknown>)[field];
      return typeof value === "string" ? value : "";
    },
    apply: async (id, field, value) => {
      await prisma.freeSection.update({ where: { id }, data: { [field]: value } });
    },
  },
  StoryCircleCard: {
    getStudentId: async (id) => (await prisma.storyCircleCard.findUniqueOrThrow({ where: { id } })).studentId,
    getCurrentValue: async (id, field) => {
      const card = await prisma.storyCircleCard.findUniqueOrThrow({ where: { id } });
      if (field === "hero") return card.hero;
      return getJsonFieldValue(card.data as Record<string, unknown>, field);
    },
    apply: async (id, field, value) => {
      if (field === "hero") {
        await prisma.storyCircleCard.update({ where: { id }, data: { hero: value } });
        return;
      }
      const card = await prisma.storyCircleCard.findUniqueOrThrow({ where: { id } });
      const data = (card.data as Record<string, string>) ?? {};
      data[field] = value;
      await prisma.storyCircleCard.update({ where: { id }, data: { data } });
    },
  },
  GrapesSetting: {
    getStudentId: async (id) => {
      const setting = await prisma.grapesSetting.findUniqueOrThrow({ where: { id } });
      const book = await prisma.book.findUniqueOrThrow({ where: { id: setting.bookId } });
      return book.studentId;
    },
    getCurrentValue: async (id, field) => {
      const setting = await prisma.grapesSetting.findUniqueOrThrow({ where: { id } });
      const value = (setting as unknown as Record<string, unknown>)[field];
      return typeof value === "string" ? value : "";
    },
    apply: async (id, field, value) => {
      if (!GRAPES_SETTING_FIELDS.has(field)) throw new Error("Недопустимое поле");
      await prisma.grapesSetting.update({ where: { id }, data: { [field]: value } });
    },
  },
};
