import type { CSSProperties } from "react";
import { Skeleton } from "../../components/ui/skeleton";
import {
  CARDS_TOP,
  GRID_MARGIN,
  ROW_HEIGHT,
  SKELETON_CARD_COUNT,
  type BoardColumns,
  type BoardHeader,
} from "../../utils/boardLayout";

type Props = {
  headers: BoardHeader[];
  columns: BoardColumns;
  gridStyle: CSSProperties;
};

// Skeleton-kort medan kort, layout och listor hämtas
export default function BoardSkeleton({ headers, columns, gridStyle }: Props) {
  return (
    <div
      className="pointer-events-none absolute inset-0 grid items-start"
      // Samma sidmarginal som boarden (gridStyle); korten börjar under rubrik och knapp
      style={{ ...gridStyle, paddingTop: CARDS_TOP }}
      aria-busy="true"
      aria-label="Loading cards"
    >
      {headers.map((h, i) =>
        columns.spans[i].collapsed ? (
          <div key={h.key} />
        ) : (
          <div
            key={h.key}
            className="flex flex-col px-2"
            style={{ gridColumn: `span ${columns.spans[i].span}`, gap: GRID_MARGIN }}
          >
            {Array.from({ length: SKELETON_CARD_COUNT }, (_, n) => (
              <Skeleton key={n} className="rounded-lg bg-white/70" style={{ height: ROW_HEIGHT }} />
            ))}
          </div>
        ),
      )}
    </div>
  );
}
