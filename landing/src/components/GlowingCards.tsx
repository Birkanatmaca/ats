import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode
} from "react";
import { cn } from "../lib/utils";
import "./GlowingCards.css";

export type GlowingCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
  glowColor?: string;
};

export type GlowingCardsProps = {
  children: ReactNode;
  className?: string;
  enableGlow?: boolean;
  glowRadius?: number;
  glowOpacity?: number;
  animationDuration?: number;
  gap?: string;
  maxWidth?: string;
  padding?: string;
  borderRadius?: string;
  role?: string;
  "aria-labelledby"?: string;
};

export function GlowingCard({
  children,
  className,
  glowColor = "#3b82f6",
  style,
  ...props
}: GlowingCardProps) {
  return (
    <div
      className={cn("glowing-card", className)}
      style={{ "--glow-color": glowColor, ...style } as CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}

GlowingCard.displayName = "GlowingCard";

function isGlowingCardElement(child: ReactNode): child is ReactElement<GlowingCardProps> {
  return isValidElement(child) && child.type === GlowingCard;
}

function cloneGlowCard(child: ReactElement<GlowingCardProps>) {
  const glowColor = child.props.glowColor ?? "#3b82f6";

  return cloneElement(child, {
    className: cn(child.props.className, "glowing-card--lit"),
    style: {
      ...child.props.style,
      "--glow-color": glowColor,
      backgroundColor: `${glowColor}22`,
      borderColor: glowColor,
      boxShadow: `0 0 0 1px inset ${glowColor}, 0 0 28px ${glowColor}33`
    } as CSSProperties
  });
}

export function GlowingCards({
  children,
  className,
  enableGlow = true,
  glowRadius = 25,
  glowOpacity = 1,
  animationDuration = 400,
  gap = "0.9rem",
  maxWidth = "1100px",
  padding = "0",
  borderRadius = "18px",
  role,
  "aria-labelledby": ariaLabelledBy
}: GlowingCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const overlay = overlayRef.current;

    if (!container || !overlay || !enableGlow) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      setShowOverlay(true);
      overlay.style.setProperty("--x", `${x}px`);
      overlay.style.setProperty("--y", `${y}px`);
      overlay.style.setProperty("--opacity", String(glowOpacity));
    };

    const handleMouseLeave = () => {
      setShowOverlay(false);
      overlay.style.setProperty("--opacity", "0");
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [enableGlow, glowOpacity]);

  const containerStyle = {
    "--gap": gap,
    "--max-width": maxWidth,
    "--padding": padding,
    "--border-radius": borderRadius,
    "--animation-duration": `${animationDuration}ms`,
    "--glow-radius": `${glowRadius}rem`,
    "--glow-opacity": glowOpacity
  } as CSSProperties;

  const litCards = Children.map(children, (child) =>
    isGlowingCardElement(child) ? cloneGlowCard(child) : child
  );

  return (
    <div
      aria-labelledby={ariaLabelledBy}
      className={cn("glowing-cards", className)}
      role={role}
      style={containerStyle}
    >
      <div className="glowing-cards__container" ref={containerRef}>
        <div className="glowing-cards__grid">{children}</div>

        {enableGlow ? (
          <div
            aria-hidden="true"
            className={cn("glowing-cards__overlay", showOverlay && "is-visible")}
            ref={overlayRef}
          >
            <div className="glowing-cards__grid">{litCards}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default GlowingCards;
