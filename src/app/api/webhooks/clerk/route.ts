import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { prisma } from "@/server/db";

// Clerk webhook: user.created / user.updated / user.deleted -> syncs to local User table
// Endpoint URL: https://<your-domain>/api/webhooks/clerk
// Role comes from unsafeMetadata.role or publicMetadata.role (TEACHER | STUDENT)

type ClerkEmail = { id: string; email_address: string };

type ClerkUserPayload = {
  id: string;
  email_addresses: ClerkEmail[];
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  public_metadata?: { role?: "TEACHER" | "STUDENT" };
  unsafe_metadata?: { role?: "TEACHER" | "STUDENT" };
};

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CLERK_WEBHOOK_SECRET not set" }, { status: 500 });
  }

  const h = await headers();
  const svixId = h.get("svix-id");
  const svixTimestamp = h.get("svix-timestamp");
  const svixSignature = h.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(secret);

  let evt: { type: string; data: ClerkUserPayload };
  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as { type: string; data: ClerkUserPayload };
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const data = evt.data;

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const role: "TEACHER" | "STUDENT" =
      data.public_metadata?.role ?? data.unsafe_metadata?.role ?? "STUDENT";
    const email =
      data.email_addresses.find((e) => e.id === data.primary_email_address_id)?.email_address ??
      data.email_addresses[0]?.email_address;
    if (!email) return NextResponse.json({ error: "No email" }, { status: 400 });

    const user = await prisma.user.upsert({
      where: { clerkId: data.id },
      update: {
        email,
        firstName: data.first_name ?? "",
        lastName: data.last_name ?? "",
        role,
      },
      create: {
        clerkId: data.id,
        email,
        firstName: data.first_name ?? "",
        lastName: data.last_name ?? "",
        role,
      },
    });

    if (role === "STUDENT") {
      await prisma.studentProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
    }

    return NextResponse.json({ ok: true, userId: user.id });
  }

  if (evt.type === "user.deleted") {
    await prisma.user.deleteMany({ where: { clerkId: data.id } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: evt.type });
}
