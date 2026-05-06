"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { C, FONT_MONO } from "./tokens";
import { Icon } from "./Icon";

type Item =
  | { kind: "class"; id: string; label: string; href: string }
  | { kind: "student"; id: string; label: string; href: string; subtitle: string }
  | { kind: "concept"; id: string; label: string; href: string; subtitle: string };

const KIND_TONE: Record<Item["kind"], { color: string; label: string }> = {
  class: { color: C.cyan, label: "Class" },
  student: { color: C.violet, label: "Student" },
  concept: { color: C.orange, label: "Concept" },
};

export function OmniSearch() {
  const router = useRouter();
  const [items, setItems] = React.useState<Item[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(0);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Lazy-load the index on first focus
  const loadIndex = React.useCallback(async () => {
    if (items !== null) return;
    try {
      const res = await fetch("/api/search");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items as Item[]);
    } catch {
      // ignore
    }
  }, [items]);

  // Cmd/Ctrl-K to focus
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        loadIndex();
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loadIndex]);

  // Click outside to close
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = React.useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 8);
    return items
      .filter(
        (it) =>
          it.label.toLowerCase().includes(q) ||
          ("subtitle" in it && it.subtitle.toLowerCase().includes(q)),
      )
      .slice(0, 12);
  }, [items, query]);

  const go = (it: Item) => {
    setOpen(false);
    setQuery("");
    router.push(it.href);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 14px",
          background: C.bg1,
          border: `1px solid ${open ? C.cyan : C.bg2}`,
          borderRadius: 99,
          fontSize: 13,
          color: C.text2,
          minWidth: 280,
          transition: "border-color 150ms",
        }}
      >
        <Icon name="search" size={14} color={C.text2} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            loadIndex();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelected((s) => Math.min(s + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelected((s) => Math.max(s - 1, 0));
            } else if (e.key === "Enter" && filtered[selected]) {
              e.preventDefault();
              go(filtered[selected]);
            }
          }}
          placeholder="Search students, classes, concepts…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            color: C.text0,
            fontSize: 13,
            outline: "none",
            fontFamily: "inherit",
            padding: 0,
          }}
        />
        <span
          style={{
            fontSize: 11,
            color: C.text3,
            padding: "2px 6px",
            background: C.bg2,
            borderRadius: 4,
            fontFamily: FONT_MONO,
          }}
        >
          ⌘K
        </span>
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: C.bg1,
            border: `1px solid ${C.bg2}`,
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            maxHeight: 360,
            overflow: "auto",
            zIndex: 100,
          }}
        >
          {items === null ? (
            <div style={{ padding: 16, fontSize: 12, color: C.text3 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12, color: C.text3 }}>
              {query ? `No matches for "${query}"` : "Start typing to search."}
            </div>
          ) : (
            filtered.map((it, i) => {
              const tone = KIND_TONE[it.kind];
              const isSel = i === selected;
              return (
                <button
                  key={`${it.kind}-${it.id}`}
                  onClick={() => go(it)}
                  onMouseEnter={() => setSelected(i)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    background: isSel ? C.bg2 : "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    color: C.text0,
                    fontFamily: "inherit",
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: `${tone.color}20`,
                      color: tone.color,
                      fontFamily: FONT_MONO,
                      letterSpacing: "0.04em",
                      flexShrink: 0,
                      minWidth: 50,
                      textAlign: "center",
                    }}
                  >
                    {tone.label}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {it.label}
                    </span>
                    {"subtitle" in it && it.subtitle && (
                      <span
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: C.text3,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {it.subtitle}
                      </span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
