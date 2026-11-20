import type { Card } from "../../api/endpoints";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import type { CardStatus } from "../../utils/boardLayout";
import CardForm from "../card/Card";
import { toPlainText } from "../../utils/summaryFormat";

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
  return (
    <Dialog open={Boolean(editingCard || creatingIn)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        // The form has its own background and shadow
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto border-0 bg-transparent p-0 font-jira shadow-none sm:max-w-[640px]"
      >
        {/* The form's visible heading is a plain h2, so the dialog gets a hidden title */}
        <DialogTitle className="sr-only">{editingCard ? "Edit card" : "Create card"}</DialogTitle>
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
  return (
    <AlertDialog open={Boolean(card)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="font-jira text-jira-text">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this card?</AlertDialogTitle>
          <AlertDialogDescription className="line-clamp-3 wrap-anywhere">
            {card?.productId}: {toPlainText(card?.comment ?? "")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => card?._id && onConfirm(card._id)}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
