'use client';
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import IssueTypes from "./IssueTypes";
import FeatureOff from "../components/FeatureOff";
import { useFeatures } from "../hooks/useFeatures";
import { useBoards } from "../hooks/useBoards";
import { ROUTES } from "../utils/routes";
import { PAGE_SUB_ROW_CLASS } from "../utils/styles";

export default function IssueTypesPage() {
  const router = useRouter();
  // The selected board's types; its admin only. For the UI only: the backend refuses others itself (403)
  const { current, loaded, boardAdmin: allowed } = useBoards();
  // The issueTypesPage navbar switch: the page is not shown
  const { isOn } = useFeatures();

  useEffect(() => {
    if (loaded && !allowed) router.replace(ROUTES.board);
  }, [loaded, allowed, router]);

  return (
    <Layout>
      {/* The same background as the board; pt because the navbar (two rows) is fixed; same as the backlog */}
      <div className={PAGE_SUB_ROW_CLASS}>
        {allowed && (
          <div className="mx-auto flex max-w-[960px] flex-col gap-4">
            {isOn("issueTypesPage") ? <IssueTypes key={current?._id} /> : <FeatureOff />}
          </div>
        )}
      </div>
    </Layout>
  );
}
