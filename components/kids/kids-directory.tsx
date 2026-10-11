"use client";

import { useMemo, useState } from "react";
import type { Kid } from "@/types/kid";
import { SearchIcon } from "@/components/shared/icons";
import KidCard from "./kid-card";

export default function KidsDirectory({ kids }: { kids: Kid[] }) {
  const [query, setQuery] = useState("");

  const filteredKids = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return kids;
    return kids.filter((kid) => kid.name.toLowerCase().includes(q));
  }, [kids, query]);

  return (
    <div>
      <div className="mb-[22px] flex items-center gap-[11px] rounded-[14px] border border-border bg-surface px-4 py-3">
        <SearchIcon className="h-[18px] w-[18px] flex-none text-[#B0A290]" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar niño…"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-[#B6A99B]"
        />
      </div>

      <div className="mb-[14px] flex items-center gap-3">
        <span className="text-[12.5px] font-extrabold tracking-[.8px] text-ink">
          SALA SOLES
        </span>
        <span className="text-[13px] text-ink-muted">{kids.length} niños</span>
        <span className="h-px flex-1 bg-divider" />
      </div>

      {filteredKids.length === 0 ? (
        <p className="py-10 text-center text-[15px] text-ink-muted">
          Sin resultados
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
          {filteredKids.map((kid) => (
            <KidCard key={kid.id} kid={kid} />
          ))}
        </div>
      )}
    </div>
  );
}
