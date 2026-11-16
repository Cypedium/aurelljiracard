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
      {/* Typsnitten är Arial (font-brand) och systemets (font-jira) i root.css; inga webbfonter att ladda */}
      <body className="antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}