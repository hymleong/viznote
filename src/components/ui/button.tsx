import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Apple-style pill buttons: filled blue primary, gray-fill secondary, plain text variants. */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-[background-color,color,opacity,scale] duration-200 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent-fill text-on-accent hover:bg-accent-fill-hover",
        secondary: "bg-fill text-label hover:bg-fill-strong",
        outline: "border border-separator-strong bg-transparent text-label hover:bg-fill",
        ghost: "text-accent hover:bg-fill",
        plain: "text-label-2 hover:bg-fill hover:text-label",
        destructive: "bg-fill text-bad hover:bg-bad/12",
      },
      size: {
        default: "h-9 px-4 text-subhead",
        sm: "h-8 px-3 text-footnote",
        lg: "h-11 px-6 text-headline",
        icon: "size-9",
        "icon-sm": "size-8",
      },
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
