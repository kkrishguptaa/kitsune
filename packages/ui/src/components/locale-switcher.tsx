import type * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../primitives/select.tsx";

export interface Locale {
  code: string;
  label: string;
  isDefault?: boolean;
}

export interface LocaleSwitcherProps {
  locales: readonly Locale[];
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

export function LocaleSwitcher({
  locales,
  value,
  onChange,
  className,
}: LocaleSwitcherProps): React.ReactElement {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-[180px]"}>
        <SelectValue placeholder="Locale" />
      </SelectTrigger>
      <SelectContent>
        {locales.map((l) => (
          <SelectItem key={l.code} value={l.code}>
            {l.label} {l.isDefault ? "(default)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
