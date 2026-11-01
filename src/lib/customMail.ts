import { usesFormalAddress } from "@/lib/addressForm";
import { applyStudentName } from "@/lib/mentorCompose";
import { EMAIL_SIGNATURE, escapeHtml, renderEmail } from "@/lib/mail";
import { optOutLinkLabel } from "@/lib/mailOptOut";

export {
  CUSTOM_MAIL_TYPE,
  CUSTOM_MAIL_WINDOW_MINUTES,
  CUSTOM_MAIL_ZONE,
  customEligible,
  customScheduleLabel,
  customSentMarker,
  customSlot,
  parseCustomMailing,
} from "@/lib/customMailPlan";
export type { CustomCadence, CustomMailingInput, CustomMailingPlan } from "@/lib/customMailPlan";

/** Письмо в общей рамке. Подпись ставится сама, отписка та же, что у остальных писем. */
export function customMailLetter(input: { name: string; subject: string; body: string; unsubscribeUrl?: string }) {
  const subject = applyStudentName(input.subject, input.name).trim() || "Письмо";
  const parts = applyStudentName(input.body, input.name)
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  const unsubscribe = input.unsubscribeUrl?.trim();
  const letter = renderEmail({
    title: subject,
    blocks: (parts.length ? parts : [""]).map((text) => ({ kind: "p" as const, text })),
    signature: EMAIL_SIGNATURE,
    formal: usesFormalAddress(input.name),
    footnote: unsubscribe
      ? `<a href="${escapeHtml(unsubscribe)}" style="color:#4B3FC0;text-decoration:underline;">${escapeHtml(optOutLinkLabel("mail"))}</a>`
      : undefined,
  });
  return { subject, html: letter.html, text: letter.text };
}
