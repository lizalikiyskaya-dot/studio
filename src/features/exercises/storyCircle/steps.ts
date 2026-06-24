export type StoryCircleStepKey =
  | "you"
  | "need"
  | "go"
  | "search"
  | "find"
  | "take"
  | "return"
  | "change";

export const STORY_CIRCLE_STEP_KEYS: StoryCircleStepKey[] = [
  "you",
  "need",
  "go",
  "search",
  "find",
  "take",
  "return",
  "change",
];

export const STORY_CIRCLE_STEPS: { key: StoryCircleStepKey; n: number; short: string; label: string }[] = [
  { key: "you", n: 1, short: "Ты", label: "Герой в зоне комфорта — кто он, какой мир его окружает (You)" },
  { key: "need", n: 2, short: "Нужда", label: "Герой чего-то хочет или в чём-то нуждается (Need)" },
  { key: "go", n: 3, short: "Путь", label: "Герой попадает в незнакомую ситуацию (Go)" },
  { key: "search", n: 4, short: "Поиск", label: "Герой приспосабливается, ищет способ получить то, что нужно (Search)" },
  { key: "find", n: 5, short: "Находка", label: "Герой получает то, чего хотел (Find)" },
  { key: "take", n: 6, short: "Цена", label: "Герой платит за это высокую цену (Take)" },
  { key: "return", n: 7, short: "Возврат", label: "Герой возвращается в привычный мир (Return)" },
  { key: "change", n: 8, short: "Перемена", label: "Герой изменился — он уже не тот, кем был в начале (Change)" },
];
