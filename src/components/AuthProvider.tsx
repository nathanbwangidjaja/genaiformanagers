"use client";
import * as React from "react";

const CLERK_ENABLED =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (CLERK_ENABLED) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ClerkProvider } = require("@clerk/nextjs");
    return (
      <ClerkProvider
        appearance={{
          variables: {
            colorPrimary: "#22D3EE",
            colorBackground: "#18181B",
            colorText: "#FAFAFA",
            colorInputBackground: "#27272A",
            colorInputText: "#FAFAFA",
            borderRadius: "8px",
          },
        }}
      >
        {children}
      </ClerkProvider>
    );
  }
  return <>{children}</>;
}
