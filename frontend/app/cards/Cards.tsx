"use client";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import { gridBounds, type LayoutConstraint } from "react-grid-layout/core";
import debounce from "lodash.debounce";
import { toast } from "sonner";
import {
  createColumn,
  deleteCard,
  getCards,
  getColumns,
  getLayout,
  saveLayout,
  updateCardStatus,
  updateColumn,
  reorderColumns,
  type Card,
} from "../api/endpoints";
import { useListDrag } from "./useListDrag";
import AddListForm from "./board/AddListForm";
import BoardCard from "./board/BoardCard";
import BoardSkeleton from "./board/BoardSkeleton";
import { CardFormDialog, DeleteCardDialog } from "./board/CardDialogs";
import CollapsedListStrip from "./board/CollapsedListStrip";
import ListBackgrounds from "./board/ListBackgrounds";
import ListDragPreview from "./board/ListDragPreview";
import ListHeader from "./board/ListHeader";
import {
  BoardHeader,
  CardPosition,
  CardStatus,
  UserLayout,
  CARDS_TOP,
  COLLAPSED_LIST_MAX_HEIGHT,
  DEFAULT_HEADERS,
  DEFAULT_LAYOUT,
  EXPANDED_SPAN,
  GRID_MARGIN,
  ROW_HEIGHT,
  SKELETON_CARD_COUNT,
  boardColumns,
  desktopBoardWidth,
  buildCardLayout,
  cardKey,
  columnAtGridX,
  eventPoint,
  HIDDEN_LIST_ATTR,
  countCardsPerColumn,
  fromGridLayout,
  listHeight,
  mobileBoardWidth,
  normalizeCollapsed,
  normalizeColumns,
  normalizeLayout,
  recolorHeader,
  renameHeader,
  rowsPerColumn,
  snapGridX,
  splitByCollapsed,
  statusForColumn,
  toGridLayout,
  toSavedPositions,
  moveHeader,
  previewHeaders,
  withListKeys,
  toggleCollapsed,
} from "../utils/boardLayout";

const COLLAPSED_STORAGE_KEY = "collapsed_columns";
import { canDeleteCard, canEditCard, getUsername, isAdmin } from "../utils/session";
import { apiErrorMessage } from "../utils/apiError";
import { boardCards, type AnyCardStatus } from "../utils/backlog";

export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [userLayout, setUserLayout] = useState<UserLayout>(DEFAULT_LAYOUT);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  // Listorna delas av alla; admins lägger till, byter namn och färg
  const [headers, setHeaders] = useState<BoardHeader[]>(DEFAULT_HEADERS);
  const [columnsLoaded, setColumnsLoaded] = useState(false);
  // Formuläret "Add new column" är öppet
  const [addingList, setAddingList] = useState(false);
  const [userName, setUserName] = useState("");
  const [admin, setAdmin] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  // Kortet som väntar på bekräftelse i delete-dialogen
  const [deletingCard, setDeletingCard] = useState<Card | null>(null);
  // Kolumnen där ett nytt kort skapas ("Add a card")
  const [creatingIn, setCreatingIn] = useState<CardStatus | null>(null);
  // Kolumnen vars rubrik redigeras
  const [renamingKey, setRenamingKey] = useState<CardStatus | null>(null);
  // Ihopfällda listor: visar bara rubrik och "Add a card"
  const [collapsed, setCollapsed] = useState<CardStatus[]>([]);
  // Gridden följer boardens bredd så att den fyller skärmen
  const { width, containerRef, mounted } = useContainerWidth();
  const boardScrollRef = useRef<HTMLDivElement>(null);

  // 🔥 Hämta card via api.ts (token-rotation ingår)
  const fetchCards = useCallback(async () => {
    try {
      const res = await getCards();
      // Backloggen visas på /backlog, inte på boarden
      setCards(boardCards(res.data || []));
    } catch (err: any) {
      console.error("Error fetching cards:", err.message);
      toast.error(apiErrorMessage(err, "Could not load cards."));
    } finally {
      setCardsLoaded(true);
    }
  }, []);

  useEffect(() => {
    setUserName(getUsername());
    setAdmin(isAdmin());
    fetchCards();
  }, [fetchCards]);

  // 🔥 Hämta layout från server eller localStorage
  useEffect(() => {
    const loadLayout = async () => {
      try {
        const res = await getLayout();
        if (res.status === 200) {
          setUserLayout(normalizeLayout(res.data || {}));
          return;
        }
      } catch (e) {
        console.warn(
          "Could not load layout from server, falling back to localStorage",
        );
      }

      try {
        const saved = localStorage.getItem("user_layout");
        setUserLayout(saved ? normalizeLayout(JSON.parse(saved)) : DEFAULT_LAYOUT);
      } catch {
        setUserLayout(DEFAULT_LAYOUT);
      }
    };

    loadLayout().finally(() => setLayoutLoaded(true));
  }, []);

  // Delade listor; om hämtningen misslyckas visas standardlistorna
  useEffect(() => {
    getColumns()
      .then((res) => setHeaders(normalizeColumns(res.data)))
      .catch((err) => {
        console.error("Error fetching lists:", err.message);
        toast.error(apiErrorMessage(err, "Could not load the lists."));
      })
      .finally(() => setColumnsLoaded(true));
  }, []);

  useEffect(() => {
    try {
      setCollapsed(normalizeCollapsed(JSON.parse(localStorage.getItem(COLLAPSED_STORAGE_KEY) ?? "[]")));
    } catch {
      setCollapsed([]);
    }
  }, []);

  const toggleColumn = (key: CardStatus) => {
    const next = toggleCollapsed(collapsed, key);
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Sparas inte, men fungerar tills sidan laddas om
    }
  };

  // Räknas fram vid varje render, så gridden får aldrig en tom layout som
  // sedan sparas över den riktiga. Väntar på listorna: annars hamnar kort i
  // tillagda listor tillfälligt i första listan och den ordningen sparas
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
  // Admins får plats för "Add new column" sist
  const columns = useMemo(
    () => boardColumns(boardHeaders, collapsed, admin ? EXPANDED_SPAN : 0),
    [boardHeaders, collapsed, admin],
  );
  // Kort snäpper till närmaste synliga lista medan de dras
  const constraints = useMemo<LayoutConstraint[]>(
    () => [
      gridBounds,
      { name: "boardColumn", constrainPosition: (_item, x, y) => ({ x: snapGridX(columns, x), y }) },
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

  // 🔥 Spara layout till server via api.ts
  const saveLayoutToServer = useCallback(
    debounce(async (newLayout: UserLayout) => {
      try {
        await saveLayout(newLayout);
      } catch (e: any) {
        console.error("Failed to save layout to server:", e.message);
        // Fast id: upprepade fel ersätter samma toast i stället för att staplas
        toast.error("Could not save the board layout. It is kept in this browser.", { id: "layout-save" });
      }
    }, 800),
    [],
  );

  const persistLayout = (next: UserLayout) => {
    setUserLayout(next);
    localStorage.setItem("user_layout", JSON.stringify(next));
    saveLayoutToServer(next);
  };

  // Flytta kortet direkt och spara statusen; vid fel flyttas det tillbaka
  const moveCard = async (id: string, status: CardStatus) => {
    const previous = cards.find((fb) => fb._id === id)?.status;
    const setStatus = (s?: AnyCardStatus) =>
      setCards((prev) => prev.map((fb) => (fb._id === id ? { ...fb, status: s } : fb)));

    setStatus(status);
    try {
      await updateCardStatus(id, status);
    } catch (err: any) {
      console.error("Error moving card:", err.message);
      setStatus(previous);
      toast.error(apiErrorMessage(err, "Could not move card."));
    }
  };

  const closeDialog = () => {
    setEditingCard(null);
    setCreatingIn(null);
  };

  const handleCardCreated = () => {
    closeDialog();
    fetchCards();
  };

  const handleCardSaved = (updated: Card) => {
    setCards((prev) => prev.map((fb) => (fb._id === updated._id ? updated : fb)));
    setEditingCard(null);
  };

  const deleteCardCard = async (id: string) => {
    try {
      await deleteCard(id);
      setCards((prev) => prev.filter((fb) => fb._id !== id));
    } catch (err: any) {
      console.error("Error deleting card:", err.message);
      toast.error(apiErrorMessage(err, "Could not delete card."));
    }
  };

  // Admin: listans namn och färg ändras för alla. Visas direkt; vid fel återställs den
  const saveColumn = async (next: BoardHeader[], key: CardStatus) => {
    const column = next.find((h) => h.key === key);
    if (next === headers || !column) return;
    const previous = headers;
    setHeaders(next);
    try {
      await updateColumn(key, { title: column.title, color: column.color ?? null });
    } catch (err: any) {
      console.error("Error updating list:", err.message);
      setHeaders(previous);
      toast.error(apiErrorMessage(err, "Could not update the list."));
    }
  };

  const renameColumn = (key: CardStatus, title: string) => {
    setRenamingKey(null);
    saveColumn(renameHeader(headers, key, title), key);
  };

  // null = standardfärgen
  const recolorColumn = (key: CardStatus, color: string | null) => saveColumn(recolorHeader(headers, key, color), key);

  // Admin: flyttar en lista för alla; korten följer med (de hör till listan via status).
  // Visas direkt; vid fel flyttas listan tillbaka
  const moveList = async (from: CardStatus, to: CardStatus) => {
    const next = moveHeader(headers, from, to);
    if (next === headers) return;
    // Äldre sparade positioner har bara listans index: spara listans key innan ordningen ändras
    if (userLayout.cards?.some((c) => c.status === undefined)) {
      persistLayout({ ...userLayout, cards: withListKeys(headers, userLayout.cards) });
    }
    const previous = headers;
    setHeaders(next);
    try {
      await reorderColumns(next.map((h) => h.key));
    } catch (err: any) {
      console.error("Error moving list:", err.message);
      setHeaders(previous);
      toast.error(apiErrorMessage(err, "Could not move the list."));
    }
  };

  // Listan som dras: dess kort döljs i gridden och visas i förhandsvisningen i stället, i samma ordning
  const dragIndex = draggingList ? boardHeaders.findIndex((h) => h.key === draggingList) : -1;
  const dragLayout = dragIndex < 0 ? [] : visibleLayout.filter((l) => l.x === dragIndex).sort((a, b) => a.y - b.y);
  const draggedCardIds = new Set(dragLayout.map((l) => l.i));
  const cardById = new Map(cards.map((fb, i) => [cardKey(fb, i), fb]));
  const dragCards = dragLayout.flatMap((l) => cardById.get(l.i) ?? []);

  // Admin: ny lista sist på boarden, för alla. Tomt namn stänger formuläret
  const addList = async (title: string) => {
    if (!title.trim()) {
      setAddingList(false);
      return;
    }
    try {
      const res = await createColumn({ title: title.trim() });
      setHeaders((prev) => normalizeColumns([...prev, res.data]));
      setAddingList(false);
    } catch (err: any) {
      console.error("Error adding list:", err.message);
      toast.error(apiErrorMessage(err, "Could not add the list."));
    }
  };

  // Antal kort per kolumn: visas i rubriken och styr listans höjd
  const columnCounts = countCardsPerColumn(boardHeaders, gridLayout);
  // Skeleton-korten visas medan kort, layout och listor hämtas
  const boardLoading = !cardsLoaded || !layoutLoaded || !columnsLoaded;
  const columnRows = rowsPerColumn(
    boardLoading ? columnCounts.map(() => SKELETON_CARD_COUNT) : columnCounts,
    columns,
  );
  const columnGrid = {
    padding: `0 ${GRID_MARGIN}px`,
    gap: GRID_MARGIN,
    gridTemplateColumns: `repeat(${columns.units}, 1fr)`,
  };

  return (
    <div id="cards-container" className="flex flex-1 flex-col font-jira">
      {/* Mobil: varje lista är en skärm bred och man sveper mellan dem (snap).
          md och uppåt: alla listor får plats i skärmens bredd */}
      <div
        ref={boardScrollRef}
        className="board-scroll flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain md:snap-none"
        style={{ scrollPaddingInline: GRID_MARGIN }}
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

            {admin && (
              <AddListForm
                open={addingList}
                onOpen={() => setAddingList(true)}
                onClose={() => setAddingList(false)}
                onSubmit={addList}
              />
            )}
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
              margin={[GRID_MARGIN, GRID_MARGIN]}
              containerPadding={[GRID_MARGIN, CARDS_TOP]}
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

      <DeleteCardDialog card={deletingCard} onClose={() => setDeletingCard(null)} onConfirm={deleteCardCard} />
    </div>
  );
}
