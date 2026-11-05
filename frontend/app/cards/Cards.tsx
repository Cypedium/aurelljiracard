"use client";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import { gridBounds, type LayoutConstraint } from "react-grid-layout/core";
import { EyeIcon, EyeSlashIcon, PencilIcon, PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/16/solid";
import IssueTypeIcon from "../components/IssueTypeIcon";
import ColumnColorPicker from "../components/ColumnColorPicker";
import TopScrollbar from "../components/TopScrollbar";
import debounce from "lodash.debounce";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { Skeleton } from "../components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
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
import CardForm from "./card/Card";
import { Button } from "../components/ui/button";
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
  HEADER_HEIGHT,
  HEADER_TITLE_MAX_LENGTH,
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
  defaultListColor,
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
  withListKeys,
  toggleCollapsed,
} from "../utils/boardLayout";

const COLLAPSED_STORAGE_KEY = "collapsed_columns";
import { avatarColor, avatarInitials } from "../utils/avatar";
import { canDeleteCard, canEditCard, getUsername, isAdmin } from "../utils/session";
import { formatShortDate } from "../utils/date";
import { apiErrorMessage } from "../utils/apiError";
import { assigneeOf, boardCards, type AnyCardStatus } from "../utils/backlog";
import { CARD_ACTION_CLASS, CARD_HOVER_CLASS, LIST_BUTTON_HOVER_CLASS, listColor } from "../utils/styles";

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
  const gridLayout = useMemo(
    () =>
      layoutLoaded && columnsLoaded
        ? buildCardLayout(
            headers,
            cards.map((fb, i) => ({ id: cardKey(fb, i), status: fb.status })),
            userLayout.cards,
          )
        : [],
    [headers, cards, userLayout.cards, layoutLoaded, columnsLoaded],
  );

  const { visible: visibleLayout, hidden: hiddenLayout } = splitByCollapsed(headers, gridLayout, collapsed);
  const visibleIds = new Set(visibleLayout.map((l) => l.i));

  // Dolda listor blir smala remsor; gridden räknar i enheter i stället för kolumner.
  // Admins får plats för "Add new column" sist
  const columns = useMemo(
    () => boardColumns(headers, collapsed, admin ? EXPANDED_SPAN : 0),
    [headers, collapsed, admin],
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
    toSavedPositions(headers, [...fromGridLayout(currentLayout, columns), ...hiddenLayout]);

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

  const dialogOpen = Boolean(editingCard || creatingIn);
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

  // Admin: listan som dras i sin rubrik och listan den är över (markeras)
  const [draggingList, setDraggingList] = useState<CardStatus | null>(null);
  const [listDropTarget, setListDropTarget] = useState<CardStatus | null>(null);
  const endListDrag = () => {
    setDraggingList(null);
    setListDropTarget(null);
  };

  // Admin: flyttar en lista för alla; korten följer med (de hör till listan via status).
  // Visas direkt; vid fel flyttas listan tillbaka
  const moveList = async (from: CardStatus, to: CardStatus) => {
    endListDrag();
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

  // Mål för en lista som dras: hela listan (eller remsan för en dold lista)
  const listDropProps = (key: CardStatus) =>
    draggingList
      ? {
          onDragOver: (e: React.DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setListDropTarget(key);
          },
          onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            moveList(draggingList, key);
          },
        }
      : {};
  const listDropClass = (key: CardStatus) =>
    draggingList && listDropTarget === key && draggingList !== key ? "rounded-xl ring-2 ring-white" : "";

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
  const columnCounts = countCardsPerColumn(headers, gridLayout);
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
      {/* <div className="mb-4 rounded-xl bg-black/25 px-5 py-3 backdrop-blur-sm">
        <h1 className="text-xl font-bold text-white">Jira Board</h1>
      </div> */}
      {/* Mobil: varje lista är en skärm bred och man sveper mellan dem (snap).
          md och uppåt: scrollbaren ligger överst, under navbaren */}
      <TopScrollbar target={boardScrollRef} className="mb-2 hidden md:block" />
      <div
        ref={boardScrollRef}
        className="board-scroll board-scroll-top-md flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain md:snap-none"
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
          {/* Listornas bakgrund, under korten */}
          <div className="pointer-events-none absolute inset-0 grid items-start" style={columnGrid}>
            {headers.map((h, i) =>
              columns.spans[i].collapsed ? (
                // Remsan ritas i rubriklagret
                <div key={h.key} className="snap-start" />
              ) : (
                <div
                  key={h.key}
                  className={`snap-start rounded-xl shadow-[0_1px_1px_rgba(9,30,66,0.25)] ${listColor(h).className}`}
                  style={{
                    gridColumn: `span ${columns.spans[i].span}`,
                    height: listHeight(columnRows[i]),
                    ...listColor(h).style,
                  }}
                />
              ),
            )}
          </div>

          {/* Rubrik (admin: klicka för att byta namn) och "Add a card", ovanför gridden så att de går att klicka */}
          <div className="pointer-events-none absolute inset-0 z-[1] grid items-start" style={columnGrid}>
            {headers.map((h, i) =>
              columns.spans[i].collapsed ? (
                <button
                  key={h.key}
                  type="button"
                  aria-label={`Show ${h.title}`}
                  aria-expanded={false}
                  title="Show list"
                  {...{ [HIDDEN_LIST_ATTR]: h.key }}
                  {...listDropProps(h.key)}
                  className={`pointer-events-auto flex min-w-0 flex-col items-center gap-3 overflow-hidden rounded-xl px-1 py-3 shadow-[0_1px_1px_rgba(9,30,66,0.25)] hover:brightness-95 ${
                    dropTarget === h.key ? "ring-2 ring-white brightness-95" : ""
                  } ${listDropClass(h.key)} ${listColor(h).className}`}
                  style={{ maxHeight: COLLAPSED_LIST_MAX_HEIGHT, ...listColor(h).style }}
                  onClick={() => toggleColumn(h.key)}
                >
                  <EyeIcon className="size-4 shrink-0 opacity-80" aria-hidden />
                  {/* Rubriken läses uppifrån och ner, som i Trello */}
                  <span className="min-h-0 truncate text-sm font-semibold [writing-mode:vertical-rl]">{h.title}</span>
                  <span className="shrink-0 text-sm opacity-80">{boardLoading ? null : columnCounts[i]}</span>
                </button>
              ) : (
              <div
                key={h.key}
                // Medan en lista dras tar hela listan emot den
                className={`flex flex-col px-2 ${draggingList ? "pointer-events-auto" : ""} ${listDropClass(h.key)} ${
                  draggingList === h.key ? "opacity-60" : ""
                }`}
                style={{ gridColumn: `span ${columns.spans[i].span}`, height: listHeight(columnRows[i]) }}
                {...listDropProps(h.key)}
              >
                <div
                  // Admin: dra i rubriken för att flytta listan (för alla)
                  draggable={admin && renamingKey !== h.key}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    // Firefox startar bara en drag med data
                    e.dataTransfer.setData("text/plain", h.key);
                    // Efter dragstart: att ändra DOM:en i dragstart avbryter dragningen i Chrome
                    setTimeout(() => setDraggingList(h.key));
                  }}
                  onDragEnd={endListDrag}
                  title={admin ? "Drag to move the list (for everyone)" : undefined}
                  className={`flex items-center gap-2 pr-1 ${admin ? "pointer-events-auto cursor-grab" : ""} ${listColor(h).className}`}
                  style={{ height: HEADER_HEIGHT, ...listColor(h).style }}
                >
                  {renamingKey === h.key ? (
                    <input
                      autoFocus
                      aria-label="Column name"
                      maxLength={HEADER_TITLE_MAX_LENGTH}
                      defaultValue={h.title}
                      onFocus={(e) => e.currentTarget.select()}
                      onBlur={(e) => renameColumn(h.key, e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") {
                          // Ångra: blur sparar då samma namn, dvs ingenting
                          e.currentTarget.value = h.title;
                          e.currentTarget.blur();
                        }
                      }}
                      className="pointer-events-auto min-w-0 flex-1 rounded-md bg-white px-2 py-1 text-sm font-semibold text-jira-text ring-2 ring-jira-focus outline-none"
                    />
                  ) : admin ? (
                    <button
                      type="button"
                      title="Click to rename (for everyone)"
                      className="pointer-events-auto min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-sm font-semibold"
                      onClick={() => setRenamingKey(h.key)}
                    >
                      <span className="inline-block hover:bg-black/10 rounded px-1">
                        {h.title}
                      </span>
                    </button>
                  ) : (
                    <span className="min-w-0 flex-1 truncate px-2 py-1 text-sm font-semibold" title={h.title}>
                      {h.title}
                    </span>
                  )}
                  <span className="text-sm opacity-80">{boardLoading ? null : columnCounts[i]}</span>
                  {admin && (
                    <ColumnColorPicker
                      title={h.title}
                      color={h.color}
                      defaultColor={defaultListColor(h.key)}
                      onChange={(color) => recolorColumn(h.key, color)}
                    />
                  )}
                  <button
                    type="button"
                    aria-label={`Hide ${h.title}`}
                    aria-expanded
                    title="Hide list"
                    className="pointer-events-auto rounded-md p-1 opacity-70 hover:bg-black/10 hover:opacity-100"
                    onClick={() => toggleColumn(h.key)}
                  >
                    <EyeSlashIcon className="size-4" aria-hidden />
                  </button>
                </div>
                <button
                  type="button"
                  className={`pointer-events-auto flex h-8 shrink-0 items-center gap-2 rounded-lg px-2 text-sm font-medium ${LIST_BUTTON_HOVER_CLASS} ${listColor(h).className}`}
                  style={listColor(h).style}
                  onClick={() => setCreatingIn(h.key)}
                >
                  <PlusIcon className="size-4" aria-hidden />
                  Add a card
                </button>
              </div>
              ),
            )}

            {/* Admin: ny lista sist på boarden (platsen räknas in i columns.units) */}
            {admin && (
              <div className="snap-start px-2" style={{ gridColumn: `span ${EXPANDED_SPAN}` }}>
                {addingList ? (
                  <form
                    className="pointer-events-auto flex flex-col gap-2 rounded-xl bg-jira-lane p-2 shadow-[0_1px_1px_rgba(9,30,66,0.25)]"
                    onSubmit={(e) => {
                      e.preventDefault();
                      addList(new FormData(e.currentTarget).get("title")?.toString() ?? "");
                    }}
                  >
                    <input
                      autoFocus
                      name="title"
                      aria-label="List name"
                      placeholder="Enter list name…"
                      maxLength={HEADER_TITLE_MAX_LENGTH}
                      onKeyDown={(e) => e.key === "Escape" && setAddingList(false)}
                      className="rounded-md bg-white px-2 py-1.5 text-sm text-jira-text ring-2 ring-jira-focus outline-none"
                    />
                    <div className="flex items-center gap-1">
                      <Button type="submit" size="sm">
                        Add list
                      </Button>
                      <button
                        type="button"
                        aria-label="Cancel"
                        className="rounded-md p-1.5 text-jira-secondary hover:bg-black/10"
                        onClick={() => setAddingList(false)}
                      >
                        <XMarkIcon className="size-4" aria-hidden />
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="pointer-events-auto flex w-fit items-center gap-2 rounded-xl bg-white/25 px-3 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/35"
                    onClick={() => setAddingList(true)}
                  >
                    <PlusIcon className="size-4" aria-hidden />
                    Add new column
                  </button>
                )}
              </div>
            )}
          </div>

          {boardLoading && (
            <div
              className="pointer-events-none absolute inset-0 grid items-start"
              style={{ ...columnGrid, padding: `${CARDS_TOP}px ${GRID_MARGIN}px 0` }}
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
          )}

          {!layoutLoaded || !mounted ? null : visibleLayout.length > 0 && (
            <ResponsiveGridLayout
              // Ny gridd när antalet enheter eller listornas ordning ändras (lista döljs, visas eller flyttas): annars räknar
              // react-grid-layout om de gamla positionerna och korten hamnar fel
              key={`${columns.units}:${headers.map((h) => h.key).join()}`}
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
                  const moved = cards.find((fb, i) => cardKey(fb, i) === newItem.i);
                  if (moved?._id) moveCard(moved._id, hiddenTarget);
                  return;
                }
                const from = columnAtGridX(columns, oldItem.x);
                const to = columnAtGridX(columns, newItem.x);
                if (from === to) return;
                // Spara radordningen direkt så att kortet inte hoppar när statusen ändras
                persistLayout({ ...userLayout, cards: savedPositions(currentLayout) });
                const card = cards.find((fb, i) => cardKey(fb, i) === newItem.i);
                if (card?._id) moveCard(card._id, statusForColumn(headers, to));
              }}
            >
              {cards.filter((fb, i) => visibleIds.has(cardKey(fb, i))).map((fb) => (
                <div
                  key={fb._id || fb.username + fb.submittedAt}
                  // Luft mellan kortet och kolumnens kanter
                  className="px-2"
                >
                  <div
                    className="group relative flex h-full cursor-grab flex-col gap-2 overflow-hidden rounded-lg bg-white p-3 text-sm text-jira-text shadow-[0_1px_1px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)] hover:ring-2 hover:ring-jira-focus hover:ring-inset"
                  >
                    <p
                      className="line-clamp-3 leading-5 wrap-anywhere"
                      title={fb.comment}
                    >
                      {fb.comment}
                    </p>

                    <div className="mt-auto flex items-center gap-1.5">
                      <IssueTypeIcon type={fb.type} />
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase text-jira-secondary">
                        {fb.productId}
                      </span>

                      {/* Datum, edit och delete (syns vid hover) */}
                      <span
                        className={`shrink-0 rounded-[3px] text-xs/5 font-bold text-jira-secondary ${CARD_HOVER_CLASS}`}
                      >
                        {formatShortDate(fb.submittedAt)}
                      </span>

                      <div className="flex shrink-0 items-center">
                        {/* Edit och delete på egna kort, eller alla för admin */}
                        {canEditCard(fb, userName, admin) && (
                          <button
                            className={CARD_ACTION_CLASS}
                            aria-label="Edit card"
                            title="Edit"
                            onClick={() => setEditingCard(fb)}
                          >
                            <PencilIcon className="size-4" aria-hidden />
                          </button>
                        )}
                        {canDeleteCard(fb, userName, admin) && (
                          <button
                            className={CARD_ACTION_CLASS}
                            aria-label="Delete card"
                            title="Delete"
                            onClick={() => setDeletingCard(fb)}
                          >
                            <TrashIcon className="size-4" aria-hidden />
                          </button>
                        )}
                      </div>

                      <span
                        className="min-w-5 shrink-0 rounded-full bg-jira-neutral px-1.5 text-center text-xs/4"
                        title={`Time tracking: ${fb.rating}/5`}
                      >
                        {fb.rating}
                      </span>
                      <span
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                        style={{ background: avatarColor(assigneeOf(fb)) }}
                        title={`Assignee: ${assigneeOf(fb)}`}
                      >
                        {avatarInitials(assigneeOf(fb))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </ResponsiveGridLayout>
          )}
        </div>
      </div>

      {/* Radix sköter fokus, Escape, klick utanför och scroll-lås */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          // Formuläret har egen bakgrund och skugga
          className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto border-0 bg-transparent p-0 font-jira shadow-none sm:max-w-[640px]"
        >
          {/* Formulärets synliga rubrik är en vanlig h2, så dialogen får en dold titel */}
          <DialogTitle className="sr-only">{editingCard ? "Edit card" : "Create card"}</DialogTitle>
          <CardForm
            card={editingCard ?? undefined}
            status={creatingIn ?? undefined}
            onSaved={handleCardSaved}
            onCreated={handleCardCreated}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingCard)} onOpenChange={(open) => !open && setDeletingCard(null)}>
        <AlertDialogContent className="font-jira text-jira-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription className="line-clamp-3 wrap-anywhere">
              {deletingCard?.productId}: {deletingCard?.comment}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deletingCard?._id && deleteCardCard(deletingCard._id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
