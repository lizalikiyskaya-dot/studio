/** Письмо уходит только в момент открытия и только если наставник выбрал «Отправить». */
export function guideOpenShouldEmail(input: {
  visible: boolean;
  wasVisible: boolean;
  notify: boolean;
}): boolean {
  return input.visible && !input.wasVisible && input.notify;
}
