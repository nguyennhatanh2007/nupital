import * as React from "react";

export function Popover({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}

export function PopoverTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {});
  }

  return <>{children}</>;
}

export function PopoverContent({
  children,
  className,
  align,
}: {
  children: React.ReactNode;
  className?: string;
  align?: string;
}) {
  return <div className={className}>{children}</div>;
}
