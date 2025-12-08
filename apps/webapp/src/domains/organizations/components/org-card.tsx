import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  CreditCard,
} from "@hikai/ui";
import { useAuth } from "@/domains/auth/hooks";
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
  const { user } = useAuth();

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

  const handleCardClick = () => {
    navigate({ to: "/organizations/$slug", params: { slug: organization.slug } });
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate({
      to: "/settings/org/$slug/general",
      params: { slug: organization.slug },
    });
  };

  return (
    <>
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer h-full group"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="truncate text-fontSize-base">
                  {organization.name}
                </CardTitle>
                {organization.isPersonal && (
                  <Badge variant="outline" className="text-fontSize-xs shrink-0">
                    {t("personal")}
                  </Badge>
                )}
              </div>
              <CardDescription className="truncate text-fontSize-sm">
                /{organization.slug}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant={organization.role} className="text-fontSize-xs">
                {t(`roles.${organization.role}`)}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">{t("actions.menu")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={handleCardClick}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t("actions.view")}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={handleSettingsClick}>
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
        </CardHeader>
        <CardContent>
          {organization.description && (
            <p className="text-fontSize-sm text-muted-foreground mb-3 line-clamp-2">
              {organization.description}
            </p>
          )}
          <div className="flex items-center justify-between text-fontSize-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>
                  {organization.memberCount}{" "}
                  {organization.memberCount === 1 ? t("member") : t("members")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                <span className="capitalize">{organization.plan}</span>
              </div>
            </div>
          </div>
        </CardContent>
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
