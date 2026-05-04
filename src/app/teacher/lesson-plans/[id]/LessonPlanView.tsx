"use client";
import * as React from "react";
import Link from "next/link";
import { C, FONT_MONO } from "@/components/cortex/tokens";
import { Card, Btn, Badge } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";

export interface LessonPlan {
  title: string;
  targetConcepts: { code: string; name: string }[];
  durationMinutes: number;
  summary: string;
  sections: {
    heading: string;
    durationMinutes: number;
    description: string;
    activities: string[];
  }[];
  practiceProblemSuggestions: {
    code: string;
    description: string;
    difficulty: "Easy" | "Medium" | "Hard";
  }[];
  successCriteria: string[];
}

export function LessonPlanView({
  plan,
  className,
  createdAt,
}: {
  plan: LessonPlan;
  className: string;
  createdAt: string;
}) {
  const print = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <>
      {/* Print-only styles: hide everything except #printable, plain colors */}
      <style>{`
        @media print {
          body { background: white !important; color: #111 !important; }
          .no-print { display: none !important; }
          #printable { color: #111 !important; max-width: 720px; margin: 0; }
          #printable * { color: #111 !important; background: white !important; border-color: #ddd !important; box-shadow: none !important; }
          #printable .cortex-pill { background: #f5f5f5 !important; border: 1px solid #ddd !important; }
        }
      `}</style>

      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <Link href="/teacher/lesson-plans" style={{ color: C.cyan, textDecoration: "none", fontSize: 13 }}>
          ← All lesson plans
        </Link>
        <Btn kind="secondary" size="md" onClick={print} icon={<Icon name="file" size={14} />}>
          Print / Save as PDF
        </Btn>
      </div>

      <div id="printable">
        <Card style={{ padding: 32 }}>
          <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Badge tone="violet">
              <Icon name="sparkle" size={11} color={C.violet} strokeWidth={2} /> AI generated
            </Badge>
            <Badge tone="cyan">{plan.durationMinutes} min</Badge>
            <Badge tone="zinc">{className}</Badge>
            <span style={{ fontSize: 11, color: C.text3, marginLeft: "auto" }}>{createdAt}</span>
          </div>

          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
            {plan.title}
          </div>

          <div className="no-print" style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
            {plan.targetConcepts.map((c) => (
              <Badge key={c.code} tone="cyan" dot>
                {c.code} · {c.name}
              </Badge>
            ))}
          </div>

          <div style={{ fontSize: 14, color: C.text1, lineHeight: 1.6, marginBottom: 28 }}>
            {plan.summary}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {plan.sections.map((s, i) => (
              <div
                key={i}
                style={{
                  background: C.bg2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    {i + 1}. {s.heading}
                  </div>
                  <span
                    className="cortex-pill"
                    style={{
                      fontSize: 11,
                      fontFamily: FONT_MONO,
                      background: C.bg0,
                      border: `1px solid ${C.border}`,
                      color: C.text1,
                      padding: "2px 8px",
                      borderRadius: 99,
                    }}
                  >
                    {s.durationMinutes} min
                  </span>
                </div>
                <div style={{ fontSize: 13, color: C.text1, marginBottom: 12, lineHeight: 1.55 }}>
                  {s.description}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {s.activities.map((a, j) => (
                    <div key={j} style={{ display: "flex", gap: 8, fontSize: 13, color: C.text0, lineHeight: 1.5 }}>
                      <span style={{ color: C.cyan, flexShrink: 0 }}>{j + 1}.</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {plan.practiceProblemSuggestions.length > 0 && (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 28, marginBottom: 12 }}>
                Practice problem suggestions
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {plan.practiceProblemSuggestions.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      background: C.bg2,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 13,
                    }}
                  >
                    <Badge tone="violet" style={{ fontSize: 10 }}>
                      {p.code}
                    </Badge>
                    <Badge
                      tone={p.difficulty === "Easy" ? "green" : p.difficulty === "Medium" ? "amber" : "red"}
                      style={{ fontSize: 10 }}
                    >
                      {p.difficulty}
                    </Badge>
                    <span style={{ color: C.text0 }}>{p.description}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {plan.successCriteria.length > 0 && (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 28, marginBottom: 12 }}>
                Success criteria
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {plan.successCriteria.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: C.text0 }}>
                    <Icon name="check" size={14} color={C.green} strokeWidth={2.5} />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
