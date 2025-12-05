import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/domains/core/components/app-shell";
import { useOrganizationBySlug, OrgMembers } from "@/domains/organizations";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Badge,
  ArrowLeft,
  Settings,
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

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/" })}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{organization.name}</h1>
                {organization.isPersonal && (
                  <Badge variant="outline">{t("switcher.personal")}</Badge>
                )}
                <Badge variant="secondary">
                  {t(`roles.${organization.userRole}`)}
                </Badge>
                <Badge>{t(`plans.${organization.plan}`)}</Badge>
              </div>
              <p className="text-muted-foreground">/{organization.slug}</p>
            </div>
          </div>
          {/* Settings button - only for admin/owner */}
          {(organization.userRole === "owner" || organization.userRole === "admin") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/organizations/$slug/settings", params: { slug } })}
            >
              <Settings className="w-4 h-4 mr-2" />
              {t("settings.title")}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
            <TabsTrigger value="members">{t("tabs.members")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("detail.title")}</CardTitle>
                <CardDescription>
                  {t("detail.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("detail.name")}
                    </label>
                    <p className="text-lg">{organization.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("detail.slug")}
                    </label>
                    <p className="text-lg font-mono">/{organization.slug}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("detail.plan")}
                    </label>
                    <p className="text-lg">{t(`plans.${organization.plan}`)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("detail.members")}
                    </label>
                    <p className="text-lg">{organization.memberCount}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("detail.createdAt")}
                    </label>
                    <p className="text-lg">
                      {new Date(organization.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {organization.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("detail.descriptionLabel")}
                    </label>
                    <p className="mt-1">{organization.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <OrgMembers organizationId={organization._id} userRole={organization.userRole} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
