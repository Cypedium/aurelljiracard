'use client';
import { useState } from "react";
import { toast } from "sonner";
import Layout from "../components/Layout";
import BacklogList from "../components/BacklogList";
import CardForm from "../cards/card/Card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { BACKLOG_STATUS } from "../utils/backlog";

export default function BacklogPage() {
  const [creating, setCreating] = useState(false);
  // Ökas när ett kort lagts till, så att listan hämtas igen
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = () => {
    setCreating(false);
    setRefreshKey((k) => k + 1);
    toast.success("Card added to the backlog.");
  };

  return (
    <Layout>
      {/* Samma bakgrund som boarden; pt eftersom navbaren är fixed */}
      <div className="min-h-screen bg-linear-135 from-board-from via-board-via to-board-to px-4 pt-20 pb-6 font-jira">
        <div className="mx-auto flex max-w-[960px] flex-col gap-4">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-black/25 px-5 py-3 backdrop-blur-sm">
            <h1 className="text-xl font-bold text-white">Backlog</h1>
            <Button onClick={() => setCreating(true)}>Add to backlog</Button>
          </div>
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
