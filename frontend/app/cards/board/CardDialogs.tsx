import type { Card } from "../../api/endpoints";
import FormDialog from "../../components/FormDialog";
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

// Create or edit a card
export function CardFormDialog({ editingCard, creatingIn, onSaved, onCreated, onClose }: CardFormDialogProps) {
  const { t } = useLanguage();
  return (
    <FormDialog
      open={Boolean(editingCard || creatingIn)}
      onClose={onClose}
      title={editingCard ? t("Edit card") : t("Create card")}
    >
      <CardForm
        card={editingCard ?? undefined}
        status={creatingIn ?? undefined}
        onSaved={onSaved}
        onCreated={onCreated}
        onCancel={onClose}
      />
    </FormDialog>
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
