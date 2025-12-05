import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/domains/core/components/app-shell";
import {
  useOrganizationBySlug,
  useOrganizationMembers,
  useUpdateOrganization,
  TransferOwnershipDialog,
  DeleteOrganizationDialog,
} from "@/domains/organizations";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  ArrowLeft,
  Input,
  Textarea,
  Settings,
  AlertTriangle,
} from "@hikai/ui";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/organizations/$slug_/settings")({
  component: OrganizationSettingsPage,
});

function OrganizationSettingsPage() {
  const { t } = useTranslation("organizations");
  const { slug } = Route.useParams();
  const navigate = useNavigate();

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
  useState(() => {
    if (organization) {
      setName(organization.name);
      setDescription(organization.description || "");
    }
  });

  // Update form when organization changes
  if (
    organization &&
    name === "" &&
    description === "" &&
    organization.name !== ""
  ) {
    setName(organization.name);
    setDescription(organization.description || "");
  }

  // Loading state
  if (organization === undefined) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8 text-muted-foreground">
            {t("common.loading")}
          </div>
        </div>
      </AppShell>
    );
  }

  // Organization not found or no access
  if (!organization) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {t("notFound")}
              </p>
              <Button variant="outline" onClick={() => navigate({ to: "/" })}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToHome")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const isOwner = organization.userRole === "owner";
  const isAdminOrOwner =
    organization.userRole === "owner" || organization.userRole === "admin";

  // Redirect non-admin/owner users
  if (!isAdminOrOwner) {
    navigate({ to: "/organizations/$slug", params: { slug } });
    return null;
  }

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
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    name !== organization.name ||
    description !== (organization.description || "");

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate({ to: "/organizations/$slug", params: { slug } })
              }
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <h1 className="text-2xl font-bold">
                  {t("settings.title")}
                </h1>
              </div>
              <p className="text-muted-foreground">{organization.name}</p>
            </div>
          </div>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.general.title")}</CardTitle>
            <CardDescription>
              {t("settings.general.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("detail.name")}
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("detail.slug")}
                </label>
                <Input value={organization.slug} disabled className="font-mono bg-muted" />
                <p className="text-xs text-muted-foreground">
                  {t("settings.slugReadonly")}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("detail.descriptionLabel")}
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSaving}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("detail.plan")}
                </label>
                <p className="mt-1">
                  <Badge>{t(`plans.${organization.plan}`)}</Badge>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("detail.members")}
                </label>
                <p className="mt-1 text-lg">{organization.memberCount}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("settings.yourRole")}
                </label>
                <p className="mt-1">
                  <Badge variant={organization.userRole as "owner" | "admin" | "member"}>
                    {t(`roles.${organization.userRole}`)}
                  </Badge>
                </p>
              </div>
            </div>

            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}
            {saveSuccess && (
              <p className="text-sm text-green-600">
                {t("settings.saveSuccess")}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving
                  ? t("common.loading")
                  : t("settings.save")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone - Only for owners of non-personal orgs */}
        {isOwner && !organization.isPersonal && (
          <Card className="border-destructive">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <CardTitle className="text-destructive">
                  {t("settings.dangerZone.title")}
                </CardTitle>
              </div>
              <CardDescription>
                {t("settings.dangerZone.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Transfer Ownership */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <h4 className="font-medium">
                    {t("transfer.title")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("transfer.description")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setTransferDialogOpen(true)}
                >
                  {t("transfer.title")}
                </Button>
              </div>

              {/* Delete Organization */}
              <div className="flex items-center justify-between rounded-lg border border-destructive p-4">
                <div>
                  <h4 className="font-medium text-destructive">
                    {t("delete.title")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("delete.shortDescription")}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  {t("delete.title")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info for personal org owners */}
        {isOwner && organization.isPersonal && (
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                {t("settings.personalOrgInfo")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      {members && (
        <TransferOwnershipDialog
          organizationId={organization._id}
          organizationName={organization.name}
          members={members}
          currentUserId={organization.ownerId}
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          onSuccess={() => {
            // Refresh the page to reflect changes
            navigate({ to: "/organizations/$slug", params: { slug } });
          }}
        />
      )}

      <DeleteOrganizationDialog
        organizationId={organization._id}
        organizationName={organization.name}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </AppShell>
  );
}
