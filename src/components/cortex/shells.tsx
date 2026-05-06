"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { C } from "./tokens";
import { Logo, Avatar, Badge } from "./primitives";
import { Icon, type IconName } from "./Icon";
import { OmniSearch } from "./OmniSearch";
import { UserMenu } from "./UserMenu";

type NavItem = { icon: IconName; label: string; href: string; badge?: string };

const TEACHER_NAV: NavItem[] = [
  { icon: "dashboard", label: "Dashboard", href: "/teacher/dashboard" },
  { icon: "users", label: "Classes", href: "/teacher/classes" },
  { icon: "clipboard", label: "Assignments", href: "/teacher/assignments" },
  { icon: "book", label: "Curriculum", href: "/teacher/curriculum" },
  { icon: "bulb", label: "Lesson Plans", href: "/teacher/lesson-plans", badge: "AI" },
];

export function TeacherSidebar({ teacherName = "Ms. Johnson", orgName = "Lincoln ISD" }: { teacherName?: string; orgName?: string }) {
  const pathname = usePathname();
  return (
    <div
      style={{
        background: C.bg1,
        borderRight: `1px solid ${C.bg2}`,
        display: "flex",
        flexDirection: "column",
        padding: 16,
        height: "100%",
      }}
    >
      <div style={{ padding: "6px 8px 24px" }}>
        <Link href="/teacher/dashboard" style={{ textDecoration: "none" }}>
          <Logo size={20} />
        </Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {TEACHER_NAV.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "9px 12px",
                borderRadius: 8,
                position: "relative",
                background: isActive ? `${C.cyan}10` : "transparent",
                color: isActive ? C.cyan : C.text1,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 150ms",
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    left: -16,
                    top: 8,
                    bottom: 8,
                    width: 2,
                    background: C.cyan,
                    borderRadius: 99,
                  }}
                />
              )}
              <Icon name={item.icon} size={18} color={isActive ? C.cyan : C.text1} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <Badge tone="cyan" style={{ fontSize: 10, padding: "2px 6px" }}>
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </div>
      <div style={{ marginTop: "auto", padding: 8, borderTop: `1px solid ${C.bg2}`, paddingTop: 16 }}>
        <div
          style={{
            fontSize: 11,
            color: C.text3,
            marginBottom: 8,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {orgName}
        </div>
        <SidebarUserStrip teacherName={teacherName} />
      </div>
    </div>
  );
}

function SidebarUserStrip({ teacherName }: { teacherName: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Avatar name={teacherName} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {teacherName}
        </div>
        <div style={{ fontSize: 11, color: C.text2 }}>Teacher</div>
      </div>
    </div>
  );
}

export function Topbar({
  title,
  breadcrumb,
  rightExtra,
  teacherName = "Ms. Johnson",
}: {
  title?: string;
  breadcrumb?: string[];
  rightExtra?: React.ReactNode;
  teacherName?: string;
}) {
  return (
    <div
      style={{
        height: 64,
        borderBottom: `1px solid ${C.bg2}`,
        padding: "0 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: C.bg0,
        flexShrink: 0,
      }}
    >
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <div
            style={{
              fontSize: 12,
              color: C.text2,
              marginBottom: 2,
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            {breadcrumb.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Icon name="chevR" size={11} color={C.text3} />}
                <span style={{ color: i === breadcrumb.length - 1 ? C.text1 : C.text2 }}>{b}</span>
              </React.Fragment>
            ))}
          </div>
        )}
        {title && <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em" }}>{title}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {rightExtra}
        <OmniSearch />
        <UserMenu name={teacherName} role="Teacher" />
      </div>
    </div>
  );
}

export function TeacherShell({
  children,
  title,
  breadcrumb,
  teacherName,
}: {
  children: React.ReactNode;
  title?: string;
  breadcrumb?: string[];
  teacherName?: string;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", height: "100vh" }}>
      <TeacherSidebar teacherName={teacherName} />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, background: C.bg0 }}>
        <Topbar title={title} breadcrumb={breadcrumb} teacherName={teacherName} />
        <div style={{ flex: 1, overflow: "auto", padding: "32px 40px" }}>{children}</div>
      </div>
    </div>
  );
}

const STUDENT_NAV: NavItem[] = [
  { icon: "dashboard", label: "Home", href: "/student/dashboard" },
  { icon: "clipboard", label: "Assignments", href: "/student/assignments" },
  { icon: "brain", label: "My Map", href: "/student/progress" },
  { icon: "star", label: "Achievements", href: "/student/achievements" },
];

export function StudentSidebar() {
  const pathname = usePathname();
  return (
    <div
      style={{
        background: C.bg1,
        borderRight: `1px solid ${C.bg2}`,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div style={{ padding: "6px 8px 24px" }}>
        <Link href="/student/dashboard" style={{ textDecoration: "none" }}>
          <Logo size={20} />
        </Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {STUDENT_NAV.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "9px 12px",
                borderRadius: 8,
                background: isActive ? `${C.cyan}10` : "transparent",
                color: isActive ? C.cyan : C.text1,
                fontSize: 14,
                fontWeight: 500,
                position: "relative",
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    left: -16,
                    top: 8,
                    bottom: 8,
                    width: 2,
                    background: C.cyan,
                    borderRadius: 99,
                  }}
                />
              )}
              <Icon name={item.icon} size={18} color={isActive ? C.cyan : C.text1} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
      <StudentStreakCard />
      <StudentSignOutButton />
    </div>
  );
}

function StudentSignOutButton() {
  const router = useRouter();
  const { signOut } = useClerk();
  return (
    <button
      onClick={async () => {
        await signOut();
        router.push("/");
      }}
      style={{
        marginTop: 10,
        padding: "8px 12px",
        background: "transparent",
        border: `1px solid ${C.bg2}`,
        borderRadius: 8,
        color: C.text2,
        fontSize: 12,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontFamily: "inherit",
      }}
    >
      <Icon name="x" size={12} color={C.text2} strokeWidth={2} />
      Sign out
    </button>
  );
}

/**
 * Real per-day practice streak. Fetches the last 7 days of question_attempt
 * events for the signed-in student and renders a true streak.
 */
function StudentStreakCard() {
  const [days, setDays] = React.useState<number[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/student/streak")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setDays(data.days as number[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Skeleton on first render
  const display = days ?? [0, 0, 0, 0, 0, 0, 0];
  const streakCount = (() => {
    if (!days) return null;
    let n = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i] > 0) n++;
      else break;
    }
    return n;
  })();

  return (
    <div
      style={{
        marginTop: "auto",
        padding: 12,
        background: C.bg2,
        borderRadius: 10,
        border: `1px solid ${C.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Icon name="flame" size={14} color={C.orange} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          {streakCount === null
            ? "Loading…"
            : streakCount === 0
            ? "No streak yet"
            : `${streakCount}-day streak`}
        </span>
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        {display.map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 99,
              background: d > 0 ? C.orange : C.bg1,
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.text2, marginTop: 8 }}>
        {streakCount && streakCount > 0
          ? "Practice today to keep it going"
          : "Answer a question today to start a streak"}
      </div>
    </div>
  );
}

export function StudentShell({
  children,
  hideNav = false,
}: {
  children: React.ReactNode;
  hideNav?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: hideNav ? "1fr" : "220px 1fr",
        height: "100vh",
      }}
    >
      {!hideNav && <StudentSidebar />}
      <div style={{ background: C.bg0, overflow: "auto" }}>{children}</div>
    </div>
  );
}
