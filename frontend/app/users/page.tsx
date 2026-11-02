'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import Users from "./Users";
import { isAdmin } from "../utils/session";

export default function UsersPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  // Bara för UI:t: backend nekar icke-admins själv (403)
  useEffect(() => {
    if (isAdmin()) setAllowed(true);
    else router.replace("/cards");
  }, [router]);

  return (
    <Layout>
      {/* Samma bakgrund som boarden; pt eftersom navbaren är fixed */}
      <div className="min-h-screen bg-linear-135 from-board-from via-board-via to-board-to px-4 pt-20 pb-6 font-jira">
        {allowed && (
          <div className="mx-auto flex max-w-[960px] flex-col gap-4">
            <div className="rounded-xl bg-black/25 px-5 py-3 backdrop-blur-sm">
              <h1 className="text-xl font-bold text-white">Users</h1>
            </div>
            <Users />
          </div>
        )}
      </div>
    </Layout>
  );
}
