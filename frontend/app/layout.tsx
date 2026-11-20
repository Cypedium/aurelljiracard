import type { Metadata } from "next";
import ClientLayout from "./client-layout";
// @ts-ignore
import "./root.css";

export const metadata: Metadata = {
  title: "Aurell Jira Board",
  description: "Generated for the jira board application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* The fonts are Arial (font-brand) and the system's (font-jira) in root.css; no web fonts to load */}
      <body className="antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}