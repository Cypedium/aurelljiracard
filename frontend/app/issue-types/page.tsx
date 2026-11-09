'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import IssueTypes from "./IssueTypes";
import { isAdmin } from "../utils/session";

export default function IssueTypesPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  // Bara för UI:t: backend nekar icke-admins själv (403)
  useEffect(() => {
    if (isAdmin()) setAllowed(true);
    else router.replace("/cards");
  }, [router]);

  return (
    <Layout>
      {/* Samma bakgrund som boarden; pt eftersom navbaren (två rader) är fixed; samma som backloggen */}
      <div className="min-h-[calc(100dvh-60px)] bg-linear-135 from-board-from via-board-via to-board-to px-4 pt-30 pb-6 font-jira">
        {allowed && (
          <div className="mx-auto flex max-w-[960px] flex-col gap-4">
            <IssueTypes />
          </div>
        )}
      </div>
    </Layout>
  );
}
