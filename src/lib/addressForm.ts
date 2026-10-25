/**
 * К кому студия обращается на «Вы».
 * Отдельного поля в карточке нет: сравнение по первому слову имени, без регистра.
 * Виктория: «Вы» и женские формы. Остальные: «ты», без «сделал» / «сделала».
 * Надежда, Ваня и Ян из-за этого не получают мужской или женский глагол.
 */
export const FORMAL_ADDRESS_NAMES = ["Виктория"] as const;

export function usesFormalAddress(name: string): boolean {
  const first = name.trim().split(/\s+/)[0]?.toLocaleLowerCase("ru-RU") ?? "";
  if (!first) return false;
  return FORMAL_ADDRESS_NAMES.some((item) => item.toLocaleLowerCase("ru-RU") === first);
}

export type AddressForm = {
  formal: boolean;
  /** тебе | Вам */
  toYou: string;
  /** твою | Вашу */
  yourFAcc: string;
  /** твой | Ваш */
  yourM: string;
  /** твоим | Вашим */
  yourMIns: string;
  /** напиши | напишите */
  write: string;
  /** правишь | Вы правите */
  whenEdit: string;
  /** сдаёшь | сдаёте */
  submit: string;
  /** Входи | Входите */
  enter: string;
  /** которые указаны при регистрации | что Вы указала при регистрации */
  registered: string;
  /** удали | удалите */
  remove: string;
  /** выдели | выделите */
  select: string;
  /** фраза после имени в письме о пароле */
  passwordAsk: string;
  passwordFoot: string;
};

export function addressForm(name: string): AddressForm {
  if (usesFormalAddress(name)) {
    return {
      formal: true,
      toYou: "Вам",
      yourFAcc: "Вашу",
      yourM: "Ваш",
      yourMIns: "Вашим",
      write: "напишите",
      whenEdit: "Вы правите",
      submit: "сдаёте",
      enter: "Входите",
      registered: "что Вы указала при регистрации",
      remove: "удалите",
      select: "выделите",
      passwordAsk: "Вы попросила сменить пароль.",
      passwordFoot: "Если Вы не просила сменить пароль, просто удалите это письмо, пароль останется прежним.",
    };
  }
  return {
    formal: false,
    toYou: "тебе",
    yourFAcc: "твою",
    yourM: "твой",
    yourMIns: "твоим",
    write: "напиши",
    whenEdit: "правишь",
    submit: "сдаёшь",
    enter: "Входи",
    registered: "которые указаны при регистрации",
    remove: "удали",
    select: "выдели",
    passwordAsk: "вот ссылка, чтобы сменить пароль.",
    passwordFoot: "Если смену пароля не просили, просто удали это письмо, пароль останется прежним.",
  };
}

/** Подстановки для шаблона. Свой текст Лизы эти ключи не трогает, если она их не вставила. */
export function addressVars(name: string): Record<string, string> {
  const form = addressForm(name);
  return {
    кому: form.toYou,
    чью: form.yourFAcc,
    чей: form.yourM,
    чьим: form.yourMIns,
    напиши: form.write,
    правишь: form.whenEdit,
    сдаёшь: form.submit,
    Входи: form.enter,
    регистрация: form.registered,
    выдели: form.select,
    просьба: form.passwordAsk,
  };
}

export function withAddress(name: string, vars: Record<string, string>): Record<string, string> {
  return { ...addressVars(name), ...vars };
}
