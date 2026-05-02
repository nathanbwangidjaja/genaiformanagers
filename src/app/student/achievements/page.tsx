import { redirect } from "next/navigation";

export default function StudentAchievementsPage() {
  // Achievements live on the progress page for now.
  redirect("/student/progress");
}
