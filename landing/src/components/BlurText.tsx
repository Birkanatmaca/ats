import { motion, type TargetAndTransition, type Transition } from "motion/react";
import { createElement, useEffect, useMemo, useRef, useState, type ElementType } from "react";

type BlurTextProps = {
  text?: string;
  delay?: number;
  className?: string;
  animateBy?: "words" | "chars";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  animationFrom?: TargetAndTransition;
  animationTo?: TargetAndTransition[];
  easing?: Transition["ease"];
  onAnimationComplete?: () => void;
  stepDuration?: number;
  tag?: ElementType;
  /** true ise IntersectionObserver beklemeden animasyonu baslatir */
  immediate?: boolean;
  /** true ise satir blok olarak ortalanir (cok satirli basliklar icin) */
  block?: boolean;
  /** true ise tek satir baslik icin inline-flex kullanir */
  inline?: boolean;
  /** Satir baslamadan once bekleme (ms) */
  startDelay?: number;
};

function buildKeyframes(from: TargetAndTransition, steps: TargetAndTransition[]) {
  const keys = new Set([...Object.keys(from), ...steps.flatMap((s) => Object.keys(s))]);
  const keyframes: Record<string, (string | number)[]> = {};

  keys.forEach((k) => {
    const fromVal = (from as Record<string, string | number>)[k];
    keyframes[k] = [fromVal, ...steps.map((s) => (s as Record<string, string | number>)[k])];
  });

  return keyframes;
}

export default function BlurText({
  text = "",
  delay = 200,
  className = "",
  animateBy = "words",
  direction = "top",
  threshold = 0.1,
  rootMargin = "0px",
  animationFrom,
  animationTo,
  easing = "easeOut",
  onAnimationComplete,
  stepDuration = 0.35,
  tag = "p",
  immediate = false,
  block = false,
  inline = false,
  startDelay = 0
}: BlurTextProps) {
  const elements = animateBy === "words" ? text.split(" ") : text.split("");
  const [inView, setInView] = useState(immediate);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (immediate) {
      setInView(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(node);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, immediate]);

  const defaultFrom = useMemo<TargetAndTransition>(
    () =>
      direction === "top"
        ? { filter: "blur(10px)", opacity: 0, y: -50 }
        : { filter: "blur(10px)", opacity: 0, y: 50 },
    [direction]
  );

  const defaultTo = useMemo<TargetAndTransition[]>(
    () => [
      {
        filter: "blur(5px)",
        opacity: 0.5,
        y: direction === "top" ? 5 : -5
      },
      { filter: "blur(0px)", opacity: 1, y: 0 }
    ],
    [direction]
  );

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;

  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from({ length: stepCount }, (_, i) => (stepCount === 1 ? 0 : i / (stepCount - 1)));

  return createElement(
    tag,
    {
      ref: ref,
      className: className.trim(),
      style: {
        display: block ? "block" : inline ? "inline-flex" : "flex",
        flexWrap: block ? undefined : inline ? "nowrap" : "wrap",
        justifyContent: block || inline ? undefined : "center",
        margin: 0,
        width: block ? "100%" : undefined,
        textAlign: block ? "center" : undefined,
        font: inline ? "inherit" : undefined,
        whiteSpace: inline ? "nowrap" : undefined,
        verticalAlign: inline ? "baseline" : undefined
      }
    },
    elements.map((segment, index) => {
      const animateKeyframes = buildKeyframes(fromSnapshot, toSnapshots);

      const spanTransition: Transition = {
        duration: totalDuration,
        times,
        delay: (startDelay + index * delay) / 1000,
        ease: easing
      };

      return (
        <motion.span
          className="blur-text-segment inline-block will-change-[transform,filter,opacity]"
          key={`${segment}-${index}`}
          initial={fromSnapshot}
          animate={inView ? animateKeyframes : fromSnapshot}
          transition={spanTransition}
          onAnimationComplete={index === elements.length - 1 ? onAnimationComplete : undefined}
        >
          {segment === " " ? "\u00A0" : segment}
          {animateBy === "words" && index < elements.length - 1 && "\u00A0"}
        </motion.span>
      );
    })
  );
}
