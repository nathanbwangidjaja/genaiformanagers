"use client";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { C, FONT_MONO } from "@/components/cortex/tokens";
import { Card, Btn, Badge } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";

type Question = {
  code: string;
  difficulty: "Easy" | "Medium" | "Hard";
  text: React.ReactNode;
  options: { label: string; value: string; correct: boolean }[];
  hint: string;
};

const QUESTIONS: Question[] = [
  {
    code: "7.RP.1",
    difficulty: "Easy",
    text: "A car travels 240 miles in 4 hours. What is its unit rate (miles per hour)?",
    options: [
      { label: "A", value: "40 mph", correct: false },
      { label: "B", value: "60 mph", correct: true },
      { label: "C", value: "80 mph", correct: false },
      { label: "D", value: "120 mph", correct: false },
    ],
    hint: "Divide total miles by total hours.",
  },
  {
    code: "7.RP.2b",
    difficulty: "Medium",
    text: (
      <>
        At a bookstore, 3 notebooks cost $7.50.<br />
        At the same rate, how much would <span style={{ color: C.cyan }}>8 notebooks</span> cost?
      </>
    ),
    options: [
      { label: "A", value: "$18.00", correct: false },
      { label: "B", value: "$20.00", correct: true },
      { label: "C", value: "$22.50", correct: false },
      { label: "D", value: "$24.00", correct: false },
    ],
    hint: "Find the unit rate first — what does one notebook cost? Then multiply by 8.",
  },
  {
    code: "7.RP.3",
    difficulty: "Hard",
    text: "A jacket is on sale for 20% off. After tax (8%), the final price is $43.20. What was the original price?",
    options: [
      { label: "A", value: "$45.00", correct: false },
      { label: "B", value: "$48.00", correct: false },
      { label: "C", value: "$50.00", correct: true },
      { label: "D", value: "$54.00", correct: false },
    ],
    hint: "Work backwards: undo the tax first, then undo the discount.",
  },
];

const TOTAL_QUESTIONS = 10;

export default function TakeAssignmentPage() {
  const params = useParams<{ id: string }>();
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [hintsUsed, setHintsUsed] = React.useState(0);
  const [hintOpen, setHintOpen] = React.useState(false);
  const [statuses, setStatuses] = React.useState<("correct" | "wrong" | "current" | "upcoming")[]>(
    () => ["current", ...Array.from({ length: TOTAL_QUESTIONS - 1 }, () => "upcoming" as const)],
  );
  const [startedAt] = React.useState<number>(() => Date.now());
  const [, force] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    const t = setInterval(force, 1000);
    return () => clearInterval(t);
  }, []);

  const elapsedMs = Date.now() - startedAt;
  const mm = Math.floor(elapsedMs / 60000);
  const ss = Math.floor((elapsedMs % 60000) / 1000)
    .toString()
    .padStart(2, "0");

  const q = QUESTIONS[questionIndex % QUESTIONS.length];
  const selectedOption = q.options.find((o) => o.value === selected);
  const isCorrect = !!selectedOption?.correct;

  const onSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
    setStatuses((prev) => {
      const next = [...prev];
      next[questionIndex] = isCorrect ? "correct" : "wrong";
      return next;
    });

    // Fire-and-forget: tell the backend about the attempt so mastery & behavioral
    // scores update. Requires an active student session; if endpoint 404s/400s
    // (mock mode), silently ignore.
    const studentId = typeof window !== "undefined" ? window.localStorage.getItem("cortex_student_id") : null;
    if (studentId) {
      fetch("/api/interactions/attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentId,
          questionId: `mock-${q.code}`,
          curriculumNodeId: `mock-${q.code}`,
          isCorrect,
          timeSpentMs: Date.now() - startedAt,
          hintsUsed,
          attemptNumber: 1,
          errorType: !isCorrect ? "conceptual" : null,
        }),
      }).catch(() => {
        // mock mode — no backend, ignore
      });
    }
  };

  const onNext = () => {
    if (questionIndex + 1 >= TOTAL_QUESTIONS) {
      // All done — keep on last question for now
      return;
    }
    setQuestionIndex((i) => i + 1);
    setSelected(null);
    setSubmitted(false);
    setHintOpen(false);
    setStatuses((prev) => {
      const next = [...prev];
      if (next[questionIndex + 1] === "upcoming") next[questionIndex + 1] = "current";
      return next;
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg0,
        display: "flex",
        flexDirection: "column",
        color: C.text0,
      }}
    >
      {/* Slim top bar */}
      <div
        style={{
          height: 56,
          borderBottom: `1px solid ${C.bg2}`,
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Link
          href="/student/assignments"
          style={{
            textDecoration: "none",
            color: C.text0,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <Icon name="arrowL" size={16} color={C.text1} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {params?.id === "linear" ? "Linear Expressions Practice" : "Ratios Assessment"}
          </span>
        </Link>
        <div style={{ fontSize: 13, color: C.text2, fontFamily: FONT_MONO }}>
          Question {questionIndex + 1} of {TOTAL_QUESTIONS}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: C.text2, fontFamily: FONT_MONO }}>
            {mm}:{ss}
          </span>
          <Btn kind="ghost" size="sm" icon={<Icon name="flag" size={13} />}>
            Flag
          </Btn>
        </div>
      </div>

      {/* Progress segments */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "8px 32px",
          borderBottom: `1px solid ${C.bg2}`,
          flexShrink: 0,
        }}
      >
        {statuses.map((s, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 99,
              background:
                s === "correct"
                  ? C.cyan
                  : s === "wrong"
                  ? C.orange
                  : s === "current"
                  ? C.text0
                  : C.bg2,
            }}
          />
        ))}
      </div>

      {/* Main */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          overflow: "auto",
          padding: "48px 32px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 720 }}>
          <Card style={{ padding: 40, borderRadius: 18 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <Badge tone="zinc" style={{ fontSize: 10 }}>
                MULTIPLE CHOICE
              </Badge>
              <Badge tone="violet">{q.code}</Badge>
              <Badge tone={q.difficulty === "Easy" ? "green" : q.difficulty === "Medium" ? "amber" : "red"}>
                {q.difficulty}
              </Badge>
            </div>
            <div
              style={{
                fontSize: 22,
                lineHeight: 1.45,
                fontWeight: 500,
                color: C.text0,
                marginBottom: 28,
              }}
            >
              {q.text}
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {q.options.map((o) => {
                const isSel = selected === o.value;
                const showCorrect = submitted && o.correct;
                const showWrong = submitted && isSel && !o.correct;
                const baseColor = showCorrect ? C.green : showWrong ? C.red : isSel ? C.cyan : C.border;
                return (
                  <button
                    key={o.value}
                    onClick={() => !submitted && setSelected(o.value)}
                    disabled={submitted}
                    style={{
                      padding: "16px 20px",
                      borderRadius: 12,
                      fontSize: 16,
                      fontFamily: FONT_MONO,
                      background:
                        showCorrect
                          ? `${C.green}06`
                          : showWrong
                          ? `${C.red}06`
                          : isSel
                          ? `${C.cyan}06`
                          : C.bg2,
                      border: `1px solid ${baseColor}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      cursor: submitted ? "default" : "pointer",
                      boxShadow: isSel && !submitted ? `0 0 0 3px ${C.cyan}15` : "none",
                      transition: "all 150ms",
                      width: "100%",
                      textAlign: "left",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: isSel || showCorrect ? baseColor : "transparent",
                        border: `1.5px solid ${isSel || showCorrect || showWrong ? baseColor : C.text2}`,
                        color: isSel || showCorrect ? C.bg0 : C.text2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {o.label}
                    </div>
                    <span
                      style={{
                        flex: 1,
                        color: showCorrect ? C.green : showWrong ? C.red : isSel ? C.text0 : C.text1,
                        fontWeight: isSel || showCorrect ? 600 : 400,
                      }}
                    >
                      {o.value}
                    </span>
                    {showCorrect && (
                      <Icon name="check" size={16} color={C.green} strokeWidth={3} />
                    )}
                    {showWrong && <Icon name="x" size={16} color={C.red} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>

            {/* Result feedback */}
            {submitted && (
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: 12,
                  background: isCorrect ? `${C.green}08` : `${C.red}08`,
                  border: `1px solid ${isCorrect ? C.green : C.red}33`,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Icon
                  name={isCorrect ? "check" : "x"}
                  size={18}
                  color={isCorrect ? C.green : C.red}
                  strokeWidth={3}
                />
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: isCorrect ? C.green : C.red,
                    }}
                  >
                    {isCorrect ? "Correct!" : "Not quite"}
                  </div>
                  <div style={{ fontSize: 12, color: C.text1, marginTop: 2 }}>
                    {isCorrect
                      ? `Mastery +${5 - hintsUsed * 2 > 0 ? 5 - hintsUsed * 2 : 1}%`
                      : "The correct answer is highlighted above. Review the hint and try the next one."}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Hint panel */}
          {hintOpen && (
            <Card
              style={{
                marginTop: 14,
                padding: 20,
                background: `${C.amber}05`,
                border: `1px solid ${C.amber}33`,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <Icon name="bulb" size={18} color={C.amber} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: C.amber,
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Hint {hintsUsed} of 3
                  </div>
                  <div style={{ fontSize: 14, color: C.text1, lineHeight: 1.55 }}>{q.hint}</div>
                </div>
              </div>
            </Card>
          )}

          {/* Action bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 18,
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <Btn
                kind="ghost"
                size="md"
                onClick={() => {
                  if (hintsUsed < 3) {
                    setHintsUsed((n) => n + 1);
                    setHintOpen(true);
                  }
                }}
                icon={<Icon name="bulb" size={14} />}
              >
                Hint ({hintsUsed} of 3)
              </Btn>
              <Btn kind="ghost" size="md" icon={<Icon name="msg" size={14} />}>
                Ask Tutor
              </Btn>
            </div>
            {submitted ? (
              <Btn
                kind="primary"
                size="lg"
                onClick={onNext}
                iconRight={<Icon name="arrow" size={14} color={C.bg0} />}
              >
                Next Question
              </Btn>
            ) : (
              <Btn
                kind="primary"
                size="lg"
                onClick={onSubmit}
                disabled={!selected}
                style={{ opacity: selected ? 1 : 0.5 }}
                iconRight={<Icon name="arrow" size={14} color={C.bg0} />}
              >
                Submit Answer
              </Btn>
            )}
          </div>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <span
              style={{
                fontSize: 13,
                color: C.violet,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="sparkle" size={12} color={C.violet} strokeWidth={2} />I want to learn more
              about this topic
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
