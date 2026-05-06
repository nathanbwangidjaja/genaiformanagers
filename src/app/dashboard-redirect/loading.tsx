import { C } from "@/components/cortex/tokens";
import { Logo } from "@/components/cortex/primitives";

export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg0,
        color: C.text0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <Logo size={28} />
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: `3px solid ${C.bg2}`,
          borderTopColor: C.cyan,
          animation: "cortex-spin 0.9s linear infinite",
        }}
      >
        <style>{`@keyframes cortex-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
      <div style={{ fontSize: 14, color: C.text2 }}>Loading your dashboard…</div>
    </div>
  );
}
