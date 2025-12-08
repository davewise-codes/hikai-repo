import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@hikai/convex";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { ConfirmDeleteDialog } from "@/domains/shared";
import { useCurrentOrg } from "../hooks/use-current-org";

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
  const { currentOrg, setCurrentOrg, organizations } = useCurrentOrg();

  const deleteOrganization = useMutation(
    api.organizations.organizations.deleteOrganization
  );

  const handleSuccess = () => {
    // If we deleted the current org, switch to another one (preferably personal)
    if (currentOrg?._id === organizationId) {
      const personalOrg = organizations.find((o) => o.isPersonal);
      const nextOrg = personalOrg || organizations.find((o) => o._id !== organizationId);
      if (nextOrg) {
        setCurrentOrg(nextOrg._id);
      }
    }
    navigate({ to: "/settings/organizations" });
  };

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
      onSuccess={handleSuccess}
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
