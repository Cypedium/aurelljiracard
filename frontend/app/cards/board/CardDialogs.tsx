import type { Card } from "../../api/endpoints";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";
import ConfirmDialog from "../../components/ConfirmDialog";
import type { CardStatus } from "../../utils/boardLayout";
import CardForm from "../card/Card";
import { toPlainText } from "../../utils/summaryFormat";
import { useLanguage } from "../../hooks/useLanguage";

type CardFormDialogProps = {
  // The card being edited, or the list where a new card is created
  editingCard: Card | null;
  creatingIn: CardStatus | null;
  onSaved: (card: Card) => void;
  onCreated: () => void;
  onClose: () => void;
};

// Create or edit a card. Radix handles focus, Escape, clicks outside and scroll lock
export function CardFormDialog({ editingCard, creatingIn, onSaved, onCreated, onClose }: CardFormDialogProps) {
  const { t } = useLanguage();
  return (
    <Dialog open={Boolean(editingCard || creatingIn)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        // The form has its own background and shadow
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto border-0 bg-transparent p-0 font-jira shadow-none sm:max-w-[640px]"
      >
        {/* The form's visible heading is a plain h2, so the dialog gets a hidden title */}
        <DialogTitle className="sr-only">{editingCard ? t("Edit card") : t("Create card")}</DialogTitle>
        <CardForm
          card={editingCard ?? undefined}
          status={creatingIn ?? undefined}
          onSaved={onSaved}
          onCreated={onCreated}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

type DeleteCardDialogProps = {
  // The card waiting for confirmation
  card: Card | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
};

export function DeleteCardDialog({ card, onClose, onConfirm }: DeleteCardDialogProps) {
  const { t } = useLanguage();
  return (
    <ConfirmDialog
      open={Boolean(card)}
      onClose={onClose}
      title={t("Delete this card?")}
      description={`${card?.productId ?? ""}: ${toPlainText(card?.comment ?? "")}`}
      descriptionClassName="line-clamp-3 wrap-anywhere"
      onConfirm={() => card?._id && onConfirm(card._id)}
    />
  );
}
