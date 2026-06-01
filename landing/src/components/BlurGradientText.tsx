import { motion, useAnimationFrame, useMotionValue, useTransform, type TargetAndTransition, type Transition } from "motion/react";
import { createElement, useEffect, useMemo, useRef, useState, type ElementType } from "react";

type BlurGradientTextProps = {
  text?: string;
  colors?: string[];
  delay?: number;
  className?: string;
  direction?: "top" | "bottom";
  animationSpeed?: number;
  stepDuration?: number;
  tag?: ElementType;
  immediate?: boolean;
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

export default function BlurGradientText({
  text = "",
  colors = ["#5227FF", "#FF9FFC", "#B497CF"],
  delay = 85,
  className = "",
  direction = "top",
  animationSpeed = 7,
  stepDuration = 0.38,
  tag = "span",
  immediate = false,
  startDelay = 0
}: BlurGradientTextProps) {
  const words = text.split(" ");
  const [inView, setInView] = useState(immediate);
  const ref = useRef<HTMLElement | null>(null);

  const progress = useMotionValue(0);
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const animationDuration = animationSpeed * 1000;

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
      { threshold: 0.1, rootMargin: "0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [immediate]);

  useAnimationFrame((time) => {
    if (!inView) {
      lastTimeRef.current = null;
      return;
    }

    if (lastTimeRef.current === null) {
      lastTimeRef.current = time;
      return;
    }

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;
    elapsedRef.current += deltaTime;

    const fullCycle = animationDuration * 2;
    const cycleTime = elapsedRef.current % fullCycle;

    if (cycleTime < animationDuration) {
      progress.set((cycleTime / animationDuration) * 100);
    } else {
      progress.set(100 - ((cycleTime - animationDuration) / animationDuration) * 100);
    }
  });

  const backgroundPosition = useTransform(progress, (p) => `${p}% 50%`);
  const gradientColors = [...colors, colors[0]].join(", ");

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

  const stepCount = defaultTo.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from({ length: stepCount }, (_, i) => (stepCount === 1 ? 0 : i / (stepCount - 1)));

  return createElement(
    tag,
    {
      ref,
      className: `blur-gradient-text ${className}`.trim(),
      style: {
        display: "inline-flex",
        flexWrap: "nowrap",
        alignItems: "baseline",
        margin: 0,
        font: "inherit",
        whiteSpace: "nowrap"
      }
    },
    words.map((word, index) => {
      const animateKeyframes = buildKeyframes(defaultFrom, defaultTo);

      const spanTransition: Transition = {
        duration: totalDuration,
        times,
        delay: (startDelay + index * delay) / 1000,
        ease: "easeOut"
      };

      return (
        <motion.span
          className="blur-gradient-segment inline-block will-change-[transform,filter,opacity]"
          key={`${word}-${index}`}
          initial={defaultFrom}
          animate={inView ? animateKeyframes : defaultFrom}
          transition={spanTransition}
          style={{
            backgroundImage: `linear-gradient(to right, ${gradientColors})`,
            backgroundSize: "300% 100%",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            backgroundPosition
          }}
        >
          {word}
          {index < words.length - 1 && "\u00A0"}
        </motion.span>
      );
    })
  );
}
