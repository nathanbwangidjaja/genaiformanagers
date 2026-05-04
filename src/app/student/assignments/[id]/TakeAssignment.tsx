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

type ChatMsg = { role: "user" | "assistant"; content: string };

export function TakeAssignment({
  assignmentTitle,
  submissionId,
  studentProfileId,
  studentName,
  questions: questionsProp,
  previousResponses,
  conceptMastery,
}: {
  assignmentTitle: string;
  assignmentId: string;
  submissionId: string;
  studentProfileId: string;
  studentName?: string;
  questions: TakeQuestion[];
  previousResponses: { questionId: string; isCorrect: boolean }[];
  // map of curriculumNodeId -> current masteryLevel (0-1); falls back to 0 if missing
  conceptMastery: Record<string, number>;
}) {
  const router = useRouter();

  // === Adaptive selection state ===
  // We keep the answered questions in their original order, then reorder
  // the remaining queue by |difficulty - targetDifficulty| based on streak.
  const [orderedIds, setOrderedIds] = React.useState<string[]>(() => questionsProp.map((q) => q.id));
  const questionsById = React.useMemo(
    () => Object.fromEntries(questionsProp.map((q) => [q.id, q])),
    [questionsProp],
  );
  const totalCount = questionsProp.length;

  // Compute statuses from previousResponses
  const initialStatuses = React.useMemo(() => {
    const arr: Record<string, "correct" | "wrong" | "current" | "upcoming"> = {};
    for (const q of questionsProp) {
      const prev = previousResponses.find((r) => r.questionId === q.id);
      arr[q.id] = prev ? (prev.isCorrect ? "correct" : "wrong") : "upcoming";
    }
    // Mark the first non-completed as current
    const firstPending = questionsProp.find(
      (q) => arr[q.id] !== "correct" && arr[q.id] !== "wrong",
    );
    if (firstPending) arr[firstPending.id] = "current";
    return arr;
  }, [questionsProp, previousResponses]);
  const [statuses, setStatuses] = React.useState(initialStatuses);

  const startIdx = orderedIds.findIndex(
    (id) => statuses[id] === "current" || statuses[id] === "upcoming",
  );
  const [position, setPosition] = React.useState(startIdx === -1 ? totalCount - 1 : startIdx);

  const [selected, setSelected] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [hintsUsed, setHintsUsed] = React.useState(0);
  const [hintOpen, setHintOpen] = React.useState(false);
  const [questionStartedAt, setQuestionStartedAt] = React.useState<number>(() => Date.now());
  const [feedback, setFeedback] = React.useState<{ delta: number; mastery: number } | null>(null);
  const [allDone, setAllDone] = React.useState(false);

  // Streak count of correct in a row in this session — drives adaptive difficulty
  const [streak, setStreak] = React.useState(0);

  // Tutor panel
  const [tutorOpen, setTutorOpen] = React.useState(false);
  const [tutorMessages, setTutorMessages] = React.useState<ChatMsg[]>([]);
  const [tutorInput, setTutorInput] = React.useState("");
  const [tutorStreaming, setTutorStreaming] = React.useState(false);

  // Tick timer for display
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    const t = setInterval(force, 1000);
    return () => clearInterval(t);
  }, []);

  if (questionsProp.length === 0) {
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

  const currentId = orderedIds[position];
  const q = questionsById[currentId];
  const selectedOption = q.options.find((o) => o.value === selected);
  const isCorrect = !!selectedOption?.correct;

  const elapsedMs = Date.now() - questionStartedAt;
  const mm = Math.floor(elapsedMs / 60000);
  const ss = Math.floor((elapsedMs % 60000) / 1000)
    .toString()
    .padStart(2, "0");

  // Mastery for THIS concept (for tutor calibration). Falls back to a rough
  // running estimate from previous responses on this question's concept.
  const currentMastery = (() => {
    const stored = conceptMastery[q.curriculumNodeId];
    if (typeof stored === "number") return stored;
    // Rough fallback: % correct so far on this concept across previousResponses
    const sameConcept = previousResponses.filter((r) => {
      const qq = questionsById[r.questionId];
      return qq?.curriculumNodeId === q.curriculumNodeId;
    });
    if (sameConcept.length === 0) return 0.3; // default to "developing"
    return sameConcept.filter((r) => r.isCorrect).length / sameConcept.length;
  })();

  const reorderRemaining = (correct: boolean) => {
    // Build new target difficulty
    const newStreak = correct ? streak + 1 : 0;
    setStreak(newStreak);
    let target = q.difficulty;
    if (correct) target = Math.min(5, target + 0.5);
    else target = Math.max(1, target - 0.5);
    if (newStreak >= 2) target = Math.min(5, target + 0.3);

    // Sort the remaining (positions after current) by distance from target,
    // keeping the answered/current ones in place.
    const head = orderedIds.slice(0, position + 1);
    const tail = orderedIds.slice(position + 1);
    if (tail.length <= 1) return; // nothing to reorder
    tail.sort((a, b) => {
      const da = Math.abs(questionsById[a].difficulty - target);
      const db = Math.abs(questionsById[b].difficulty - target);
      return da - db;
    });
    setOrderedIds([...head, ...tail]);
  };

  const onSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    const correct = isCorrect;
    setSubmitted(true);
    setStatuses((prev) => ({ ...prev, [currentId]: correct ? "correct" : "wrong" }));

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

    // Adaptive reorder of upcoming questions
    reorderRemaining(correct);

    setSubmitting(false);
  };

  const onNext = async () => {
    setSelected(null);
    setSubmitted(false);
    setHintOpen(false);
    setHintsUsed(0);
    setFeedback(null);
    setQuestionStartedAt(Date.now());
    setTutorMessages([]);
    setTutorOpen(false);

    if (position + 1 >= totalCount) {
      try {
        await fetch("/api/submissions/complete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ submissionId }),
        });
      } catch {}
      setAllDone(true);
      return;
    }
    const nextId = orderedIds[position + 1];
    setStatuses((prev) => ({ ...prev, [nextId]: "current" }));
    setPosition(position + 1);
  };

  // Tutor send
  const sendTutor = async () => {
    if (!tutorInput.trim() || tutorStreaming) return;
    const userMsg: ChatMsg = { role: "user", content: tutorInput.trim() };
    setTutorMessages((prev) => [...prev, userMsg, { role: "assistant", content: "" }]);
    setTutorInput("");
    setTutorStreaming(true);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: {
            text: q.text,
            code: q.code,
            difficulty: q.difficulty,
            options: q.options,
          },
          mastery: currentMastery,
          userMessage: userMsg.content,
          history: tutorMessages,
          studentName,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg =
          (err as { message?: string }).message ??
          "Tutor unavailable. Make sure ANTHROPIC_API_KEY is set in .env and restart dev server.";
        setTutorMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: `[${msg}]` };
          return next;
        });
        setTutorStreaming(false);
        return;
      }

      // Stream text deltas into the last assistant message
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setTutorMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      }
    } catch (e) {
      console.warn("tutor failed", e);
      setTutorMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: "[Tutor failed. Try again.]",
        };
        return next;
      });
    }
    setTutorStreaming(false);
  };

  if (allDone) {
    const correctCount = Object.values(statuses).filter((s) => s === "correct").length;
    const score = Math.round((correctCount / totalCount) * 100);
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
            {" "}({correctCount}/{totalCount})
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
          Question {position + 1} of {totalCount}
          {streak >= 2 && (
            <span style={{ marginLeft: 12, color: C.orange }}>
              <Icon name="flame" size={12} color={C.orange} strokeWidth={2} /> {streak} streak
            </span>
          )}
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
        {orderedIds.map((id, i) => {
          const s = i === position ? "current" : statuses[id];
          return (
            <div
              key={id}
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
          );
        })}
      </div>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: tutorOpen ? "1fr 380px" : "1fr",
          overflow: "hidden",
        }}
      >
        {/* Question column */}
        <div
          style={{
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
                <Btn
                  kind="ghost"
                  size="md"
                  onClick={() => setTutorOpen(true)}
                  icon={<Icon name="msg" size={14} />}
                >
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
                  {position + 1 >= totalCount ? "Finish" : "Next Question"}
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

        {/* Tutor side panel */}
        {tutorOpen && (
          <div
            style={{
              borderLeft: `1px solid ${C.bg2}`,
              background: C.bg1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: `1px solid ${C.bg2}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 99,
                    background: `${C.violet}15`,
                    border: `1px solid ${C.violet}33`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="sparkle" size={14} color={C.violet} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Cortex Tutor</div>
                  <div style={{ fontSize: 11, color: C.text2 }}>
                    Knows your mastery on this concept
                  </div>
                </div>
              </div>
              <button
                onClick={() => setTutorOpen(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: C.text2 }}
              >
                <Icon name="x" size={16} color={C.text2} />
              </button>
            </div>
            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {tutorMessages.length === 0 && (
                <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5, padding: 8 }}>
                  Ask me anything about this problem. I won&apos;t just give the answer — I&apos;ll
                  help you figure it out.
                </div>
              )}
              {tutorMessages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "92%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    fontSize: 13.5,
                    lineHeight: 1.5,
                    background: m.role === "user" ? `${C.cyan}10` : C.bg2,
                    border: `1px solid ${m.role === "user" ? `${C.cyan}33` : C.border}`,
                    color: C.text0,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.content || (
                    <span style={{ color: C.text2, fontStyle: "italic" }}>thinking…</span>
                  )}
                </div>
              ))}
            </div>
            <div
              style={{
                padding: 14,
                borderTop: `1px solid ${C.bg2}`,
                display: "flex",
                gap: 8,
              }}
            >
              <input
                value={tutorInput}
                onChange={(e) => setTutorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendTutor();
                  }
                }}
                placeholder="Ask about this problem…"
                disabled={tutorStreaming}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  background: C.bg2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  color: C.text0,
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <Btn
                kind="primary"
                size="md"
                onClick={sendTutor}
                disabled={!tutorInput.trim() || tutorStreaming}
                style={{ opacity: tutorInput.trim() && !tutorStreaming ? 1 : 0.5 }}
              >
                Send
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
