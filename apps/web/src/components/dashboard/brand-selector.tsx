"use client";

import * as React from "react";
import { Building2, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandStore } from "@/stores/brand-store";

export function BrandSelector(): React.JSX.Element {
  const selectedBrandId = useBrandStore((s) => s.selectedBrandId);
  const brands = useBrandStore((s) => s.brands);
  const loaded = useBrandStore((s) => s.loaded);
  const setSelectedBrandId = useBrandStore((s) => s.setSelectedBrandId);
  const fetchBrands = useBrandStore((s) => s.fetchBrands);

  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!loaded) void fetchBrands();
  }, [loaded, fetchBrands]);

  React.useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selected = brands.find((b) => b.id === selectedBrandId) ?? null;
  const label = selected?.name ?? "All brands";

  function handleSelect(id: string | null): void {
    setSelectedBrandId(id);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative w-[200px] shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select brand"
      >
        <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <span className="flex-1 truncate text-left font-medium">{label}</span>
        <ChevronsUpDown
          className="h-3.5 w-3.5 shrink-0 text-slate-400"
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 z-50 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10"
          role="listbox"
        >
          <button
            type="button"
            role="option"
            aria-selected={selectedBrandId === null}
            onClick={() => handleSelect(null)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span className="flex-1 truncate text-left">All brands</span>
            {selectedBrandId === null && (
              <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
            )}
          </button>

          {brands.map((brand) => {
            const active = brand.id === selectedBrandId;
            return (
              <button
                key={brand.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => handleSelect(brand.id)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
                  active
                    ? "text-blue-700 bg-blue-50/60"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <span className="flex-1 truncate text-left">{brand.name}</span>
                {active && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
