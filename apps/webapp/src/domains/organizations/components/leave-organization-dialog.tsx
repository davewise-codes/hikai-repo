import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "@hikai/convex";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
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
  AlertTriangle,
  toast,
} from "@hikai/ui";
import { useAuth } from "@/domains/auth/hooks";

interface LeaveOrganizationDialogProps {
  organizationId: Id<"organizations">;
  organizationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeaveOrganizationDialog({
  organizationId,
  organizationName,
  open,
  onOpenChange,
}: LeaveOrganizationDialogProps) {
  const { t } = useTranslation("organizations");
  const { user } = useAuth();
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removeMember = useMutation(api.organizations.organizations.removeMember);

  const handleLeave = async () => {
    if (!user) return;

    setIsLeaving(true);
    setError(null);

    try {
      await removeMember({
        organizationId,
        userId: user._id as Id<"users">,
      });
      toast.success(t("leave.success", { name: organizationName }));
      onOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
    } finally {
      setIsLeaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("leave.title")}</DialogTitle>
          <DialogDescription>
            {t("leave.description", { name: organizationName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{t("leave.warning")}</AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLeaving}
          >
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleLeave} disabled={isLeaving}>
            {isLeaving ? t("leave.leaving") : t("leave.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
