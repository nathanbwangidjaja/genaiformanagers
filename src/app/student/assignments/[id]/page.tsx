import { notFound } from "next/navigation";
import { requireStudent } from "@/server/auth";
import { prisma } from "@/server/db";
import { startSubmission } from "@/server/actions";
import { TakeAssignment } from "./TakeAssignment";

export default async function TakeAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await requireStudent();
  const studentProfileId = student.studentProfile!.id;

  const assignment = await prisma.assignment.findFirst({
    where: { id, class: { enrollments: { some: { studentId: student.id } } } },
    include: {
      class: true,
      questions: {
        orderBy: { orderIndex: "asc" },
        include: { question: { include: { curriculumNode: true } } },
      },
    },
  });
  if (!assignment) notFound();

  // Make sure there's an open submission
  const submission = await startSubmission(assignment.id);

  // Pull existing responses so the student doesn't redo answered questions
  const responses = await prisma.submissionResponse.findMany({
    where: { submissionId: submission.id },
  });

  // Serialize question content (jsonb)
  const questions = assignment.questions.map((aq) => {
    const content = (aq.question.content ?? {}) as { text?: string; options?: { value: string; correct: boolean }[] };
    const hints = (aq.question.hints ?? []) as string[];
    return {
      id: aq.question.id,
      curriculumNodeId: aq.question.curriculumNodeId,
      code: aq.question.curriculumNode.code,
      difficulty: aq.question.difficulty,
      text: content.text ?? "",
      options: content.options ?? [],
      hints,
      expectedTimeSec: aq.question.expectedTimeSec,
    };
  });

  return (
    <TakeAssignment
      assignmentTitle={assignment.title}
      assignmentId={assignment.id}
      submissionId={submission.id}
      studentProfileId={studentProfileId}
      questions={questions}
      previousResponses={responses.map((r) => ({
        questionId: r.questionId,
        isCorrect: r.isCorrect,
      }))}
    />
  );
}
