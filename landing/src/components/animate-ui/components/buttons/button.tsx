import { cva, type VariantProps } from "class-variance-authority";
import {
  Button as ButtonPrimitive,
  type ButtonProps as ButtonPrimitiveProps
} from "@/components/animate-ui/primitives/buttons/button";
import { cn } from "@/lib/utils";

const buttonVariants = cva("btn btn-motion", {
  variants: {
    variant: {
      default: "btn-primary",
      gradient: "btn-gradient",
      accent: "btn-primary",
      destructive: "btn-primary",
      outline: "btn-ghost",
      secondary: "btn-secondary",
      ghost: "btn-ghost",
      link: "btn-link"
    },
    size: {
      default: "",
      sm: "btn-sm",
      lg: "btn-lg",
      icon: "btn-icon",
      "icon-sm": "btn-icon btn-icon-sm",
      "icon-lg": "btn-icon btn-icon-lg"
    }
  },
  defaultVariants: {
    variant: "default",
    size: "default"
  }
});

type ButtonProps = ButtonPrimitiveProps & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return <ButtonPrimitive className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants, type ButtonProps };
