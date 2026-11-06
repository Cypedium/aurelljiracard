import { PlusIcon, XMarkIcon } from "@heroicons/react/16/solid";
import { Button } from "../../components/ui/button";
import { EXPANDED_SPAN, HEADER_TITLE_MAX_LENGTH } from "../../utils/boardLayout";

type Props = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSubmit: (title: string) => void;
};

// Admin: ny lista sist på boarden (platsen räknas in i columns.units)
export default function AddListForm({ open, onOpen, onClose, onSubmit }: Props) {
  return (
    <div className="snap-start px-2" style={{ gridColumn: `span ${EXPANDED_SPAN}` }}>
      {open ? (
        <form
          className="pointer-events-auto flex flex-col gap-2 rounded-xl bg-jira-lane p-2 shadow-[0_1px_1px_rgba(9,30,66,0.25)]"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(new FormData(e.currentTarget).get("title")?.toString() ?? "");
          }}
        >
          <input
            autoFocus
            name="title"
            aria-label="List name"
            placeholder="Enter list name…"
            maxLength={HEADER_TITLE_MAX_LENGTH}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
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
              onClick={onClose}
            >
              <XMarkIcon className="size-4" aria-hidden />
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="pointer-events-auto flex w-fit items-center gap-2 rounded-xl bg-white/25 px-3 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/35"
          onClick={onOpen}
        >
          <PlusIcon className="size-4" aria-hidden />
          Add new column
        </button>
      )}
    </div>
  );
}
