import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Honestra – Teleology Firewall Demo",
  description:
    "Analyze teleological language and see its causal rewrite using the shared teleology engine.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
