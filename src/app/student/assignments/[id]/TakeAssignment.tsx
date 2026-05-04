"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { C, FONT_MONO } from "@/components/cortex/tokens";
import { Card, Btn, Badge } from "@/components/cortex/primitives";
import { Icon } from "@/components/cortex/Icon";

export type TakeQuestion = {
  id: string;
  curriculumNodeId: string;
  code: string;
  difficulty: number;
  text: string;
  options: { value: string; correct: boolean }[];
  hints: string[];
  expectedTimeSec: number;
};

export function TakeAssignment({
  assignmentTitle,
  assignmentId,
  submissionId,
  studentProfileId,
  questions,
  previousResponses,
}: {
  assignmentTitle: string;
  assignmentId: string;
  submissionId: string;
  studentProfileId: string;
  questions: TakeQuestion[];
  previousResponses: { questionId: string; isCorrect: boolean }[];
}) {
  const router = useRouter();
  // Compute initial statuses from previous responses
  const initialStatuses: ("correct" | "wrong" | "current" | "upcoming")[] = questions.map((q, i) => {
    const prev = previousResponses.find((r) => r.questionId === q.id);
    if (prev) return prev.isCorrect ? "correct" : "wrong";
    return i === 0 ? "current" : "upcoming";
  });
  // Set the first non-completed question as current
  const startIdx = (() => {
    const i = initialStatuses.findIndex((s) => s !== "correct" && s !== "wrong");
    return i === -1 ? questions.length - 1 : i;
  })();
  if (initialStatuses[startIdx] === "upcoming") initialStatuses[startIdx] = "current";

  const [questionIndex, setQuestionIndex] = React.useState(startIdx);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [hintsUsed, setHintsUsed] = React.useState(0);
  const [hintOpen, setHintOpen] = React.useState(false);
  const [statuses, setStatuses] = React.useState(initialStatuses);
  const [questionStartedAt, setQuestionStartedAt] = React.useState<number>(() => Date.now());
  const [feedback, setFeedback] = React.useState<{ delta: number; mastery: number } | null>(null);
  const [allDone, setAllDone] = React.useState(false);

  // Tick timer for display
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    const t = setInterval(force, 1000);
    return () => clearInterval(t);
  }, []);

  if (questions.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg0, color: C.text0, padding: 60 }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <Icon name="clipboard" size={28} color={C.text3} />
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 14 }}>
            This assignment has no questions
          </div>
          <Link href="/student/assignments" style={{ color: C.cyan, textDecoration: "none" }}>
            Back to assignments
          </Link>
        </div>
      </div>
    );
  }

  const q = questions[questionIndex];
  const selectedOption = q.options.find((o) => o.value === selected);
  const isCorrect = !!selectedOption?.correct;

  const elapsedMs = Date.now() - questionStartedAt;
  const mm = Math.floor(elapsedMs / 60000);
  const ss = Math.floor((elapsedMs % 60000) / 1000)
    .toString()
    .padStart(2, "0");

  const onSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    const correct = isCorrect;
    setSubmitted(true);
    setStatuses((prev) => {
      const next = [...prev];
      next[questionIndex] = correct ? "correct" : "wrong";
      return next;
    });

    try {
      const res = await fetch("/api/interactions/attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentId: studentProfileId,
          questionId: q.id,
          curriculumNodeId: q.curriculumNodeId,
          isCorrect: correct,
          timeSpentMs: elapsedMs,
          hintsUsed,
          attemptNumber: 1,
          errorType: !correct ? "conceptual" : null,
          submissionId,
          submissionAnswer: selected,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { newMastery: number; delta: number };
        setFeedback({ mastery: data.newMastery, delta: data.delta });
      }
    } catch (e) {
      console.warn("attempt failed", e);
    }
    setSubmitting(false);
  };

  const onNext = async () => {
    setSelected(null);
    setSubmitted(false);
    setHintOpen(false);
    setHintsUsed(0);
    setFeedback(null);
    setQuestionStartedAt(Date.now());
    if (questionIndex + 1 >= questions.length) {
      // Mark submission complete
      try {
        await fetch("/api/submissions/complete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ submissionId }),
        });
      } catch {
        // ignore
      }
      setAllDone(true);
      return;
    }
    setQuestionIndex((i) => i + 1);
    setStatuses((prev) => {
      const next = [...prev];
      if (next[questionIndex + 1] === "upcoming") next[questionIndex + 1] = "current";
      return next;
    });
  };

  if (allDone) {
    const correctCount = statuses.filter((s) => s === "correct").length;
    const score = Math.round((correctCount / statuses.length) * 100);
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg0,
          color: C.text0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 99,
              background: `${C.green}15`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Icon name="check" size={36} color={C.green} strokeWidth={3} />
          </div>
          <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em" }}>
            Assignment Complete
          </div>
          <div style={{ fontSize: 16, color: C.text1, marginTop: 8 }}>
            You scored{" "}
            <span style={{ color: C.cyan, fontWeight: 600, fontFamily: FONT_MONO }}>{score}%</span>
            {" "}({correctCount}/{statuses.length})
          </div>
          <div style={{ marginTop: 32, display: "flex", gap: 12, justifyContent: "center" }}>
            <Btn
              kind="primary"
              size="md"
              onClick={() => router.push("/student/dashboard")}
              iconRight={<Icon name="arrow" size={14} color={C.bg0} />}
            >
              Back to Dashboard
            </Btn>
            <Btn kind="secondary" size="md" onClick={() => router.push("/student/progress")}>
              View My Progress
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  const diffLabel = q.difficulty < 2.5 ? "Easy" : q.difficulty < 3.8 ? "Medium" : "Hard";
  const diffTone: "green" | "amber" | "red" =
    q.difficulty < 2.5 ? "green" : q.difficulty < 3.8 ? "amber" : "red";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg0,
        color: C.text0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
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
          <span style={{ fontSize: 14, fontWeight: 500 }}>{assignmentTitle}</span>
        </Link>
        <div style={{ fontSize: 13, color: C.text2, fontFamily: FONT_MONO }}>
          Question {questionIndex + 1} of {questions.length}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: C.text2, fontFamily: FONT_MONO }}>
            {mm}:{ss}
          </span>
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
              <Badge tone={diffTone}>{diffLabel}</Badge>
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

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {q.options.map((o, i) => {
                const label = String.fromCharCode(65 + i);
                const isSel = selected === o.value;
                const showCorrect = submitted && o.correct;
                const showWrong = submitted && isSel && !o.correct;
                const baseColor = showCorrect
                  ? C.green
                  : showWrong
                    ? C.red
                    : isSel
                      ? C.cyan
                      : C.border;
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
                      background: showCorrect
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
                      {label}
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
                    {showCorrect && <Icon name="check" size={16} color={C.green} strokeWidth={3} />}
                    {showWrong && <Icon name="x" size={16} color={C.red} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>

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
                    {feedback
                      ? `Mastery is now ${Math.round(feedback.mastery * 100)}% (${
                          feedback.delta >= 0 ? "+" : ""
                        }${Math.round(feedback.delta * 100)}%)`
                      : isCorrect
                        ? "Updating mastery…"
                        : "The correct answer is highlighted above."}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {hintOpen && q.hints[hintsUsed - 1] && (
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
                    Hint {hintsUsed} of {q.hints.length}
                  </div>
                  <div style={{ fontSize: 14, color: C.text1, lineHeight: 1.55 }}>
                    {q.hints[hintsUsed - 1]}
                  </div>
                </div>
              </div>
            </Card>
          )}

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
                disabled={hintsUsed >= q.hints.length}
                onClick={() => {
                  if (hintsUsed < q.hints.length) {
                    setHintsUsed((n) => n + 1);
                    setHintOpen(true);
                  }
                }}
                icon={<Icon name="bulb" size={14} />}
              >
                Hint ({hintsUsed} of {q.hints.length})
              </Btn>
            </div>
            {submitted ? (
              <Btn
                kind="primary"
                size="lg"
                onClick={onNext}
                iconRight={<Icon name="arrow" size={14} color={C.bg0} />}
              >
                {questionIndex + 1 >= questions.length ? "Finish" : "Next Question"}
              </Btn>
            ) : (
              <Btn
                kind="primary"
                size="lg"
                onClick={onSubmit}
                disabled={!selected || submitting}
                style={{ opacity: selected ? 1 : 0.5 }}
                iconRight={<Icon name="arrow" size={14} color={C.bg0} />}
              >
                {submitting ? "Submitting…" : "Submit Answer"}
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
