import { XMarkIcon } from "@heroicons/react/16/solid";
import { Button } from "../../components/ui/button";
import { EXPANDED_SPAN, HEADER_TITLE_MAX_LENGTH } from "../../utils/boardLayout";
import { useLanguage } from "../../hooks/useLanguage";

type Props = {
  onClose: () => void;
  onSubmit: (title: string) => void;
};

// Admin: a new list at the end of the board, opened from the navbar's "Create column" (its space is counted in columns.units)
export default function AddListForm({ onClose, onSubmit }: Props) {
  const { t } = useLanguage();
  return (
    <div className="snap-start px-2" style={{ gridColumn: `span ${EXPANDED_SPAN}` }}>
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
          aria-label={t("List name")}
          placeholder={t("Enter list name…")}
          maxLength={HEADER_TITLE_MAX_LENGTH}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          className="rounded-md bg-white px-2 py-1.5 text-sm text-jira-text ring-2 ring-jira-focus outline-none"
        />
        <div className="flex items-center gap-1">
          <Button type="submit" size="sm">
            {t("Create Column")}
          </Button>
          <button
            type="button"
            aria-label={t("Cancel")}
            className="rounded-md p-1.5 text-jira-secondary hover:bg-black/10"
            onClick={onClose}
          >
            <XMarkIcon className="size-4" aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}
