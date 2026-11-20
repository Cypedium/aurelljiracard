'use client';
import Layout from "../components/Layout";
import Cards from "./Cards";

export default function CardsPage() {
  return (
    <Layout>
      {/* pt: the navbar (two rows on the board) is fixed and would otherwise cover the board's header.
          Mobile (< md): only one row (~40px), so 70px gives 30px of space below it.
          Fills the screen down to the footer (60px), so the board's scrollbar sits right above it */}
      <div className="flex min-h-[calc(100dvh-60px)] flex-col bg-linear-135 from-board-from via-board-via to-board-to px-6 pt-26 pb-2 max-md:pt-[70px] max-[480px]:px-3">
        <Cards />
      </div>
    </Layout>
  );
}