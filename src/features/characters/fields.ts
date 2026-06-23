export type CharacterFieldKey =
  | "habits"
  | "patterns"
  | "speech"
  | "appearance"
  | "middleLayer"
  | "deepLayer"
  | "startingPoint"
  | "conflictInternal"
  | "conflictExternal"
  | "goal"
  | "pathStep1"
  | "pathStep2"
  | "pathStep3"
  | "obstacles"
  | "turningPoint"
  | "falseBelief"
  | "trueBelief"
  | "breakingEvents"
  | "resistance"
  | "transformationResult"
  | "posFalseBelief"
  | "posFalseGoal"
  | "posFalseGoalAchieved"
  | "posTurningPoint"
  | "posTrueMotivation"
  | "posTrueGoalAchieved"
  | "posResult"
  | "negInitialTruth"
  | "negTemptation"
  | "negTempSuccess"
  | "negRejectionPoint"
  | "negLieRoot"
  | "negFalseGoalFull"
  | "negResult"
  | "flatTrueBelief"
  | "flatTrueGoal"
  | "flatWorldLie"
  | "flatBeliefTest"
  | "flatInfluence"
  | "flatClimax"
  | "flatResult";

export const ALL_CHARACTER_FIELD_KEYS: CharacterFieldKey[] = [
  "habits",
  "patterns",
  "speech",
  "appearance",
  "middleLayer",
  "deepLayer",
  "startingPoint",
  "conflictInternal",
  "conflictExternal",
  "goal",
  "pathStep1",
  "pathStep2",
  "pathStep3",
  "obstacles",
  "turningPoint",
  "falseBelief",
  "trueBelief",
  "breakingEvents",
  "resistance",
  "transformationResult",
  "posFalseBelief",
  "posFalseGoal",
  "posFalseGoalAchieved",
  "posTurningPoint",
  "posTrueMotivation",
  "posTrueGoalAchieved",
  "posResult",
  "negInitialTruth",
  "negTemptation",
  "negTempSuccess",
  "negRejectionPoint",
  "negLieRoot",
  "negFalseGoalFull",
  "negResult",
  "flatTrueBelief",
  "flatTrueGoal",
  "flatWorldLie",
  "flatBeliefTest",
  "flatInfluence",
  "flatClimax",
  "flatResult",
];

export type FieldGroup = {
  title: string;
  subhead?: string;
  fields: { key: CharacterFieldKey; label: string }[];
  defaultOpen?: boolean;
};

export const DOSSIER_GROUPS: FieldGroup[] = [
  {
    title: "1. Слои персонажа",
    defaultOpen: true,
    subhead: "Внешний слой — кто он для мира",
    fields: [
      { key: "habits", label: "Привычки" },
      { key: "patterns", label: "Паттерны" },
      { key: "speech", label: "Речь" },
      { key: "appearance", label: "Внешность" },
    ],
  },
  {
    title: "",
    subhead: "Средний слой — быт и окружение",
    fields: [{ key: "middleLayer", label: "" }],
  },
  {
    title: "",
    subhead: "Глубокий слой — страхи и травмы",
    fields: [{ key: "deepLayer", label: "" }],
  },
  {
    title: "2. Исходная точка",
    fields: [{ key: "startingPoint", label: "Кто он в начале истории" }],
  },
  {
    title: "3. Конфликты",
    fields: [
      { key: "conflictInternal", label: "Внутренний конфликт" },
      { key: "conflictExternal", label: "Внешний конфликт" },
    ],
  },
  {
    title: "4. Цель и путь",
    fields: [
      { key: "goal", label: "Цель персонажа" },
      { key: "pathStep1", label: "Путь к цели: шаг 1" },
      { key: "pathStep2", label: "Путь к цели: шаг 2" },
      { key: "pathStep3", label: "Путь к цели: шаг 3" },
      { key: "obstacles", label: "Препятствия" },
      { key: "turningPoint", label: "Поворотный момент" },
    ],
  },
  {
    title: "5. Арка (трансформация)",
    fields: [
      { key: "falseBelief", label: "Ложное убеждение" },
      { key: "trueBelief", label: "Истинное убеждение" },
      { key: "breakingEvents", label: "События, которые разрушают ложь" },
      { key: "resistance", label: "Как сопротивляется истине" },
    ],
  },
  {
    title: "6. Результат трансформации",
    fields: [{ key: "transformationResult", label: "Кем становится к концу части 1" }],
  },
];

export const ARC_GROUPS: FieldGroup[] = [
  {
    title: "Позитивная арка",
    defaultOpen: true,
    fields: [
      { key: "posFalseBelief", label: "Ложное убеждение" },
      { key: "posFalseGoal", label: "Ложная мотивация / цель" },
      { key: "posFalseGoalAchieved", label: "Достижение ложной мотивации" },
      { key: "posTurningPoint", label: "Точка трансформации" },
      { key: "posTrueMotivation", label: "Истинная мотивация" },
      { key: "posTrueGoalAchieved", label: "Достижение истинной мотивации" },
      { key: "posResult", label: "Результат трансформации" },
    ],
  },
  {
    title: "Отрицательная арка",
    fields: [
      { key: "negInitialTruth", label: "Исходная (частичная) истина" },
      { key: "negTemptation", label: "Искушение ложью" },
      { key: "negTempSuccess", label: "Временный успех лжи" },
      { key: "negRejectionPoint", label: "Точка отказа от истины" },
      { key: "negLieRoot", label: "Укоренение лжи" },
      { key: "negFalseGoalFull", label: "Полное достижение ложной цели" },
      { key: "negResult", label: "Результат — крах / разрушение" },
    ],
  },
  {
    title: "Плоская арка",
    fields: [
      { key: "flatTrueBelief", label: "Истинное убеждение (с начала)" },
      { key: "flatTrueGoal", label: "Цель, основанная на истине" },
      { key: "flatWorldLie", label: "Ложь мира, которая противостоит герою" },
      { key: "flatBeliefTest", label: "Испытание убеждения" },
      { key: "flatInfluence", label: "Влияние героя на других / мир" },
      { key: "flatClimax", label: "Кульминация — истина побеждает сопротивление мира" },
      { key: "flatResult", label: "Результат — меняется мир, а не герой" },
    ],
  },
];
