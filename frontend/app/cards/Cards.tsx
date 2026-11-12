"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import { gridBounds, type LayoutConstraint } from "react-grid-layout/core";
import { useListDrag } from "./useListDrag";
import { useBoardData } from "./useBoardData";
import { useCardActions } from "./useCardActions";
import { useCollapsedLists } from "./useCollapsedLists";
import { useIsMobile } from "./useIsMobile";
import { useColumnActions } from "./useColumnActions";
import { useBoards } from "./useBoards";
import AddListForm from "./board/AddListForm";
import BoardCard from "./board/BoardCard";
import BoardSkeleton from "./board/BoardSkeleton";
import { CardFormDialog, DeleteCardDialog } from "./board/CardDialogs";
import CollapsedListStrip from "./board/CollapsedListStrip";
import DeleteListDialog from "./board/DeleteListDialog";
import ListBackgrounds from "./board/ListBackgrounds";
import ListDragPreview from "./board/ListDragPreview";
import ListHeader from "./board/ListHeader";
import {
  CardPosition,
  CardStatus,
  CARDS_TOP,
  COLLAPSED_LIST_MAX_HEIGHT,
  EXPANDED_SPAN,
  GRID_MARGIN,
  MOBILE_GUTTER,
  ROW_HEIGHT,
  SKELETON_CARD_COUNT,
  boardColumns,
  desktopBoardWidth,
  buildCardLayout,
  cardKey,
  cardDragGridX,
  columnAtGridX,
  eventPoint,
  HIDDEN_LIST_ATTR,
  LIST_KEY_ATTR,
  nearestListIndexAtX,
  countCardsPerColumn,
  fromGridLayout,
  listHeight,
  mobileBoardWidth,
  rowsPerColumn,
  splitByCollapsed,
  statusForColumn,
  toGridLayout,
  toSavedPositions,
  previewHeaders,
} from "../utils/boardLayout";
import { canDeleteCard, canEditCard, getUsername } from "../utils/session";
import { BOARD_ACTIONS, onBoardAction } from "../utils/boardActions";

// Den valda boarden (navbaren byter); key gör att allt laddas om när boarden byts
export default function Home() {
  const { current, loaded, boardAdmin } = useBoards();
  if (!current) {
    return loaded ? <p className="pt-10 text-center font-jira text-white">You have no board yet.</p> : null;
  }
  return <BoardView key={current._id} boardId={current._id} admin={boardAdmin} />;
}

// admin = boardens admin (ägaren): listor, alla kort. Backend kontrollerar själv
function BoardView({ boardId, admin }: { boardId: string; admin: boolean }) {
  const { cards, setCards, cardsLoaded, fetchCards, userLayout, layoutLoaded, persistLayout, headers, setHeaders, columnsLoaded } =
    useBoardData(boardId);
  const {
    editingCard,
    setEditingCard,
    deletingCard,
    setDeletingCard,
    creatingIn,
    setCreatingIn,
    moveCard,
    closeDialog,
    handleCardCreated,
    handleCardSaved,
    removeCard,
  } = useCardActions({ boardId, cards, setCards, fetchCards });
  const {
    renamingKey,
    setRenamingKey,
    addingList,
    setAddingList,
    deletingList,
    setDeletingList,
    removeList,
    renameColumn,
    recolorColumn,
    moveList,
    addList,
  } = useColumnActions({ boardId, headers, setHeaders, userLayout, persistLayout });
  // Ihopfällda listor: visar bara rubrik och "Add a card"
  const { collapsed, toggleColumn } = useCollapsedLists();
  const [userName, setUserName] = useState("");
  // Gridden följer boardens bredd så att den fyller skärmen
  const { width, containerRef, mounted } = useContainerWidth();
  // Luft mellan listorna och mot skärmkanten: större på mobil, så att man kan svepa upp/ner bredvid korten.
  // Samma värde i CSS-griddarna (bakgrund, rubriker) och i react-grid-layout (korten), så att de linjerar
  const gutter = useIsMobile() ? MOBILE_GUTTER : GRID_MARGIN;
  const boardScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUserName(getUsername());
  }, []);

  // Navbarens "Create card" (nytt kort i första listan) och "Create column" (admin: formuläret sist på boarden)
  useEffect(() => onBoardAction(BOARD_ACTIONS.createCard, () => setCreatingIn(headers[0]?.key ?? null)), [headers, setCreatingIn]);
  useEffect(() => {
    if (!admin) return;
    return onBoardAction(BOARD_ACTIONS.createColumn, () => setAddingList(true));
  }, [admin, setAddingList]);
  // Navbarens "Delete column" (admin): dialogen där en tom lista väljs
  useEffect(() => {
    if (!admin) return;
    return onBoardAction(BOARD_ACTIONS.deleteColumn, () => setDeletingList(true));
  }, [admin, setDeletingList]);
  // Formuläret ligger sist på boarden: scrolla dit när det har ritats
  useEffect(() => {
    const board = boardScrollRef.current;
    if (admin && addingList && board) board.scrollTo({ left: board.scrollWidth, behavior: "smooth" });
  }, [admin, addingList]);

  // Admin: listan som dras i sin rubrik följer musen (lutad). Medan den dras visas boarden i den nya
  // ordningen (boardHeaders): de andra listorna och deras kort flyttar undan och den lyfta listans plats
  // är en mörk platshållare. Åtgärderna (spara, byta namn) använder alltid headers
  const { drag: listDrag, onPointerDown: onListPointerDown, previewRef, previewStyle } = useListDrag({
    scrollRef: boardScrollRef,
    onDrop: (from, toIndex) => moveList(from, headers[toIndex]?.key ?? from),
  });
  const draggingList = listDrag?.key ?? null;
  const boardHeaders = useMemo(
    () => (listDrag ? previewHeaders(headers, listDrag.key, listDrag.target) : headers),
    [headers, listDrag],
  );

  // Räknas fram vid varje render, så gridden får aldrig en tom layout som
  // sedan sparas över den riktiga. Väntar på listorna: annars hamnar kort i
  // tillagda listor tillfälligt i första listan och den ordningen sparas
  const gridLayout = useMemo(
    () =>
      layoutLoaded && columnsLoaded
        ? buildCardLayout(
            boardHeaders,
            cards.map((fb, i) => ({ id: cardKey(fb, i), status: fb.status })),
            userLayout.cards,
          )
        : [],
    [boardHeaders, cards, userLayout.cards, layoutLoaded, columnsLoaded],
  );

  const { visible: visibleLayout, hidden: hiddenLayout } = splitByCollapsed(boardHeaders, gridLayout, collapsed);
  const visibleIds = new Set(visibleLayout.map((l) => l.i));

  // Dolda listor blir smala remsor; gridden räknar i enheter i stället för kolumner.
  // Formuläret för en ny lista (navbarens "Create column") får plats sist medan det är öppet
  const showAddList = admin && addingList;
  const columns = useMemo(
    () => boardColumns(boardHeaders, collapsed, showAddList ? EXPANDED_SPAN : 0),
    [boardHeaders, collapsed, showAddList],
  );
  // Pekarens x-position. pointermove/pointerdown kommer före react-draggables mus-/touch-event,
  // så den är aktuell när gridden räknar ut kortets plats
  const pointerXRef = useRef<number | null>(null);
  useEffect(() => {
    const track = (e: PointerEvent) => {
      pointerXRef.current = e.clientX;
    };
    window.addEventListener("pointerdown", track, true);
    window.addEventListener("pointermove", track, true);
    return () => {
      window.removeEventListener("pointerdown", track, true);
      window.removeEventListener("pointermove", track, true);
    };
  }, []);
  // Ett draget kort hamnar i listan pekaren är över, som när en lista dras (inte där kortets vänsterkant är)
  const constraints = useMemo<LayoutConstraint[]>(
    () => [
      gridBounds,
      {
        name: "boardColumn",
        constrainPosition: (_item, x, y) => {
          const pointerX = pointerXRef.current;
          const lists = Array.from(document.querySelectorAll(`[${LIST_KEY_ATTR}]`), (el) => el.getBoundingClientRect());
          return { x: cardDragGridX(columns, x, pointerX === null ? null : nearestListIndexAtX(lists, pointerX)), y };
        },
      },
    ],
    [columns],
  );
  // Dold lista som ett draget kort är över (remsan markeras); släpps kortet där flyttas det dit
  const [dropTarget, setDropTarget] = useState<CardStatus | null>(null);
  const hiddenListAt = (e: Event): CardStatus | null => {
    const point = eventPoint(e);
    if (!point) return null;
    const strip = document.elementsFromPoint(point.x, point.y).find((el) => el.hasAttribute(HIDDEN_LIST_ATTR));
    return strip?.getAttribute(HIDDEN_LIST_ATTR) ?? null;
  };
  // Gridens positioner (enheter) → sparade positioner (kolumner), plus korten i dolda listor
  const savedPositions = (currentLayout: readonly CardPosition[]) =>
    toSavedPositions(boardHeaders, [...fromGridLayout(currentLayout, columns), ...hiddenLayout]);

  // Listan som dras: dess kort döljs i gridden och visas i förhandsvisningen i stället, i samma ordning
  const dragIndex = draggingList ? boardHeaders.findIndex((h) => h.key === draggingList) : -1;
  const dragLayout = dragIndex < 0 ? [] : visibleLayout.filter((l) => l.x === dragIndex).sort((a, b) => a.y - b.y);
  const draggedCardIds = new Set(dragLayout.map((l) => l.i));
  const cardById = new Map(cards.map((fb, i) => [cardKey(fb, i), fb]));
  const dragCards = dragLayout.flatMap((l) => cardById.get(l.i) ?? []);

  // Antal kort per kolumn: visas i rubriken och styr listans höjd
  const columnCounts = countCardsPerColumn(boardHeaders, gridLayout);
  // Skeleton-korten visas medan kort, layout och listor hämtas
  const boardLoading = !cardsLoaded || !layoutLoaded || !columnsLoaded;
  const columnRows = rowsPerColumn(
    boardLoading ? columnCounts.map(() => SKELETON_CARD_COUNT) : columnCounts,
    columns,
  );
  const columnGrid = {
    padding: `0 ${gutter}px`,
    columnGap: gutter,
    rowGap: GRID_MARGIN,
    gridTemplateColumns: `repeat(${columns.units}, 1fr)`,
  };

  return (
    <div id="cards-container" className="flex flex-1 flex-col font-jira">
      {/* Mobil: varje lista är en skärm bred och man sveper mellan dem (snap).
          md och uppåt: alla listor får plats i skärmens bredd */}
      <div
        ref={boardScrollRef}
        className="board-scroll flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain md:snap-none"
        style={{ scrollPaddingInline: gutter }}
      >
        <div
          ref={containerRef}
          // Mobil: en skärmbredd per synlig lista. Desktop: fast listbredd, dolda listor
          // breddar inte de andra. Gridden läser bredden via useContainerWidth
          className="relative w-(--board-width) md:w-(--board-width-md)"
          style={
            {
              "--board-width": mobileBoardWidth(columns),
              "--board-width-md": desktopBoardWidth(columns),
              minHeight:
                Math.max(...columnRows.map(listHeight), collapsed.length ? COLLAPSED_LIST_MAX_HEIGHT : 0) + GRID_MARGIN,
            } as React.CSSProperties
          }
        >
          <ListBackgrounds
            headers={boardHeaders}
            columns={columns}
            rows={columnRows}
            draggingList={draggingList}
            gridStyle={columnGrid}
          />

          {/* Rubriker och "Add a card", ovanför gridden så att de går att klicka */}
          <div className="pointer-events-none absolute inset-0 z-[1] grid items-start" style={columnGrid}>
            {boardHeaders.map((h, i) => {
              const count = boardLoading ? null : columnCounts[i];
              return columns.spans[i].collapsed ? (
                <CollapsedListStrip
                  key={h.key}
                  header={h}
                  count={count}
                  dropTarget={dropTarget === h.key}
                  onShow={() => toggleColumn(h.key)}
                />
              ) : (
                <ListHeader
                  key={h.key}
                  header={h}
                  count={count}
                  span={columns.spans[i].span}
                  height={listHeight(columnRows[i])}
                  admin={admin}
                  renaming={renamingKey === h.key}
                  dragging={draggingList === h.key}
                  onDragStart={onListPointerDown(h.key)}
                  onStartRename={() => setRenamingKey(h.key)}
                  onRename={(title) => renameColumn(h.key, title)}
                  onRecolor={(color) => recolorColumn(h.key, color)}
                  onHide={() => toggleColumn(h.key)}
                  onAddCard={() => setCreatingIn(h.key)}
                />
              );
            })}

            {showAddList && <AddListForm onClose={() => setAddingList(false)} onSubmit={addList} />}
          </div>

          {boardLoading && <BoardSkeleton headers={boardHeaders} columns={columns} gridStyle={columnGrid} />}

          {!layoutLoaded || !mounted ? null : visibleLayout.length > 0 && (
            <ResponsiveGridLayout
              // Ny gridd när antalet enheter eller listornas ordning ändras (lista döljs, visas eller flyttas): annars räknar
              // react-grid-layout om de gamla positionerna och korten hamnar fel
              key={`${columns.units}:${boardHeaders.map((h) => h.key).join()}`}
              className="gridLayout"
              layouts={{ lg: toGridLayout(visibleLayout, columns) }}
              breakpoints={{ lg: 0 }}
              cols={{ lg: columns.units }}
              constraints={constraints}
              rowHeight={ROW_HEIGHT}
              width={width}
              margin={[gutter, GRID_MARGIN]}
              containerPadding={[gutter, CARDS_TOP]}
              dragConfig={{ cancel: ".no-drag" }}
              // Korten har fast storlek (1x1), så inget resize-handtag
              resizeConfig={{ enabled: false }}
              onLayoutChange={(currentLayout) => {
                // Förhandsvisningen medan en lista dras sparas inte
                if (listDrag) return;
                persistLayout({ ...userLayout, cards: savedPositions(currentLayout) });
              }}
              onDrag={(_layout, _oldItem, _newItem, _placeholder, e) => setDropTarget(hiddenListAt(e))}
              onDragStop={(currentLayout, oldItem, newItem, _placeholder, e) => {
                if (!oldItem || !newItem) return;
                // Släppt på en dold lista: kortet flyttas dit och hamnar överst
                // (det saknar sparad position där, se buildCardLayout)
                const hiddenTarget = hiddenListAt(e);
                setDropTarget(null);
                if (hiddenTarget) {
                  const moved = cardById.get(newItem.i);
                  if (moved?._id) moveCard(moved._id, hiddenTarget);
                  return;
                }
                const from = columnAtGridX(columns, oldItem.x);
                const to = columnAtGridX(columns, newItem.x);
                if (from === to) return;
                // Spara radordningen direkt så att kortet inte hoppar när statusen ändras
                persistLayout({ ...userLayout, cards: savedPositions(currentLayout) });
                const card = cardById.get(newItem.i);
                if (card?._id) moveCard(card._id, statusForColumn(boardHeaders, to));
              }}
            >
              {/* react-grid-layout styr ytterdiven (style, className, ref), så den ligger kvar här */}
              {cards
                .map((fb, i) => ({ fb, id: cardKey(fb, i) }))
                .filter(({ id }) => visibleIds.has(id))
                .map(({ fb, id }) => (
                  <div
                    key={fb._id || fb.username + fb.submittedAt}
                    // Luft mellan kortet och kolumnens kanter. Korten i en lyft lista visas i förhandsvisningen
                    className={`px-2 ${draggedCardIds.has(id) ? "invisible" : ""}`}
                  >
                    <BoardCard
                      card={fb}
                      canEdit={canEditCard(fb, userName, admin)}
                      canDelete={canDeleteCard(fb, userName, admin)}
                      onEdit={() => setEditingCard(fb)}
                      onDelete={() => setDeletingCard(fb)}
                    />
                  </div>
                ))}
            </ResponsiveGridLayout>
          )}
        </div>
      </div>

      {listDrag && dragIndex >= 0 && (
        <ListDragPreview
          ref={previewRef}
          header={boardHeaders[dragIndex]}
          count={columnCounts[dragIndex]}
          cards={dragCards}
          style={previewStyle(listDrag)}
        />
      )}

      <CardFormDialog
        editingCard={editingCard}
        creatingIn={creatingIn}
        onSaved={handleCardSaved}
        onCreated={handleCardCreated}
        onClose={closeDialog}
      />

      <DeleteCardDialog card={deletingCard} onClose={() => setDeletingCard(null)} onConfirm={removeCard} />

      {admin && (
        <DeleteListDialog
          open={deletingList}
          lists={headers}
          cards={cards}
          onClose={() => setDeletingList(false)}
          onConfirm={removeList}
        />
      )}
    </div>
  );
}
