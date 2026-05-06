"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { C } from "./tokens";
import { Avatar } from "./primitives";
import { Icon } from "./Icon";

export function UserMenu({
  name,
  role,
}: {
  name: string;
  role: "Teacher" | "Student";
}) {
  const router = useRouter();
  const { signOut } = useClerk();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={name}
        aria-label="User menu"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: open ? C.bg2 : "transparent",
          border: `1px solid ${open ? C.cyan : C.bg2}`,
          borderRadius: 99,
          padding: 3,
          cursor: "pointer",
          transition: "all 150ms",
        }}
      >
        <Avatar name={name} size={30} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 220,
            background: C.bg1,
            border: `1px solid ${C.bg2}`,
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.bg2}` }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text0 }}>{name}</div>
            <div style={{ fontSize: 11, color: C.text2 }}>{role}</div>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: "transparent",
              border: "none",
              color: C.text0,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.bg2)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Icon name="x" size={14} color={C.text1} strokeWidth={2} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
