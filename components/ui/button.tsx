import * as React from "react";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "outline" | "secondary" | "destructive";
};

export function Button({ className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={className} {...props} />;
}
