import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Meridian Control Plane",
  description:
    "Preflight, apply, and verify IRIS security changes through live convergence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}