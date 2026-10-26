export type FlightPoint = { x: number; y: number };

/** Куда летит звёздочка: к счётчику звёзд, иначе к серии, иначе чуть вверх от кнопки. */
export function flightDestination(from: FlightPoint, stars: FlightPoint | null, streak: FlightPoint | null): FlightPoint {
  if (stars) return stars;
  if (streak) return streak;
  return { x: from.x, y: from.y - 68 };
}

/** Кнопка сдачи: активная, уже сданная или скрыта после «принято». */
export function submitReviewControl(status: string): "submit" | "submitted" | "hidden" {
  if (status === "ACCEPTED") return "hidden";
  if (status === "SUBMITTED") return "submitted";
  return "submit";
}

const STAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#FFD43B" stroke="#202020" stroke-width="1.75" stroke-linejoin="round" aria-hidden="true"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>`;

function centerOf(selector: string): FlightPoint | null {
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) return null;
  const box = el.getBoundingClientRect();
  if (box.width < 2 || box.height < 2) return null;
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return null;
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/** Маленькая звёздочка от кнопки к счётчику. На счётчик не влияет. */
export function flySubmitStar(from: HTMLElement | null) {
  if (!from || typeof document === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = from.getBoundingClientRect();
  const start = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  const dest = flightDestination(start, centerOf("[data-star-counter]"), centerOf("[data-streak-counter]"));
  const node = document.createElement("span");
  node.className = "submit-star";
  node.dataset.submitStar = "1";
  node.setAttribute("aria-hidden", "true");
  node.style.left = `${start.x}px`;
  node.style.top = `${start.y}px`;
  node.innerHTML = STAR_SVG;
  document.body.appendChild(node);
  const dx = dest.x - start.x;
  const dy = dest.y - start.y;
  const animation = node.animate(
    [
      { transform: "translate(-50%, -50%) scale(0.55)", opacity: 0 },
      { transform: "translate(-50%, -50%) scale(1)", opacity: 1, offset: 0.16 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.5)`, opacity: 0 },
    ],
    { duration: 780, easing: "cubic-bezier(.22,.7,.25,1)", fill: "forwards" },
  );
  animation.onfinish = () => node.remove();
  animation.oncancel = () => node.remove();
}
