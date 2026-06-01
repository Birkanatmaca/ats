import { useEffect } from "react";

const HEADER_OFFSET = 72;
const SCROLL_DURATION_MS = 980;
const MIN_WHEEL_DELTA = 12;
/** Trackpad parmak kalkana kadar ayni kaydirmada tek gecis */
const WHEEL_GESTURE_END_MS = 320;
const DESKTOP_SECTION_SCROLL_QUERY = "(min-width: 981px)";

const scrollState = {
  animating: false,
  wheelAccumulator: 0,
  gestureLocked: false,
  wheelResetTimer: null as ReturnType<typeof setTimeout> | null
};

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function isSectionScrollEnabled() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }

  return window.matchMedia(DESKTOP_SECTION_SCROLL_QUERY).matches;
}

function getSections() {
  return Array.from(document.querySelectorAll<HTMLElement>(".snap-section"));
}

function getSectionScrollTarget(section: HTMLElement) {
  const rect = section.getBoundingClientRect();
  const sectionTop = window.scrollY + rect.top;
  const sectionHeight = section.offsetHeight;
  const viewportHeight = window.innerHeight;
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - viewportHeight);

  if (section.classList.contains("snap-section--viewport")) {
    const centered = sectionTop + sectionHeight / 2 - viewportHeight / 2;
    return Math.max(0, Math.min(centered, maxScroll));
  }

  return Math.max(0, Math.min(sectionTop - HEADER_OFFSET, maxScroll));
}

function findActiveSectionIndex(sections: HTMLElement[]) {
  if (!sections.length) return 0;

  const scrollY = window.scrollY;
  let activeIndex = 0;
  let minDistance = Number.POSITIVE_INFINITY;

  sections.forEach((section, index) => {
    const distance = Math.abs(scrollY - getSectionScrollTarget(section));
    if (distance < minDistance) {
      minDistance = distance;
      activeIndex = index;
    }
  });

  return activeIndex;
}

function smoothScrollTo(targetY: number, duration: number): Promise<void> {
  if (duration <= 0) {
    window.scrollTo(0, targetY);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const startY = window.scrollY;
    const distance = targetY - startY;

    if (Math.abs(distance) < 1) {
      window.scrollTo(0, targetY);
      resolve();
      return;
    }

    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + distance * easeInOutCubic(progress));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
}

function scrollToSectionNative(section: HTMLElement) {
  const block = section.classList.contains("snap-section--viewport") ? "center" : "start";
  section.scrollIntoView({ behavior: "smooth", block });
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function isScrollableAncestor(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  let node: HTMLElement | null = target;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return true;
    }
    node = node.parentElement;
  }

  return false;
}

function scheduleGestureEnd() {
  if (scrollState.wheelResetTimer) {
    window.clearTimeout(scrollState.wheelResetTimer);
  }

  scrollState.wheelResetTimer = window.setTimeout(() => {
    scrollState.gestureLocked = false;
    scrollState.wheelAccumulator = 0;
    scrollState.wheelResetTimer = null;
  }, WHEEL_GESTURE_END_MS);
}

function resetWheelState() {
  scrollState.wheelAccumulator = 0;
  scrollState.gestureLocked = false;
  if (scrollState.wheelResetTimer) {
    window.clearTimeout(scrollState.wheelResetTimer);
    scrollState.wheelResetTimer = null;
  }
}

function clearSectionScrollMode() {
  document.documentElement.classList.remove("section-scroll-active", "section-scroll-snap");
}

async function goToSection(index: number, duration = SCROLL_DURATION_MS) {
  const sections = getSections();
  const section = sections[index];
  if (!section) return;

  if (!isSectionScrollEnabled()) {
    scrollToSectionNative(section);
    return;
  }

  if (scrollState.animating) {
    return;
  }

  scrollState.animating = true;

  await smoothScrollTo(getSectionScrollTarget(section), duration);

  scrollState.animating = false;
}

export function scrollToSnapSection(index: number, duration = SCROLL_DURATION_MS) {
  resetWheelState();
  void goToSection(index, duration);
}

export function scrollToSnapSectionById(id: string, duration = SCROLL_DURATION_MS) {
  const sections = getSections();
  const index = sections.findIndex((section) => section.id === id || section.dataset.snapId === id);
  if (index >= 0) scrollToSnapSection(index, duration);
}

export function useSectionScroll() {
  useEffect(() => {
    const desktopQuery = window.matchMedia(DESKTOP_SECTION_SCROLL_QUERY);
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let removeListeners: (() => void) | null = null;

    const onWheel = (event: WheelEvent) => {
      if (isEditableTarget(event.target) || isScrollableAncestor(event.target)) return;

      const sections = getSections();
      if (!sections.length) return;

      if (scrollState.gestureLocked || scrollState.animating) {
        event.preventDefault();
        scheduleGestureEnd();
        return;
      }

      scrollState.wheelAccumulator += event.deltaY;
      scheduleGestureEnd();

      if (Math.abs(scrollState.wheelAccumulator) < MIN_WHEEL_DELTA) {
        event.preventDefault();
        return;
      }

      const direction = scrollState.wheelAccumulator > 0 ? 1 : -1;
      scrollState.wheelAccumulator = 0;

      const activeIndex = findActiveSectionIndex(sections);
      const nextIndex = activeIndex + direction;

      if (nextIndex < 0 || nextIndex >= sections.length) {
        return;
      }

      event.preventDefault();
      scrollState.gestureLocked = true;
      scheduleGestureEnd();
      void goToSection(nextIndex, reducedMotionQuery.matches ? 0 : SCROLL_DURATION_MS);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const sections = getSections();
      const activeIndex = findActiveSectionIndex(sections);

      if (event.key === "PageDown" || event.key === "ArrowDown") {
        event.preventDefault();
        void goToSection(activeIndex + 1, reducedMotionQuery.matches ? 0 : SCROLL_DURATION_MS);
      }

      if (event.key === "PageUp" || event.key === "ArrowUp") {
        event.preventDefault();
        void goToSection(activeIndex - 1, reducedMotionQuery.matches ? 0 : SCROLL_DURATION_MS);
      }
    };

    function attachDesktopListeners() {
      document.documentElement.classList.add("section-scroll-active");
      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("keydown", onKeyDown);

      removeListeners = () => {
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("keydown", onKeyDown);
      };
    }

    function syncSectionScrollMode() {
      removeListeners?.();
      removeListeners = null;
      resetWheelState();
      scrollState.animating = false;
      clearSectionScrollMode();

      if (!isSectionScrollEnabled()) {
        return;
      }

      attachDesktopListeners();
    }

    syncSectionScrollMode();
    desktopQuery.addEventListener("change", syncSectionScrollMode);
    reducedMotionQuery.addEventListener("change", syncSectionScrollMode);

    return () => {
      desktopQuery.removeEventListener("change", syncSectionScrollMode);
      reducedMotionQuery.removeEventListener("change", syncSectionScrollMode);
      removeListeners?.();
      clearSectionScrollMode();
      resetWheelState();
      scrollState.animating = false;
    };
  }, []);
}
