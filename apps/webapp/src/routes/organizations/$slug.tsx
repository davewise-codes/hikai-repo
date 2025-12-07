import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/domains/core/components/app-shell";
import {
  useOrganizationBySlug,
  useOrganizationMembers,
  useUpdateOrganization,
  OrgMembers,
  TransferOwnershipDialog,
  DeleteOrganizationDialog,
} from "@/domains/organizations";
import {
  SettingsLayout,
  SettingsHeader,
  SettingsSection,
  SettingsRow,
  SettingsRowContent,
} from "@/domains/shared";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Badge,
  Input,
  Textarea,
  Card,
  CardContent,
  ArrowLeft,
} from "@hikai/ui";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/organizations/$slug")({
  component: OrganizationDetailPage,
});

function OrganizationDetailPage() {
  const { t } = useTranslation("organizations");
  const { slug } = Route.useParams();
  const navigate = useNavigate();

  const organization = useOrganizationBySlug(slug);
  const members = useOrganizationMembers(organization?._id);
  const updateOrganization = useUpdateOrganization();

  // Form state for settings tab
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
    if (organization && name === "" && description === "") {
      setName(organization.name);
      setDescription(organization.description || "");
    }
  }, [organization, name, description]);

  // Loading state
  if (organization === undefined) {
    return (
      <AppShell>
        <SettingsLayout>
          <div className="text-center py-8 text-muted-foreground">
            {t("common.loading")}
          </div>
        </SettingsLayout>
      </AppShell>
    );
  }

  // Organization not found or no access
  if (!organization) {
    return (
      <AppShell>
        <SettingsLayout>
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">{t("notFound")}</p>
              <Button variant="outline" onClick={() => navigate({ to: "/" })}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToHome")}
              </Button>
            </CardContent>
          </Card>
        </SettingsLayout>
      </AppShell>
    );
  }

  const isOwner = organization.userRole === "owner";
  const isAdminOrOwner =
    organization.userRole === "owner" || organization.userRole === "admin";

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
      <SettingsLayout>
        <SettingsHeader
          title={organization.name}
          subtitle={`/${organization.slug}`}
          backButton={{
            onClick: () => navigate({ to: "/" }),
          }}
          actions={
            <div className="flex items-center gap-2">
              {organization.isPersonal && (
                <Badge variant="outline">{t("switcher.personal")}</Badge>
              )}
              <Badge
                variant={
                  organization.userRole as "owner" | "admin" | "member"
                }
              >
                {t(`roles.${organization.userRole}`)}
              </Badge>
              <Badge>{t(`plans.${organization.plan}`)}</Badge>
            </div>
          }
        />

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
            <TabsTrigger value="members">{t("tabs.members")}</TabsTrigger>
            {isAdminOrOwner && (
              <TabsTrigger value="settings">{t("tabs.settings")}</TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <SettingsSection title={t("detail.title")}>
              <SettingsRow
                label={t("detail.name")}
                control={
                  <span className="text-fontSize-sm">{organization.name}</span>
                }
              />
              <SettingsRow
                label={t("detail.slug")}
                control={
                  <span className="text-fontSize-sm font-mono">
                    /{organization.slug}
                  </span>
                }
              />
              <SettingsRow
                label={t("detail.plan")}
                control={<Badge>{t(`plans.${organization.plan}`)}</Badge>}
              />
              <SettingsRow
                label={t("detail.members")}
                control={
                  <span className="text-fontSize-sm">
                    {organization.memberCount}
                  </span>
                }
              />
              <SettingsRow
                label={t("detail.createdAt")}
                control={
                  <span className="text-fontSize-sm">
                    {new Date(organization.createdAt).toLocaleDateString()}
                  </span>
                }
              />
              {organization.description && (
                <SettingsRowContent>
                  <div className="space-y-1">
                    <label className="text-fontSize-sm font-medium text-muted-foreground">
                      {t("detail.descriptionLabel")}
                    </label>
                    <p className="text-fontSize-sm">{organization.description}</p>
                  </div>
                </SettingsRowContent>
              )}
            </SettingsSection>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-6">
            <OrgMembers
              organizationId={organization._id}
              userRole={organization.userRole}
            />
          </TabsContent>

          {/* Settings Tab (admin/owner only) */}
          {isAdminOrOwner && (
            <TabsContent value="settings" className="mt-6 space-y-6">
              <SettingsSection title={t("settings.general.title")}>
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
                  <p className="text-fontSize-sm text-destructive">{saveError}</p>
                )}
                {saveSuccess && (
                  <p className="text-fontSize-sm text-success">
                    {t("settings.saveSuccess")}
                  </p>
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
            </TabsContent>
          )}
        </Tabs>
      </SettingsLayout>

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
            setTransferDialogOpen(false);
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
