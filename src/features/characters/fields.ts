export type CharacterFieldKey =
  | "sec_role"
  | "sec_function"
  | "sec_indispensable"
  | "sec_appearance"
  | "sec_habits"
  | "sec_contrast"
  | "sec_theme"
  | "sec_mood"
  | "sec_arcStart"
  | "sec_arcMove"
  | "sec_arcEnd"
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
  | "posFalseBeliefScene"
  | "posFalseGoal"
  | "posFalseGoalScene"
  | "posFalseGoalAchieved"
  | "posFalseGoalAchievedScene"
  | "posTurningPoint"
  | "posTurningPointScene"
  | "posTrueMotivation"
  | "posTrueMotivationScene"
  | "posTrueGoalAchieved"
  | "posTrueGoalAchievedScene"
  | "posResult"
  | "posResultScene"
  | "negInitialTruth"
  | "negInitialTruthScene"
  | "negTemptation"
  | "negTemptationScene"
  | "negTempSuccess"
  | "negTempSuccessScene"
  | "negRejectionPoint"
  | "negRejectionPointScene"
  | "negLieRoot"
  | "negLieRootScene"
  | "negFalseGoalFull"
  | "negFalseGoalFullScene"
  | "negResult"
  | "negResultScene"
  | "disFalseBelief"
  | "disFalseBeliefScene"
  | "disFalseGoal"
  | "disFalseGoalScene"
  | "disTempSuccess"
  | "disTempSuccessScene"
  | "disRevealPoint"
  | "disRevealPointScene"
  | "disBitterTruth"
  | "disBitterTruthScene"
  | "disAcceptance"
  | "disAcceptanceScene"
  | "disResult"
  | "disResultScene"
  | "fallVagueBelief"
  | "fallVagueBeliefScene"
  | "fallLieGoal"
  | "fallLieGoalScene"
  | "fallFirstCracks"
  | "fallFirstCracksScene"
  | "fallTruthDenied"
  | "fallTruthDeniedScene"
  | "fallDeepening"
  | "fallDeepeningScene"
  | "fallDestructiveActs"
  | "fallDestructiveActsScene"
  | "fallResult"
  | "fallResultScene"
  | "flatTrueBelief"
  | "flatTrueBeliefScene"
  | "flatTrueGoal"
  | "flatTrueGoalScene"
  | "flatWorldLie"
  | "flatWorldLieScene"
  | "flatBeliefTest"
  | "flatBeliefTestScene"
  | "flatInfluence"
  | "flatInfluenceScene"
  | "flatClimax"
  | "flatClimaxScene"
  | "flatResult"
  | "flatResultScene";

export const ALL_CHARACTER_FIELD_KEYS: CharacterFieldKey[] = [
  "sec_role",
  "sec_function",
  "sec_indispensable",
  "sec_appearance",
  "sec_habits",
  "sec_contrast",
  "sec_theme",
  "sec_mood",
  "sec_arcStart",
  "sec_arcMove",
  "sec_arcEnd",
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
  "posFalseBeliefScene",
  "posFalseGoal",
  "posFalseGoalScene",
  "posFalseGoalAchieved",
  "posFalseGoalAchievedScene",
  "posTurningPoint",
  "posTurningPointScene",
  "posTrueMotivation",
  "posTrueMotivationScene",
  "posTrueGoalAchieved",
  "posTrueGoalAchievedScene",
  "posResult",
  "posResultScene",
  "negInitialTruth",
  "negInitialTruthScene",
  "negTemptation",
  "negTemptationScene",
  "negTempSuccess",
  "negTempSuccessScene",
  "negRejectionPoint",
  "negRejectionPointScene",
  "negLieRoot",
  "negLieRootScene",
  "negFalseGoalFull",
  "negFalseGoalFullScene",
  "negResult",
  "negResultScene",
  "disFalseBelief",
  "disFalseBeliefScene",
  "disFalseGoal",
  "disFalseGoalScene",
  "disTempSuccess",
  "disTempSuccessScene",
  "disRevealPoint",
  "disRevealPointScene",
  "disBitterTruth",
  "disBitterTruthScene",
  "disAcceptance",
  "disAcceptanceScene",
  "disResult",
  "disResultScene",
  "fallVagueBelief",
  "fallVagueBeliefScene",
  "fallLieGoal",
  "fallLieGoalScene",
  "fallFirstCracks",
  "fallFirstCracksScene",
  "fallTruthDenied",
  "fallTruthDeniedScene",
  "fallDeepening",
  "fallDeepeningScene",
  "fallDestructiveActs",
  "fallDestructiveActsScene",
  "fallResult",
  "fallResultScene",
  "flatTrueBelief",
  "flatTrueBeliefScene",
  "flatTrueGoal",
  "flatTrueGoalScene",
  "flatWorldLie",
  "flatWorldLieScene",
  "flatBeliefTest",
  "flatBeliefTestScene",
  "flatInfluence",
  "flatInfluenceScene",
  "flatClimax",
  "flatClimaxScene",
  "flatResult",
  "flatResultScene",
];

export type FieldGroup = {
  title: string;
  subhead?: string;
  fields: { key: CharacterFieldKey; label: string; sceneKey?: CharacterFieldKey }[];
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
      { key: "posFalseBelief", sceneKey: "posFalseBeliefScene", label: "Ложное убеждение" },
      { key: "posFalseGoal", sceneKey: "posFalseGoalScene", label: "Ложная мотивация / цель" },
      { key: "posFalseGoalAchieved", sceneKey: "posFalseGoalAchievedScene", label: "Достижение ложной мотивации" },
      { key: "posTurningPoint", sceneKey: "posTurningPointScene", label: "Точка трансформации" },
      { key: "posTrueMotivation", sceneKey: "posTrueMotivationScene", label: "Истинная мотивация" },
      { key: "posTrueGoalAchieved", sceneKey: "posTrueGoalAchievedScene", label: "Достижение истинной мотивации" },
      { key: "posResult", sceneKey: "posResultScene", label: "Результат трансформации" },
    ],
  },
  {
    title: "Арка разочарования",
    fields: [
      { key: "disFalseBelief", sceneKey: "disFalseBeliefScene", label: "Ложное убеждение" },
      { key: "disFalseGoal", sceneKey: "disFalseGoalScene", label: "Ложная мотивация / цель" },
      { key: "disTempSuccess", sceneKey: "disTempSuccessScene", label: "Временный успех ложной мотивации" },
      { key: "disRevealPoint", sceneKey: "disRevealPointScene", label: "Точка раскрытия истины" },
      { key: "disBitterTruth", sceneKey: "disBitterTruthScene", label: "Истина (горькая, не утешительная)" },
      { key: "disAcceptance", sceneKey: "disAcceptanceScene", label: "Принятие тяжёлой истины" },
      { key: "disResult", sceneKey: "disResultScene", label: "Результат — горькое прозрение без счастья" },
    ],
  },
  {
    title: "Арка падения",
    fields: [
      { key: "fallVagueBelief", sceneKey: "fallVagueBeliefScene", label: "Ложное убеждение (расплывчатая мотивация)" },
      { key: "fallLieGoal", sceneKey: "fallLieGoalScene", label: "Цель, основанная на лжи" },
      { key: "fallFirstCracks", sceneKey: "fallFirstCracksScene", label: "Первые трещины — намёки на истину, которые герой игнорирует" },
      { key: "fallTruthDenied", sceneKey: "fallTruthDeniedScene", label: "Истина становится очевидна, но герой отказывается её принять" },
      { key: "fallDeepening", sceneKey: "fallDeepeningScene", label: "Углубление в ложь как защитная реакция" },
      { key: "fallDestructiveActs", sceneKey: "fallDestructiveActsScene", label: "Разрушительные действия в защиту лжи" },
      { key: "fallResult", sceneKey: "fallResultScene", label: "Результат — трагический крах без сознательного выбора зла" },
    ],
  },
  {
    title: "Арка порчи",
    fields: [
      { key: "negInitialTruth", sceneKey: "negInitialTruthScene", label: "Истинное убеждение / добрые намерения в начале" },
      { key: "negTemptation", sceneKey: "negTemptationScene", label: "Искушение — ложь, которая кажется путём к цели" },
      { key: "negTempSuccess", sceneKey: "negTempSuccessScene", label: "Первые шаги к лжи — пока обратимые" },
      { key: "negRejectionPoint", sceneKey: "negRejectionPointScene", label: "Поворотный момент — осознанный отказ от истины" },
      { key: "negLieRoot", sceneKey: "negLieRootScene", label: "Активное принятие лжи и оправдание поступков" },
      { key: "negFalseGoalFull", sceneKey: "negFalseGoalFullScene", label: "Разрушительные поступки ради ложной цели" },
      { key: "negResult", sceneKey: "negResultScene", label: "Результат — герой теряет себя, сознательно выбрав тьму" },
    ],
  },
  {
    title: "Плоская арка",
    fields: [
      { key: "flatTrueBelief", sceneKey: "flatTrueBeliefScene", label: "Истинное убеждение (с начала)" },
      { key: "flatTrueGoal", sceneKey: "flatTrueGoalScene", label: "Цель, основанная на истине" },
      { key: "flatWorldLie", sceneKey: "flatWorldLieScene", label: "Ложь мира, которая противостоит герою" },
      { key: "flatBeliefTest", sceneKey: "flatBeliefTestScene", label: "Испытание убеждения" },
      { key: "flatInfluence", sceneKey: "flatInfluenceScene", label: "Влияние героя на других / мир" },
      { key: "flatClimax", sceneKey: "flatClimaxScene", label: "Кульминация — истина побеждает сопротивление мира" },
      { key: "flatResult", sceneKey: "flatResultScene", label: "Результат — меняется мир, а не герой" },
    ],
  },
];

export const SECONDARY_CHARACTER_GROUPS: FieldGroup[] = [
  {
    title: "1. Роль в истории",
    defaultOpen: true,
    fields: [
      { key: "sec_role", label: "Роль (наставник, спутник, антагонист...)" },
      { key: "sec_function", label: "Функция: катализатор / контраст / голос темы / ритм и масштаб" },
      { key: "sec_indispensable", label: "Что сломается в сюжете, если убрать этого персонажа?" },
    ],
  },
  {
    title: "2. Характер",
    fields: [
      { key: "sec_appearance", label: "Внешность" },
      { key: "sec_habits", label: "Привычки и речь" },
    ],
  },
  {
    title: "3. Как работает",
    fields: [
      { key: "sec_contrast", label: "Контраст — какую черту протагониста проявляет" },
      { key: "sec_theme", label: "Голос темы — какую идею несёт" },
      { key: "sec_mood", label: "Эмоции и ритм — как меняет настроение или темп сцены" },
    ],
  },
  {
    title: "4. Арка",
    fields: [
      { key: "sec_arcStart", label: "Точка А — исходное состояние" },
      { key: "sec_arcMove", label: "Движение — духовное, моральное, эмоциональное" },
      { key: "sec_arcEnd", label: "Точка Б — новое понимание (или намеренная статичность)" },
    ],
  },
];
