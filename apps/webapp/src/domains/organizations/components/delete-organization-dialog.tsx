import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Alert,
  AlertDescription,
  Input,
  AlertTriangle,
} from "@hikai/ui";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@hikai/convex";
import { Id } from "@hikai/convex/convex/_generated/dataModel";

interface DeleteOrganizationDialogProps {
  organizationId: Id<"organizations">;
  organizationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteOrganizationDialog({
  organizationId,
  organizationName,
  open,
  onOpenChange,
}: DeleteOrganizationDialogProps) {
  const { t } = useTranslation("organizations");
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteOrganization = useMutation(
    api.organizations.organizations.deleteOrganization
  );

  const isConfirmValid = confirmText === organizationName;

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteOrganization({ organizationId });
      onOpenChange(false);
      // Navigate to home after deletion
      navigate({ to: "/" });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      if (errorMessage === "CANNOT_DELETE_PERSONAL_ORG") {
        setError(t("delete.cannotDeletePersonal"));
      } else {
        setError(errorMessage);
      }
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmText("");
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("delete.title")}</DialogTitle>
          <DialogDescription>
            {t("delete.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t("delete.warning")}
            </AlertDescription>
          </Alert>

          <p className="text-sm text-muted-foreground">
            {t("delete.consequences")}
          </p>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("delete.confirmLabel", {
                name: organizationName,
              })}
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={organizationName}
              disabled={isDeleting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || isDeleting}
          >
            {isDeleting
              ? t("delete.deleting")
              : t("delete.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
