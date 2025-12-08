import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Button,
  Input,
  Textarea,
  Alert,
  AlertDescription,
  CheckCircle,
} from "@hikai/ui";
import {
  SettingsLayout,
  SettingsHeader,
  SettingsSection,
  SettingsRow,
  SettingsRowContent,
} from "@/domains/shared";
import {
  useOrganizationBySlug,
  useOrganizationMembers,
  useUpdateOrganization,
  TransferOwnershipDialog,
  DeleteOrganizationDialog,
} from "@/domains/organizations";
import { useAuth } from "@/domains/auth/hooks";
import { Id } from "@hikai/convex/convex/_generated/dataModel";

export const Route = createFileRoute("/settings/org/$slug/general")({
  component: OrgGeneralPage,
});

/**
 * Página de configuración general de organización.
 * Permite editar nombre/descripción y acceder a danger zone.
 */
function OrgGeneralPage() {
  const { t } = useTranslation("organizations");
  const { slug } = Route.useParams();
  const { user } = useAuth();

  const organization = useOrganizationBySlug(slug);
  const members = useOrganizationMembers(organization?._id);
  const updateOrganization = useUpdateOrganization();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Dialog states
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Initialize form when organization loads
  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setDescription(organization.description || "");
    }
  }, [organization]);

  // Clear success message after timeout
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  if (!organization) {
    return null; // Layout handles loading/not found
  }

  const isOwner = organization.userRole === "owner";
  const hasChanges =
    name !== organization.name ||
    description !== (organization.description || "");

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateOrganization({
        organizationId: organization._id,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("common.unknown"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsLayout>
      <SettingsHeader
        title={t("settings.general.title")}
        subtitle={t("settings.general.subtitle", { name: organization.name })}
      />

      {/* General Information */}
      <SettingsSection title={t("settings.info")}>
        <SettingsRow
          label={t("detail.name")}
          control={
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              className="w-64"
            />
          }
        />
        <SettingsRow
          label={t("detail.slug")}
          description={t("settings.slugReadonly")}
          control={
            <Input
              value={organization.slug}
              disabled
              className="w-64 font-mono bg-muted"
            />
          }
        />
        <SettingsRowContent>
          <div className="space-y-2">
            <label className="text-fontSize-sm font-medium">
              {t("detail.descriptionLabel")}
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              rows={3}
            />
          </div>
        </SettingsRowContent>
      </SettingsSection>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4">
        {saveError && (
          <Alert variant="destructive" className="flex-1">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-2 text-fontSize-sm text-success">
            <CheckCircle className="w-4 h-4" />
            {t("settings.saveSuccess")}
          </div>
        )}
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          {isSaving ? t("common.loading") : t("settings.save")}
        </Button>
      </div>

      {/* Danger Zone - Only for owners of non-personal orgs */}
      {isOwner && !organization.isPersonal && (
        <SettingsSection title={t("settings.dangerZone.title")}>
          <SettingsRow
            label={t("transfer.title")}
            description={t("transfer.description")}
            control={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTransferDialogOpen(true)}
              >
                {t("transfer.title")}
              </Button>
            }
          />
          <SettingsRow
            label={t("delete.title")}
            description={t("delete.shortDescription")}
            control={
              <Button
                variant="ghost-destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                {t("delete.title")}
              </Button>
            }
          />
        </SettingsSection>
      )}

      {/* Info for personal org owners */}
      {isOwner && organization.isPersonal && (
        <SettingsSection>
          <SettingsRowContent>
            <p className="text-fontSize-sm text-muted-foreground">
              {t("settings.personalOrgInfo")}
            </p>
          </SettingsRowContent>
        </SettingsSection>
      )}

      {/* Dialogs */}
      {members && user && (
        <TransferOwnershipDialog
          organizationId={organization._id}
          organizationName={organization.name}
          members={members}
          currentUserId={user._id as Id<"users">}
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          onSuccess={() => setTransferDialogOpen(false)}
        />
      )}

      <DeleteOrganizationDialog
        organizationId={organization._id}
        organizationName={organization.name}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </SettingsLayout>
  );
}
