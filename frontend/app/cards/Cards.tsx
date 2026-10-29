"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/16/solid";
import IssueTypeIcon from "../components/IssueTypeIcon";
import ColumnColorPicker from "../components/ColumnColorPicker";
import debounce from "lodash.debounce";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
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
import api from "../api/api"; // ⭐ axios-instansen
import { deleteCard, updateCardStatus, type Card } from "../api/endpoints";
import CardForm from "./card/Card";
import {
  CardStatus,
  UserLayout,
  BOARD_COLS,
  DEFAULT_LIST_COLORS,
  DEFAULT_HEADERS,
  DEFAULT_LAYOUT,
  GRID_MARGIN,
  HEADER_HEIGHT,
  HEADER_TITLE_MAX_LENGTH,
  ROW_HEIGHT,
  buildCardLayout,
  cardKey,
  listHeight,
  normalizeLayout,
  recolorHeader,
  renameHeader,
  statusForColumn,
  toSavedPositions,
} from "../utils/boardLayout";
import { avatarColor, avatarInitials } from "../utils/avatar";
import { getUsername } from "../utils/session";
import { apiErrorMessage } from "../utils/apiError";
import { CARD_ACTION_CLASS, CARD_HOVER_CLASS, listColor } from "../utils/styles";

export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);
  const [userLayout, setUserLayout] = useState<UserLayout>(DEFAULT_LAYOUT);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const [userName, setUserName] = useState("");
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  // Kortet som väntar på bekräftelse i delete-dialogen
  const [deletingCard, setDeletingCard] = useState<Card | null>(null);
  // Kolumnen där ett nytt kort skapas ("Add a card")
  const [creatingIn, setCreatingIn] = useState<CardStatus | null>(null);
  // Kolumnen vars rubrik redigeras
  const [renamingKey, setRenamingKey] = useState<CardStatus | null>(null);
  // Gridden följer boardens bredd så att den fyller skärmen
  const { width, containerRef, mounted } = useContainerWidth();

  // 🔥 Hämta card via api.ts (token-rotation ingår)
  const fetchCards = useCallback(async () => {
    try {
      const res = await api.get("/card");
      setCards(res.data || []);
    } catch (err: any) {
      console.error("Error fetching cards:", err.message);
      toast.error(apiErrorMessage(err, "Could not load cards."));
    }
  }, []);

  useEffect(() => {
    setUserName(getUsername());
    fetchCards();
  }, [fetchCards]);

  // 🔥 Hämta layout från server eller localStorage
  useEffect(() => {
    const loadLayout = async () => {
      try {
        const res = await api.get("/user/layout");
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

  // Räknas fram vid varje render, så gridden får aldrig en tom layout som
  // sedan sparas över den riktiga
  const gridLayout = useMemo(
    () =>
      layoutLoaded
        ? buildCardLayout(
            cards.map((fb, i) => ({ id: cardKey(fb, i), status: fb.status })),
            userLayout.cards,
          )
        : [],
    [cards, userLayout.cards, layoutLoaded],
  );

  // 🔥 Spara layout till server via api.ts
  const saveLayoutToServer = useCallback(
    debounce(async (newLayout: UserLayout) => {
      try {
        await api.put("/user/layout", newLayout);
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
    const setStatus = (s?: CardStatus) =>
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

  // Byt namn på en kolumn (bara för den här användaren, sparas i layouten)
  const renameColumn = (key: CardStatus, title: string) => {
    setRenamingKey(null);
    const headers = renameHeader(userLayout.headers, key, title);
    if (headers !== userLayout.headers) persistLayout({ ...userLayout, headers });
  };

  // Byt listfärg (bara för den här användaren); null = standardfärgen
  const recolorColumn = (key: CardStatus, color: string | null) => {
    const headers = recolorHeader(userLayout.headers, key, color);
    if (headers !== userLayout.headers) persistLayout({ ...userLayout, headers });
  };

  // Antal kort per kolumn: visas i rubriken och styr listans höjd
  const columnCounts = DEFAULT_HEADERS.map(
    (_, i) => gridLayout.filter((l) => l.x === i).length,
  );
  const columnGrid = {
    padding: `0 ${GRID_MARGIN}px`,
    gap: GRID_MARGIN,
    gridTemplateColumns: `repeat(${BOARD_COLS}, 1fr)`,
  };

  return (
    <div id="cards-container" className="font-jira">
      {/* <div className="mb-4 rounded-xl bg-black/25 px-5 py-3 backdrop-blur-sm">
        <h1 className="text-xl font-bold text-white">Jira Board</h1>
      </div> */}
      <div className="overflow-x-auto">
        <div
          ref={containerRef}
          className="relative w-full min-w-[720px]"
          style={{ minHeight: Math.max(...columnCounts.map(listHeight)) + GRID_MARGIN }}
        >
          {/* Listornas bakgrund, under korten */}
          <div className="pointer-events-none absolute inset-0 grid items-start" style={columnGrid}>
            {userLayout.headers.map((h, i) => (
              <div
                key={h.key}
                className={`rounded-xl shadow-[0_1px_1px_rgba(9,30,66,0.25)] ${listColor(h).className}`}
                style={{ height: listHeight(columnCounts[i]), ...listColor(h).style }}
              />
            ))}
          </div>

          {/* Rubrik (klicka för att byta namn) och "Add a card", ovanför gridden så att de går att klicka */}
          <div className="pointer-events-none absolute inset-0 z-[1] grid items-start" style={columnGrid}>
            {userLayout.headers.map((h, i) => (
              <div
                key={h.key}
                className="flex flex-col justify-between px-2 pb-2"
                style={{ height: listHeight(columnCounts[i]) }}
              >
                <div
                  className={`flex items-center gap-2 pr-1 ${listColor(h).className}`}
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
                  ) : (
                    <button
                      type="button"
                      title="Click to rename"
                      className="pointer-events-auto min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-sm font-semibold hover:bg-black/10"
                      onClick={() => setRenamingKey(h.key)}
                    >
                      {h.title}
                    </button>
                  )}
                  <span className="text-sm opacity-80">{columnCounts[i]}</span>
                  <ColumnColorPicker
                    title={h.title}
                    color={h.color}
                    defaultColor={DEFAULT_LIST_COLORS[h.key]}
                    onChange={(color) => recolorColumn(h.key, color)}
                  />
                </div>
                <button
                  type="button"
                  className={`pointer-events-auto flex h-8 items-center gap-2 rounded-lg px-2 text-sm font-medium hover:bg-black/10 ${listColor(h).className}`}
                  style={listColor(h).style}
                  onClick={() => setCreatingIn(h.key)}
                >
                  <PlusIcon className="size-4" aria-hidden />
                  Add a card
                </button>
              </div>
            ))}
          </div>

          {!layoutLoaded || !mounted ? null : cards.length > 0 && (
            <ResponsiveGridLayout
              className="gridLayout"
              layouts={{ lg: gridLayout }}
              breakpoints={{ lg: 0 }}
              cols={{ lg: BOARD_COLS }}
              rowHeight={ROW_HEIGHT}
              width={width}
              margin={[GRID_MARGIN, GRID_MARGIN]}
              containerPadding={[GRID_MARGIN, HEADER_HEIGHT]}
              dragConfig={{ cancel: ".no-drag" }}
              // Korten har fast storlek (1x1), så inget resize-handtag
              resizeConfig={{ enabled: false }}
              onLayoutChange={(currentLayout) => {
                persistLayout({ ...userLayout, cards: toSavedPositions(currentLayout) });
              }}
              onDragStop={(currentLayout, oldItem, newItem) => {
                if (!oldItem || !newItem || oldItem.x === newItem.x) return;
                // Spara radordningen direkt så att kortet inte hoppar när statusen ändras
                persistLayout({ ...userLayout, cards: toSavedPositions(currentLayout) });
                const card = cards.find((fb, i) => cardKey(fb, i) === newItem.i);
                if (card?._id) moveCard(card._id, statusForColumn(newItem.x));
              }}
            >
              {cards.map((fb) => (
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
                        className={`shrink-0 rounded-[3px] bg-jira-hover px-1.5 text-xs/5 font-bold text-jira-secondary ${CARD_HOVER_CLASS}`}
                      >
                        {/* yy-mm-dd, t.ex. 26-10-19 */}
                        {fb.submittedAt.substring(2, 10)}
                      </span>

                      <div className="flex shrink-0 items-center">
                        {userName === fb.username && fb._id && (
                          <button
                            className={CARD_ACTION_CLASS}
                            aria-label="Edit card"
                            title="Edit"
                            onClick={() => setEditingCard(fb)}
                          >
                            <PencilIcon className="size-4" aria-hidden />
                          </button>
                        )}

                        <button
                          className={CARD_ACTION_CLASS}
                          aria-label="Delete card"
                          title="Delete"
                          onClick={() => {
                            if (userName !== fb.username) {
                              toast.error("You can only delete your own card.");
                            } else if (!fb._id) {
                              toast.error("Card ID is missing. Cannot delete.");
                            } else {
                              setDeletingCard(fb);
                            }
                          }}
                        >
                          <TrashIcon className="size-4" aria-hidden />
                        </button>
                      </div>

                      <span
                        className="min-w-5 shrink-0 rounded-full bg-jira-neutral px-1.5 text-center text-xs/4"
                        title={`Time tracking: ${fb.rating}/5`}
                      >
                        {fb.rating}
                      </span>
                      <span
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                        style={{ background: avatarColor(fb.username) }}
                        title={fb.username}
                      >
                        {avatarInitials(fb.username)}
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
