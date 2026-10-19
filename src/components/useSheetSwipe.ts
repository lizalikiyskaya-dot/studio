"use client";

import { useEffect, useRef, type RefObject } from "react";

const START_PX = 8;
const CLOSE_PX = 96;

/**
 * Свайп вниз закрывает шторку. Ручка тянет всегда.
 * По содержимому — только если оно уже прокручено к началу,
 * чтобы жест не отбирал прокрутку списка.
 */
export function useSheetSwipe(
  enabled: boolean,
  onClose: () => void,
  panelRef: RefObject<HTMLElement | null>,
  scrollerRef: RefObject<HTMLElement | null>,
) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    const panel = panelRef.current;
    if (!panel) return;

    let startY = 0;
    let startScroll = 0;
    let dy = 0;
    let mode: "idle" | "scroll" | "drag" = "idle";
    let fromHandle = false;
    let tracking = false;

    const atTop = () => {
      const scroller = scrollerRef.current;
      return !scroller || scroller.scrollTop <= 1;
    };

    const snapBack = () => {
      panel.style.transition = "transform 180ms ease";
      panel.style.transform = "translateY(0px)";
      window.setTimeout(() => {
        panel.style.transition = "";
        panel.style.transform = "";
      }, 190);
    };

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const target = event.target as HTMLElement | null;
      if (!target || !panel.contains(target)) return;
      fromHandle = !!target.closest("[data-sheet-handle]");
      if (!fromHandle && target.closest("button, input, textarea, select, [contenteditable='true']")) return;
      tracking = true;
      mode = "idle";
      dy = 0;
      startY = event.touches[0].clientY;
      startScroll = scrollerRef.current?.scrollTop ?? 0;
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking || event.touches.length !== 1) return;
      dy = event.touches[0].clientY - startY;
      if (mode === "idle") {
        if (Math.abs(dy) < START_PX) return;
        const stillTop = startScroll <= 1 && atTop();
        if (fromHandle || (dy > 0 && stillTop)) mode = "drag";
        else mode = "scroll";
      }
      if (mode !== "drag") return;
      if (dy <= 0) {
        panel.style.transform = "translateY(0px)";
        return;
      }
      event.preventDefault();
      panel.style.transition = "none";
      panel.style.transform = `translateY(${dy}px)`;
    };

    const onEnd = () => {
      if (!tracking) return;
      const dragged = mode === "drag" && dy > START_PX;
      tracking = false;
      if (!dragged) {
        mode = "idle";
        return;
      }
      const stopClick = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        document.removeEventListener("click", stopClick, true);
      };
      document.addEventListener("click", stopClick, true);
      window.setTimeout(() => document.removeEventListener("click", stopClick, true), 400);
      if (dy > CLOSE_PX) {
        panel.style.transition = "transform 180ms ease";
        panel.style.transform = "translateY(110%)";
        window.setTimeout(() => closeRef.current(), 170);
      } else {
        snapBack();
      }
      mode = "idle";
    };

    panel.addEventListener("touchstart", onStart, { passive: true });
    panel.addEventListener("touchmove", onMove, { passive: false });
    panel.addEventListener("touchend", onEnd);
    panel.addEventListener("touchcancel", onEnd);
    return () => {
      panel.removeEventListener("touchstart", onStart);
      panel.removeEventListener("touchmove", onMove);
      panel.removeEventListener("touchend", onEnd);
      panel.removeEventListener("touchcancel", onEnd);
      panel.style.transition = "";
      panel.style.transform = "";
    };
  }, [enabled, panelRef, scrollerRef]);
}
