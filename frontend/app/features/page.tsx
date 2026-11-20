'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import Features from "./Features";
import { isAdmin } from "../utils/session";
import { ROUTES } from "../utils/routes";

export default function FeaturesPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  // For the UI only: the backend refuses non-admins itself (403), and GET /feature gives the switches to admins only
  useEffect(() => {
    if (isAdmin()) setAllowed(true);
    else router.replace(ROUTES.board);
  }, [router]);

  return (
    <Layout>
      {/* The same background as the board; pt because the navbar is fixed; same as Users */}
      <div className="min-h-[calc(100dvh-60px)] bg-linear-135 from-board-from via-board-via to-board-to px-4 pt-20 pb-6 font-jira">
        {allowed && (
          <div className="mx-auto flex max-w-[960px] flex-col gap-4">
            {/* No visible heading (the navbar shows the page); kept for screen readers */}
            <h1 className="sr-only">Features</h1>
            <Features />
          </div>
        )}
      </div>
    </Layout>
  );
}
