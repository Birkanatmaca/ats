import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { Slot, type WithAsChild } from "@/components/animate-ui/primitives/animate/slot";

type ButtonProps = WithAsChild<
  HTMLMotionProps<"button"> & {
    hoverScale?: number;
    tapScale?: number;
  }
>;

function Button({
  hoverScale = 1.05,
  tapScale = 0.95,
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  const motionProps = {
    whileTap: { scale: tapScale },
    whileHover: { scale: hoverScale },
    ...props
  };

  if (asChild) {
    return (
      <Slot {...(motionProps as React.ComponentProps<typeof Slot>)}>
        {children as React.ReactElement}
      </Slot>
    );
  }

  return (
    <motion.button {...motionProps}>{children}</motion.button>
  );
}

export { Button, type ButtonProps };
