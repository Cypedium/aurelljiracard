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

type CardFormDialogProps = {
  // Kortet som redigeras, eller listan där ett nytt kort skapas
  editingCard: Card | null;
  creatingIn: CardStatus | null;
  onSaved: (card: Card) => void;
  onCreated: () => void;
  onClose: () => void;
};

// Skapa eller redigera ett kort. Radix sköter fokus, Escape, klick utanför och scroll-lås
export function CardFormDialog({ editingCard, creatingIn, onSaved, onCreated, onClose }: CardFormDialogProps) {
  return (
    <Dialog open={Boolean(editingCard || creatingIn)} onOpenChange={(open) => !open && onClose()}>
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
          onSaved={onSaved}
          onCreated={onCreated}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

type DeleteCardDialogProps = {
  // Kortet som väntar på bekräftelse
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
            {card?.productId}: {card?.comment}
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
