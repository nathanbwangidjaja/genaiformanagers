"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { C } from "@/components/cortex/tokens";
import { Card, Btn } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";

export function LessonPlanGenerator({
  classes,
}: {
  classes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [classId, setClassId] = React.useState(classes[0]?.id ?? "");
  const [focusNotes, setFocusNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const generate = async () => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lesson-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ classId, focusNotes: focusNotes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Failed");
        setLoading(false);
      } else {
        router.push(`/teacher/lesson-plans/${data.id}`);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setLoading(false);
    }
  };

  if (classes.length === 0) {
    return (
      <Card style={{ padding: 60, textAlign: "center" }}>
        <Icon name="users" size={28} color={C.text3} />
        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 14 }}>No classes yet</div>
        <div style={{ fontSize: 13, color: C.text2, marginTop: 6 }}>
          Create a class first, then come back here.
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card style={{ padding: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 180px", gap: 14, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 12, color: C.text2, display: "block", marginBottom: 6 }}>
              Class
            </label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: C.bg2,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.text0,
                fontSize: 14,
                outline: "none",
              }}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text2, display: "block", marginBottom: 6 }}>
              Focus notes (optional)
            </label>
            <input
              value={focusNotes}
              onChange={(e) => setFocusNotes(e.target.value)}
              placeholder="e.g. Yesterday's quiz showed they're guessing on word problems"
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: C.bg2,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.text0,
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>
          <Btn
            kind="primary"
            size="md"
            onClick={generate}
            disabled={loading || !classId}
            style={{ opacity: loading || !classId ? 0.6 : 1 }}
            iconRight={
              loading ? undefined : <Icon name="sparkle" size={14} color={C.bg0} strokeWidth={2} />
            }
          >
            {loading ? "Generating…" : "Generate Plan"}
          </Btn>
        </div>
      </Card>

      {error && (
        <Card
          style={{
            padding: 18,
            background: `${C.red}06`,
            border: `1px solid ${C.red}33`,
            marginTop: 14,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Icon name="x" size={16} color={C.red} />
            <div style={{ fontSize: 13, color: C.text0 }}>{error}</div>
          </div>
        </Card>
      )}
    </div>
  );
}
