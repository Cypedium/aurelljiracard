'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "./Card";
import BacklogList from "../../components/BacklogList";
import { hasSession } from "../../utils/session";
import { ROUTES } from "../../utils/routes";

type Tab = "new" | "backlog";
const TABS: { key: Tab; label: string }[] = [
  { key: "new", label: "New card" },
  { key: "backlog", label: "From backlog" },
];

export default function CardPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [tab, setTab] = useState<Tab>("new");

  useEffect(() => {
    if (!hasSession()) {
      router.replace(ROUTES.home); // the root page handles the redirect to login
    } else {
      setAllowed(true); // show the form
    }
  }, []);

  if (!allowed) return null; // show nothing before redirect/allow

  // The same background as the board; pt because the navbar is fixed
  return (
    <div className="min-h-[calc(100dvh-60px)] bg-linear-135 from-board-from via-board-via to-board-to px-4 pt-20 pb-6">
      <div className="mx-auto flex w-full max-w-[640px] gap-1 font-jira" role="tablist">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              tab === key ? "bg-white text-jira-text" : "bg-black/25 text-white hover:bg-black/35"
            }`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "new" ? (
        <Card />
      ) : (
        // A card from the backlog lands in To Do and is assigned to you; then on to the board
        <div className="mx-auto mb-6 w-full max-w-[640px] font-jira">
          <BacklogList onMoved={() => router.push(ROUTES.home)} />
        </div>
      )}
    </div>
  );
}