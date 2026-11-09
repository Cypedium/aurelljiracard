'use client';
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Layout from "../components/Layout";
import BacklogList from "../components/BacklogList";
import CardForm from "../cards/card/Card";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { BACKLOG_STATUS } from "../utils/backlog";
import { BOARD_ACTIONS, onBoardAction } from "../utils/boardActions";

export default function BacklogPage() {
  const [creating, setCreating] = useState(false);
  // Ökas när ett kort lagts till, så att listan hämtas igen
  const [refreshKey, setRefreshKey] = useState(0);

  // Navbarens "Create card" öppnar formuläret (nytt kort i backloggen)
  useEffect(() => onBoardAction(BOARD_ACTIONS.createCard, () => setCreating(true)), []);

  const handleCreated = () => {
    setCreating(false);
    setRefreshKey((k) => k + 1);
    toast.success("Card added to the backlog.");
  };

  return (
    <Layout>
      {/* Samma bakgrund som boarden; pt eftersom navbaren (två rader) är fixed */}
      <div className="min-h-screen bg-linear-135 from-board-from via-board-via to-board-to px-4 pt-30 pb-6 font-jira">
        <div className="mx-auto flex max-w-[960px] flex-col gap-4">
          {/* Ingen synlig rubrik (navbaren visar sidan); kvar för skärmläsare */}
          <h1 className="sr-only">Backlog</h1>
          <BacklogList refreshKey={refreshKey} />
        </div>

        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogContent
            showCloseButton={false}
            aria-describedby={undefined}
            // Formuläret har egen bakgrund och skugga
            className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto border-0 bg-transparent p-0 font-jira shadow-none sm:max-w-[640px]"
          >
            <DialogTitle className="sr-only">Add to backlog</DialogTitle>
            <CardForm status={BACKLOG_STATUS} onCreated={handleCreated} onCancel={() => setCreating(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
