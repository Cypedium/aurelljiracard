'use client';
import Layout from "../components/Layout";
import Cards from "./Cards";

export default function CardsPage() {
  return (
    <Layout>
      {/* pt: navbaren (två rader på boarden) är fixed och ligger annars över boardens rubrik.
          Mobil (< md): bara en rad (~40px), så 70px ger 30px luft under den.
          Fyller skärmen ner till footern (60px), så boardens scrollbar hamnar precis ovanför den */}
      <div className="flex min-h-[calc(100dvh-60px)] flex-col bg-linear-135 from-board-from via-board-via to-board-to px-6 pt-26 pb-2 max-md:pt-[70px] max-[480px]:px-3">
        <Cards />
      </div>
    </Layout>
  );
}