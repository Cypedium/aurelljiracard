'use client';
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import IssueTypes from "./IssueTypes";
import FeatureOff from "../components/FeatureOff";
import { useFeatures } from "../hooks/useFeatures";
import { useBoards } from "../hooks/useBoards";
import { ROUTES } from "../utils/routes";

export default function IssueTypesPage() {
  const router = useRouter();
  // Den valda boardens typer; bara dess admin. Bara för UI:t: backend nekar andra själv (403)
  const { current, loaded, boardAdmin: allowed } = useBoards();
  // Navbar-brytaren issueTypesPage: sidan visas inte
  const { isOn } = useFeatures();

  useEffect(() => {
    if (loaded && !allowed) router.replace(ROUTES.board);
  }, [loaded, allowed, router]);

  return (
    <Layout>
      {/* Samma bakgrund som boarden; pt eftersom navbaren (två rader) är fixed; samma som backloggen */}
      <div className="min-h-[calc(100dvh-60px)] bg-linear-135 from-board-from via-board-via to-board-to px-4 pt-30 pb-6 font-jira">
        {allowed && (
          <div className="mx-auto flex max-w-[960px] flex-col gap-4">
            {isOn("issueTypesPage") ? <IssueTypes key={current?._id} /> : <FeatureOff />}
          </div>
        )}
      </div>
    </Layout>
  );
}
