import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-display font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-finco-blue text-black rounded-full hover:bg-finco-blue/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm rounded-full hover:bg-destructive/90",
        outline:
          "border-[1.4px] border-finco-blue text-finco-blue bg-transparent rounded-full hover:bg-finco-blue/10",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm rounded-lg hover:bg-secondary/80",
        ghost: "hover:bg-accent/10 hover:text-accent-foreground rounded-lg",
        link: "text-finco-blue underline-offset-4 hover:underline",
        glow: "bg-finco-blue text-black rounded-full hover:bg-finco-blue/90 glow-blue",
      },
      size: {
        default: "h-[49px] px-[34px] py-[14px] text-[16px]",
        sm: "h-8 rounded-full px-4 text-xs",
        lg: "h-[51px] px-[34px] py-[14px] text-[16px]",
        xl: "h-[51px] px-[34px] py-[14px] text-[16px]",
        icon: "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
