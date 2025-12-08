import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@hikai/convex";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { ConfirmDeleteDialog } from "@/domains/shared";

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

  const deleteOrganization = useMutation(
    api.organizations.organizations.deleteOrganization
  );

  return (
    <ConfirmDeleteDialog
      entityName={organizationName}
      translations={{
        title: t("delete.title"),
        description: t("delete.description"),
        warningMessage: t("delete.warning"),
        consequencesMessage: t("delete.consequences"),
        confirmLabel: t("delete.confirmLabel", { name: organizationName }),
        confirmButtonLabel: t("delete.confirm"),
        confirmingLabel: t("delete.deleting"),
        cancelLabel: t("common.cancel"),
      }}
      onConfirm={() => deleteOrganization({ organizationId })}
      onSuccess={() => navigate({ to: "/" })}
      errorTransform={(err) =>
        err.message === "CANNOT_DELETE_PERSONAL_ORG"
          ? t("delete.cannotDeletePersonal")
          : err.message
      }
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
