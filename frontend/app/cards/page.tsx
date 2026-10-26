'use client';
import Layout from "../components/Layout";
import Cards from "./Cards";

export default function CardsPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-linear-135 from-board-from via-board-via to-board-to p-6 max-[480px]:p-3">
        <Cards />
      </div>
    </Layout>
  );
}