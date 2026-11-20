import type { CSSProperties } from "react";
import { listHeight, type BoardColumns, type BoardHeader, type CardStatus } from "../../utils/boardLayout";
import { listColor } from "../../utils/styles";

type Props = {
  headers: BoardHeader[];
  columns: BoardColumns;
  // Rows per list (sets the height)
  rows: number[];
  draggingList: CardStatus | null;
  gridStyle: CSSProperties;
};

// The lists' background, below the cards
export default function ListBackgrounds({ headers, columns, rows, draggingList, gridStyle }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 grid items-start" style={gridStyle}>
      {headers.map((h, i) => {
        const { span, collapsed } = columns.spans[i];
        // The strip of a hidden list is drawn in the header layer
        if (collapsed) return <div key={h.key} className="snap-start" />;
        const size = { gridColumn: `span ${span}`, height: listHeight(rows[i]) };
        // A placeholder where the lifted list was
        if (draggingList === h.key) return <div key={h.key} className="snap-start rounded-xl bg-black/20" style={size} />;
        const color = listColor(h);
        return (
          <div
            key={h.key}
            className={`snap-start rounded-xl shadow-[0_1px_1px_rgba(9,30,66,0.25)] ${color.className}`}
            style={{ ...size, ...color.style }}
          />
        );
      })}
    </div>
  );
}
