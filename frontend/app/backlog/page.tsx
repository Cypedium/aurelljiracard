'use client';
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Layout from "../components/Layout";
import BacklogList from "../components/BacklogList";
import FeatureOff from "../components/FeatureOff";
import { useFeatures } from "../hooks/useFeatures";
import CardForm from "../cards/card/Card";
import FormDialog from "../components/FormDialog";
import { BACKLOG_STATUS } from "../utils/backlog";
import { BOARD_ACTIONS, onBoardAction } from "../utils/boardActions";
import { useLanguage } from "../hooks/useLanguage";
import { PAGE_SUB_ROW_CLASS } from "../utils/styles";

export default function BacklogPage() {
  const { t } = useLanguage();
  const [creating, setCreating] = useState(false);
  // The backlogPage navbar switch: the page is not shown (the cards remain)
  const { isOn } = useFeatures();
  // Increased when a card has been added, so the list is fetched again
  const [refreshKey, setRefreshKey] = useState(0);

  // The navbar's "Create card" opens the form (a new card in the backlog)
  useEffect(() => onBoardAction(BOARD_ACTIONS.createCard, () => setCreating(true)), []);

  const handleCreated = () => {
    setCreating(false);
    setRefreshKey((k) => k + 1);
    toast.success(t("Card added to the backlog."));
  };

  return (
    <Layout>
      {/* The same background as the board; pt because the navbar (two rows) is fixed */}
      <div className={PAGE_SUB_ROW_CLASS}>
        <div className="mx-auto flex max-w-[960px] flex-col gap-4">
          {/* No visible heading (the navbar shows the page); kept for screen readers */}
          {isOn("backlogPage") ? (
            <>
              <h1 className="sr-only">{t("Backlog")}</h1>
              <BacklogList refreshKey={refreshKey} />
            </>
          ) : (
            <FeatureOff />
          )}
        </div>

        <FormDialog open={creating} onClose={() => setCreating(false)} title={t("Add to backlog")}>
          <CardForm status={BACKLOG_STATUS} onCreated={handleCreated} onCancel={() => setCreating(false)} />
        </FormDialog>
      </div>
    </Layout>
  );
}
