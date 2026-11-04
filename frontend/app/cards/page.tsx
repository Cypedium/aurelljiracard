'use client';
import Layout from "../components/Layout";
import Cards from "./Cards";

export default function CardsPage() {
  return (
    <Layout>
      {/* pt: navbaren är fixed och ligger annars över boardens rubrik.
          Fyller skärmen ner till footern (60px), så boardens scrollbar hamnar precis ovanför den */}
      <div className="flex min-h-[calc(100dvh-60px)] flex-col bg-linear-135 from-board-from via-board-via to-board-to px-6 pt-16 pb-2 max-[480px]:px-3 max-[480px]:pt-20">
        <Cards />
      </div>
    </Layout>
  );
}