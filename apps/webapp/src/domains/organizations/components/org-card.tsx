import { useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import {
  Card,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Users,
  MoreHorizontal,
  ExternalLink,
  Settings,
  LogOut,
  ArrowRightLeft,
  Trash2,
  Check,
  toast,
} from "@hikai/ui";
import { useAuth } from "@/domains/auth/hooks";
import { useCurrentOrg } from "../hooks/use-current-org";
import { DeleteOrganizationDialog } from "./delete-organization-dialog";
import { TransferOwnershipDialog } from "./transfer-ownership-dialog";
import { LeaveOrganizationDialog } from "./leave-organization-dialog";
import { useOrganizationMembers } from "../hooks/use-organizations";

interface OrgCardProps {
  organization: {
    _id: Id<"organizations">;
    name: string;
    slug: string;
    description?: string;
    plan: string;
    isPersonal: boolean;
    role: "owner" | "admin" | "member";
    memberCount: number;
    joinedAt: number;
  };
}

export function OrgCard({ organization }: OrgCardProps) {
  const { t } = useTranslation("organizations");
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { currentOrg, setCurrentOrg } = useCurrentOrg();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  // Only load members when transfer dialog is open
  const members = useOrganizationMembers(
    showTransferDialog ? organization._id.toString() : undefined
  );

  const isOwner = organization.role === "owner";
  const isAdmin = organization.role === "admin" || isOwner;
  const canLeave = !isOwner && !organization.isPersonal;
  const canTransfer = isOwner && !organization.isPersonal;
  const canDelete = isOwner && !organization.isPersonal;

  const isCurrentOrg = currentOrg?._id === organization._id;

  // Switch org if needed and navigate to settings
  const handleViewOrSettings = () => {
    if (!isCurrentOrg) {
      setCurrentOrg(organization._id);
      toast.success(t("switcher.switched", { name: organization.name }));
    }
    navigate({ to: "/settings/org/$slug/general", params: { slug: organization.slug } });
  };

  const handleSelectOrg = () => {
    if (isCurrentOrg) return;
    setCurrentOrg(organization._id);
    toast.success(t("switcher.switched", { name: organization.name }));

    // If on an org settings page, redirect to the equivalent page for the new org
    const orgSettingsMatch = location.pathname.match(/^\/settings\/org\/([^/]+)\/(.+)$/);
    if (orgSettingsMatch) {
      const subPage = orgSettingsMatch[2];
      navigate({ to: `/settings/org/${organization.slug}/${subPage}` });
    }
  };

  return (
    <>
      <Card
        className={`h-[140px] flex flex-col ${
          isCurrentOrg ? "ring-2 ring-primary bg-primary/5" : ""
        }`}
      >
        {/* Row 1: Title + Badges */}
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <h3 className="font-medium truncate text-fontSize-base flex-1">
            {organization.name}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {!organization.isPersonal && organization.plan !== "free" && (
              <Badge variant="secondary" className="text-fontSize-xs capitalize">
                {organization.plan}
              </Badge>
            )}
            {organization.isPersonal && (
              <Badge variant="outline" className="text-fontSize-xs">
                {t("personal")}
              </Badge>
            )}
            <Badge variant={organization.role} className="text-fontSize-xs">
              {t(`roles.${organization.role}`)}
            </Badge>
          </div>
        </div>

        {/* Row 2: Description */}
        <div className="px-4 pt-2 flex-1 min-h-0">
          {organization.description ? (
            <p className="text-fontSize-sm text-muted-foreground line-clamp-2">
              {organization.description}
            </p>
          ) : (
            <p className="text-fontSize-sm text-muted-foreground/50 italic">
              {t("noDescription")}
            </p>
          )}
        </div>

        {/* Row 3: Members + Actions */}
        <div className="flex items-center justify-between px-4 pb-4 mt-auto">
          <div className="flex items-center gap-1 text-fontSize-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>
              {organization.memberCount}{" "}
              {organization.memberCount === 1 ? t("memberSingular") : t("memberPlural")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Select button */}
            <Button
              variant={isCurrentOrg ? "secondary" : "outline"}
              size="sm"
              className="h-7 text-fontSize-xs"
              onClick={handleSelectOrg}
              disabled={isCurrentOrg}
            >
              {isCurrentOrg ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  {t("actions.selected")}
                </>
              ) : (
                t("actions.select")
              )}
            </Button>
            {/* More actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">{t("actions.menu")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleViewOrSettings}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("actions.view")}
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={handleViewOrSettings}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t("actions.settings")}
                  </DropdownMenuItem>
                )}
              {(canLeave || canTransfer || canDelete) && <DropdownMenuSeparator />}
              {canLeave && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLeaveDialog(true);
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("actions.leave")}
                </DropdownMenuItem>
              )}
              {canTransfer && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTransferDialog(true);
                  }}
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  {t("actions.transfer")}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("actions.delete")}
                </DropdownMenuItem>
              )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      {/* Dialogs */}
      <DeleteOrganizationDialog
        organizationId={organization._id}
        organizationName={organization.name}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />

      {showTransferDialog && members && user && (
        <TransferOwnershipDialog
          organizationId={organization._id}
          organizationName={organization.name}
          members={members}
          currentUserId={user._id as Id<"users">}
          open={showTransferDialog}
          onOpenChange={setShowTransferDialog}
        />
      )}

      <LeaveOrganizationDialog
        organizationId={organization._id}
        organizationName={organization.name}
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
      />
    </>
  );
}
