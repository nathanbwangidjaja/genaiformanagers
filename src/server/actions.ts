"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { requireTeacher, requireStudent, generateInviteCode } from "./auth";

// =================== CLASSES ===================

export async function createClass(formData: FormData) {
  const teacher = await requireTeacher();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Class name required");

  // Generate a unique invite code
  let code = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.class.findUnique({ where: { inviteCode: code } });
    if (!existing) break;
    code = generateInviteCode();
  }

  const cls = await prisma.class.create({
    data: {
      name,
      gradeLevel: 7,
      teacherId: teacher.id,
      inviteCode: code,
    },
  });
  revalidatePath("/teacher/dashboard");
  revalidatePath("/teacher/classes");
  redirect(`/teacher/classes/${cls.id}`);
}

export async function joinClass(formData: FormData) {
  const student = await requireStudent();
  const codeRaw = String(formData.get("inviteCode") ?? "")
    .trim()
    .toUpperCase();
  if (!codeRaw) throw new Error("Invite code required");

  const cls = await prisma.class.findUnique({ where: { inviteCode: codeRaw } });
  if (!cls) throw new Error("No class found with that invite code");

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: cls.id, studentId: student.id } },
    create: { classId: cls.id, studentId: student.id },
    update: {},
  });

  revalidatePath("/student/dashboard");
  revalidatePath("/student/assignments");
  redirect("/student/dashboard");
}

// =================== ASSIGNMENTS ===================

export async function createAssignment(formData: FormData) {
  const teacher = await requireTeacher();
  const classId = String(formData.get("classId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const questionIds = formData.getAll("questionIds").map((q) => String(q));

  if (!classId) throw new Error("Class is required");
  if (!title) throw new Error("Title is required");
  if (questionIds.length === 0) throw new Error("Pick at least one question");

  // Verify the teacher owns this class
  const cls = await prisma.class.findFirst({ where: { id: classId, teacherId: teacher.id } });
  if (!cls) throw new Error("Class not found");

  const assignment = await prisma.assignment.create({
    data: {
      classId,
      title,
      description: description || null,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      questions: {
        create: questionIds.map((qid, idx) => ({ questionId: qid, orderIndex: idx })),
      },
    },
  });
  revalidatePath("/teacher/assignments");
  revalidatePath(`/teacher/classes/${classId}`);
  redirect(`/teacher/assignments/${assignment.id}`);
}

// =================== SUBMISSIONS ===================

export async function startSubmission(assignmentId: string) {
  const student = await requireStudent();
  const studentProfileId = student.studentProfile!.id;
  // Reuse incomplete submission if any
  const existing = await prisma.submission.findFirst({
    where: { assignmentId, studentId: studentProfileId, completedAt: null },
  });
  if (existing) return existing;
  return prisma.submission.create({
    data: { assignmentId, studentId: studentProfileId },
  });
}
