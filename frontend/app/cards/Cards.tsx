"use client";
import React, { useEffect, useMemo, useRef } from "react";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import { useCardDrag } from "./useCardDrag";
import { useListDrag } from "./useListDrag";
import { useBoardData } from "./useBoardData";
import { useCardActions } from "./useCardActions";
import { useCollapsedLists } from "./useCollapsedLists";
import { useIsMobile } from "../hooks/useIsMobile";
import { useColumnActions } from "./useColumnActions";
import { useBoards } from "../hooks/useBoards";
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
  countCardsPerColumn,
  fromGridLayout,
  listHeight,
  mobileBoardWidth,
  rowsPerColumn,
  splitByCollapsed,
  toGridLayout,
  toSavedPositions,
  previewHeaders,
} from "../utils/boardLayout";
import { canDeleteCard, canEditCard } from "../utils/session";
import { BOARD_ACTIONS, onBoardAction } from "../utils/boardActions";
import { useFeatures } from "../hooks/useFeatures";
import { useSession } from "../hooks/useSession";
import { useLanguage } from "../hooks/useLanguage";

// The selected board (the navbar switches it); key reloads everything when the board changes
export default function Home() {
  const { current, loaded, boardAdmin } = useBoards();
  const { t } = useLanguage();
  if (!current) {
    return loaded ? <p className="pt-10 text-center font-jira text-white">{t("You have no board yet.")}</p> : null;
  }
  return <BoardView key={current._id} boardId={current._id} admin={boardAdmin} />;
}

// admin = the board's admin (its owner): lists, every card. The backend checks for itself
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
  // Collapsed lists: show only the header and "Add a card"
  const { collapsed, toggleColumn } = useCollapsedLists();
  const { username: userName } = useSession();
  // The grid follows the board's width so that it fills the screen
  const { width, containerRef, mounted } = useContainerWidth();
  // Space between the lists and to the screen edge: larger on mobile, so you can swipe up/down next to the cards.
  // The same value in the CSS grids (background, headers) and in react-grid-layout (the cards), so they line up
  const gutter = useIsMobile() ? MOBILE_GUTTER : GRID_MARGIN;
  const boardScrollRef = useRef<HTMLDivElement>(null);
  // Switched-off features and read-only mode (the backend refuses with 503 anyway); the site admin sees everything
  const { isOn, canWrite } = useFeatures();
  const canDragCards = isOn("editCard") && canWrite;

  // The navbar's "Create card" (new card in the first list) and "Create column" (admin: the form at the end of the board)
  useEffect(() => onBoardAction(BOARD_ACTIONS.createCard, () => setCreatingIn(headers[0]?.key ?? null)), [headers, setCreatingIn]);
  useEffect(() => {
    if (!admin) return;
    return onBoardAction(BOARD_ACTIONS.createColumn, () => setAddingList(true));
  }, [admin, setAddingList]);
  // The navbar's "Delete column" (admin): the dialog where an empty list is picked
  useEffect(() => {
    if (!admin) return;
    return onBoardAction(BOARD_ACTIONS.deleteColumn, () => setDeletingList(true));
  }, [admin, setDeletingList]);
  // The form sits at the end of the board: scroll there once it has rendered
  useEffect(() => {
    const board = boardScrollRef.current;
    if (admin && addingList && board) board.scrollTo({ left: board.scrollWidth, behavior: "smooth" });
  }, [admin, addingList]);

  // Admin: a list dragged by its header follows the mouse (tilted). While it is dragged the board is shown in the new
  // order (boardHeaders): the other lists and their cards move aside and the lifted list's slot
  // is a dark placeholder. The actions (save, rename) always use headers
  const { drag: listDrag, onPointerDown: onListPointerDown, previewRef, previewStyle } = useListDrag({
    scrollRef: boardScrollRef,
    onDrop: (from, toIndex) => moveList(from, headers[toIndex]?.key ?? from),
  });
  const draggingList = listDrag?.key ?? null;
  const boardHeaders = useMemo(
    () => (listDrag ? previewHeaders(headers, listDrag.key, listDrag.target) : headers),
    [headers, listDrag],
  );

  // Computed on every render, so the grid never gets an empty layout that
  // is then saved over the real one. Waits for the lists: otherwise cards in
  // added lists land in the first list for a moment and that order is saved
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

  // Hidden lists become narrow strips; the grid counts in units instead of columns.
  // The form for a new list (the navbar's "Create column") gets room at the end while it is open
  const showAddList = admin && addingList;
  const columns = useMemo(
    () => boardColumns(boardHeaders, collapsed, showAddList ? EXPANDED_SPAN : 0),
    [boardHeaders, collapsed, showAddList],
  );
  // Grid positions (units) → saved positions (columns), plus the cards in hidden lists
  const saveOrder = (currentLayout: readonly CardPosition[]) =>
    persistLayout({
      ...userLayout,
      cards: toSavedPositions(boardHeaders, [...fromGridLayout(currentLayout, columns), ...hiddenLayout]),
    });
  const cardById = new Map(cards.map((fb, i) => [cardKey(fb, i), fb]));
  // A dragged card: the pointer's list, hidden lists as targets, a new status when it changes list
  const { constraints, dropTarget, onDrag, onDragStop } = useCardDrag({
    columns,
    headers: boardHeaders,
    cardById,
    moveCard,
    saveOrder,
  });

  // The list being dragged: its cards are hidden in the grid and shown in the preview instead, in the same order
  const dragIndex = draggingList ? boardHeaders.findIndex((h) => h.key === draggingList) : -1;
  const dragLayout = dragIndex < 0 ? [] : visibleLayout.filter((l) => l.x === dragIndex).sort((a, b) => a.y - b.y);
  const draggedCardIds = new Set(dragLayout.map((l) => l.i));
  const dragCards = dragLayout.flatMap((l) => cardById.get(l.i) ?? []);

  // Number of cards per column: shown in the header and sets the list's height
  const columnCounts = countCardsPerColumn(boardHeaders, gridLayout);
  // The skeleton cards show while cards, layout and lists are fetched
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
      {/* Mobile: every list is one screen wide and you swipe between them (snap).
          md and up: every list fits in the screen's width */}
      <div
        ref={boardScrollRef}
        className="board-scroll flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain md:snap-none"
        style={{ scrollPaddingInline: gutter }}
      >
        <div
          ref={containerRef}
          // Mobile: one screen width per visible list. Desktop: fixed list width, hidden lists
          // don't widen the others. The grid reads the width via useContainerWidth
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

          {/* Headers and "Add a card", above the grid so they can be clicked */}
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
                  admin={admin && isOn("editColumns")}
                  canAddCard={isOn("createCard")}
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
              // A new grid when the number of units or the order of the lists changes (a list is hidden, shown or moved): otherwise
              // react-grid-layout recalculates the old positions and the cards end up in the wrong place
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
              // editCard switched off or read-only: the cards stay put
              dragConfig={{ cancel: ".no-drag", enabled: canDragCards }}
              // The cards have a fixed size (1x1), so no resize handle
              resizeConfig={{ enabled: false }}
              onLayoutChange={(currentLayout) => {
                // The preview while a list is dragged is not saved, nor anything in read-only mode
                if (listDrag || !canWrite) return;
                saveOrder(currentLayout);
              }}
              onDrag={onDrag}
              onDragStop={onDragStop}
            >
              {/* react-grid-layout controls the outer div (style, className, ref), so it stays here */}
              {cards
                .map((fb, i) => ({ fb, id: cardKey(fb, i) }))
                .filter(({ id }) => visibleIds.has(id))
                .map(({ fb, id }) => (
                  <div
                    key={fb._id || fb.username + fb.submittedAt}
                    // Space between the card and the column's edges. The cards of a lifted list show in the preview
                    className={`px-2 ${draggedCardIds.has(id) ? "invisible" : ""}`}
                  >
                    <BoardCard
                      card={fb}
                      canEdit={canEditCard(fb) && isOn("editCard")}
                      canDelete={canDeleteCard(fb, userName, admin) && isOn("deleteCard")}
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
