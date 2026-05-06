import { notFound } from "next/navigation";
import { TeacherShell } from "@/components/cortex/shells";
import { requireTeacher } from "@/server/auth";
import { prisma } from "@/server/db";
import { LessonPlanView } from "./LessonPlanView";

export const dynamic = "force-dynamic";

export default async function LessonPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireTeacher();

  const plan = await prisma.lessonPlan.findFirst({
    where: { id, teacherId: teacher.id },
    include: { class: true },
  });
  if (!plan) notFound();

  return (
    <TeacherShell
      breadcrumb={["Lesson Plans", plan.title]}
      teacherName={`${teacher.firstName} ${teacher.lastName}`.trim() || "Teacher"}
    >
      <LessonPlanView
        plan={
          plan.content as unknown as {
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
        }
        className={plan.class?.name ?? "(no class)"}
        createdAt={plan.createdAt.toLocaleString()}
        classId={plan.classId ?? undefined}
        previousFocusNotes={plan.focusNotes ?? undefined}
      />
    </TeacherShell>
  );
}
