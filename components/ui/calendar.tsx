import * as React from "react";

export type CalendarProps = {
  mode?: "single" | "range";
  selected?: Date | null;
  onSelect?: (date: Date) => void;
  initialFocus?: boolean;
};

export function Calendar({ selected, onSelect }: CalendarProps) {
  return (
    <input
      type="date"
      value={selected ? selected.toISOString().slice(0, 10) : ""}
      onChange={(event) => {
        const value = event.target.value;
        if (!value) return;
        const date = new Date(value);
        onSelect?.(date);
      }}
      className="w-full border rounded p-2"
    />
  );
}
