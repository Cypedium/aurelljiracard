'use client';
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import IssueTypes from "./IssueTypes";
import { useBoards } from "../cards/useBoards";

export default function IssueTypesPage() {
  const router = useRouter();
  // Den valda boardens typer; bara dess admin. Bara för UI:t: backend nekar andra själv (403)
  const { current, loaded, boardAdmin: allowed } = useBoards();

  useEffect(() => {
    if (loaded && !allowed) router.replace("/cards");
  }, [loaded, allowed, router]);

  return (
    <Layout>
      {/* Samma bakgrund som boarden; pt eftersom navbaren (två rader) är fixed; samma som backloggen */}
      <div className="min-h-[calc(100dvh-60px)] bg-linear-135 from-board-from via-board-via to-board-to px-4 pt-30 pb-6 font-jira">
        {allowed && (
          <div className="mx-auto flex max-w-[960px] flex-col gap-4">
            <IssueTypes key={current?._id} />
          </div>
        )}
      </div>
    </Layout>
  );
}
