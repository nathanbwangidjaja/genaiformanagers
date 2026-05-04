"use client";
import * as React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!CLERK_ENABLED) return <>{children}</>;
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#22D3EE",
          colorBackground: "#18181B",
          colorInputBackground: "#27272A",
          colorInputText: "#FAFAFA",
          colorText: "#FAFAFA",
          colorTextSecondary: "#A1A1AA",
          colorNeutral: "#FAFAFA",
          colorDanger: "#F87171",
          colorSuccess: "#4ADE80",
          colorWarning: "#FBBF24",
          colorTextOnPrimaryBackground: "#09090B",
          borderRadius: "8px",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: "14px",
        },
        elements: {
          rootBox: { width: "100%" },
          card: {
            background: "#18181B",
            border: "1px solid #27272A",
            boxShadow: "none",
          },
          headerTitle: { color: "#FAFAFA", fontSize: "20px" },
          headerSubtitle: { color: "#A1A1AA" },
          socialButtonsBlockButton: {
            background: "#27272A",
            border: "1px solid #3F3F46",
            color: "#FAFAFA",
            "&:hover": { background: "#3F3F46" },
          },
          socialButtonsBlockButtonText: { color: "#FAFAFA", fontWeight: 500 },
          dividerLine: { background: "#27272A" },
          dividerText: { color: "#71717A" },
          formFieldLabel: { color: "#A1A1AA", fontSize: "13px" },
          formFieldInput: {
            background: "#27272A",
            border: "1px solid #3F3F46",
            color: "#FAFAFA",
            "&:focus": { borderColor: "#22D3EE", boxShadow: "0 0 0 1px #22D3EE" },
          },
          formButtonPrimary: {
            background: "#FAFAFA",
            color: "#09090B",
            fontWeight: 600,
            "&:hover": { background: "#22D3EE" },
          },
          footerActionLink: { color: "#22D3EE" },
          footerActionText: { color: "#A1A1AA" },
          identityPreviewText: { color: "#FAFAFA" },
          identityPreviewEditButton: { color: "#22D3EE" },
          formFieldErrorText: { color: "#F87171" },
          alertText: { color: "#FAFAFA" },
          formResendCodeLink: { color: "#22D3EE" },
          otpCodeFieldInput: {
            background: "#27272A",
            border: "1px solid #3F3F46",
            color: "#FAFAFA",
          },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
