'use client';
import Layout from "../components/Layout";
import Cards from "./Cards";

export default function CardsPage() {
  return (
    <Layout>
      {/* pt: navbaren är fixed och ligger annars över boardens rubrik */}
      <div className="min-h-screen bg-linear-135 from-board-from via-board-via to-board-to p-6 pt-16 max-[480px]:p-3 max-[480px]:pt-20">
        <Cards />
      </div>
    </Layout>
  );
}