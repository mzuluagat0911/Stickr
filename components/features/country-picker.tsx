import { useMemo, useState } from "react";

import { ALL_COUNTRIES_ES, type CountryOption } from "@/lib/data/countries";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CountryPickerProps = {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export function CountryPicker({
  id,
  value,
  onChange,
  disabled,
  label = "País",
  className,
}: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => ALL_COUNTRIES_ES.find((c) => c.code === value.toUpperCase()),
    [value],
  );

  const filtered: CountryOption[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_COUNTRIES_ES.slice(0, 60);
    return ALL_COUNTRIES_ES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    ).slice(0, 80);
  }, [query]);

  const pickerLabel = `${label}${selected ? `: ${selected.name}` : ": país no seleccionado"}`;

  return (
    <div className={cn("relative space-y-2", className)}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <Button
        type="button"
        variant="outline"
        id={id}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={pickerLabel}
        className="focus-visible:ring-ring focus-visible:border-ring border-input h-auto min-h-10 w-full justify-start px-3 py-2 text-left font-normal focus-visible:ring-3"
        onClick={() => setOpen((o) => !o)}
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span>{selected.flag}</span>
            <span className="truncate">{selected.name}</span>
            <span className="text-muted-foreground text-xs">
              {selected.code}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">Elige país</span>
        )}
      </Button>
      {open ? (
        <div className="bg-popover text-popover-foreground absolute z-50 mt-1 w-full rounded-lg border p-2 shadow-md">
          <Input
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2"
            autoFocus
          />
          <ul
            className="max-h-60 overflow-y-auto overscroll-contain text-sm"
            role="listbox"
          >
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left"
                  onClick={() => {
                    onChange(c.code);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span>{c.flag}</span>
                  <span className="truncate">{c.name}</span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {c.code}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
