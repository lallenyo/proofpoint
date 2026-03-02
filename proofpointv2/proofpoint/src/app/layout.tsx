import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProofPoint — CS Intelligence Platform",
  description:
    "AI-powered customer success reports, ROI analysis, and next-action recommendations. Turn customer data into executive-ready success stories in 60 seconds.",
  keywords: ["customer success", "ROI reports", "SaaS", "QBR", "churn prevention", "AI"],
  openGraph: {
    title: "ProofPoint — CS Intelligence Platform",
    description:
      "Turn customer data into executive-ready success stories in 60 seconds.",
    type: "website",
    siteName: "ProofPoint",
  },
  twitter: {
    card: "summary_large_image",
    title: "ProofPoint — CS Intelligence Platform",
    description:
      "Turn customer data into executive-ready success stories in 60 seconds.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <SignedOut>
            <SignInButton />
            <SignUpButton />
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#0a1628",
                border: "1px solid #1e293b",
                color: "#f1f5f9",
                fontFamily: "'DM Sans', sans-serif",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
