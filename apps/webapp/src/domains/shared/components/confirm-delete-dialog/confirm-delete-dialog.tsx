import { useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertTriangle,
  Button,
  Input,
  Label,
} from "@hikai/ui";

export interface ConfirmDeleteDialogTranslations {
  title: string;
  description: string;
  warningMessage: string;
  consequencesMessage?: string;
  confirmLabel: string;
  confirmButtonLabel: string;
  confirmingLabel: string;
  cancelLabel: string;
}

interface ConfirmDeleteDialogBaseProps {
  entityName: string;
  translations: ConfirmDeleteDialogTranslations;
  onConfirm: () => Promise<unknown>;
  onSuccess?: () => void;
  errorTransform?: (error: Error) => string;
}

interface ConfirmDeleteDialogTriggerProps extends ConfirmDeleteDialogBaseProps {
  children: React.ReactNode;
  open?: never;
  onOpenChange?: never;
}

interface ConfirmDeleteDialogControlledProps
  extends ConfirmDeleteDialogBaseProps {
  children?: never;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export type ConfirmDeleteDialogProps =
  | ConfirmDeleteDialogTriggerProps
  | ConfirmDeleteDialogControlledProps;

export function ConfirmDeleteDialog({
  entityName,
  translations,
  onConfirm,
  onSuccess,
  errorTransform,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ConfirmDeleteDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? controlledOnOpenChange!
    : setInternalOpen;

  const isConfirmValid = confirmText === entityName;

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      const errorMessage = errorTransform
        ? errorTransform(errorInstance)
        : errorInstance.message;
      setError(errorMessage);
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (isDeleting) return;

    if (!newOpen) {
      setConfirmText("");
      setError(null);
    }
    setOpen(newOpen);
  };

  const dialogContent = (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{translations.title}</AlertDialogTitle>
        <AlertDialogDescription>{translations.description}</AlertDialogDescription>
      </AlertDialogHeader>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{translations.warningMessage}</AlertDescription>
      </Alert>

      {translations.consequencesMessage && (
        <p className="text-fontSize-sm text-muted-foreground">
          {translations.consequencesMessage}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="confirm-delete-name">{translations.confirmLabel}</Label>
        <Input
          id="confirm-delete-name"
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={entityName}
          disabled={isDeleting}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AlertDialogFooter>
        <AlertDialogCancel disabled={isDeleting}>
          {translations.cancelLabel}
        </AlertDialogCancel>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={!isConfirmValid || isDeleting}
        >
          {isDeleting
            ? translations.confirmingLabel
            : translations.confirmButtonLabel}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  );

  if (children) {
    return (
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
        {dialogContent}
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {dialogContent}
    </AlertDialog>
  );
}
