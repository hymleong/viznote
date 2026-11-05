import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Material 3 buttons: pill-shaped, with filled / tonal / outlined / text variants. */
const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-[0.01em] transition-[background-color,box-shadow,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary hover:shadow-elevation-1 hover:brightness-110",
        tonal: "bg-secondary-container text-on-secondary-container hover:shadow-elevation-1",
        outline: "border border-outline-variant bg-transparent text-primary hover:bg-primary/8",
        ghost: "text-primary hover:bg-primary/8",
        destructive: "bg-error text-surface hover:shadow-elevation-1 hover:brightness-110",
      },
      size: { default: "h-10 px-6", sm: "h-8 px-4 text-[13px]", lg: "h-12 px-8 text-base", icon: "size-10" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
