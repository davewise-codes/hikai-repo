import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
  UserPlus,
  Trash2,
  Crown,
  Input,
} from "@hikai/ui";
import { useTranslation } from "react-i18next";
import {
  useOrganizationMembers,
  useAddMember,
  useRemoveMember,
  useUpdateMemberRole,
} from "../hooks";
import { Id } from "@hikai/convex/convex/_generated/dataModel";

interface OrgMembersProps {
  organizationId: Id<"organizations">;
  userRole: "owner" | "admin" | "member";
}

export function OrgMembers({ organizationId, userRole }: OrgMembersProps) {
  const { t } = useTranslation("common");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "member">("member");
  const [error, setError] = useState<string | null>(null);

  const members = useOrganizationMembers(organizationId as string);
  const addMember = useAddMember();
  const removeMember = useRemoveMember();
  const updateRole = useUpdateMemberRole();

  const canManage = userRole === "owner" || userRole === "admin";

  const handleAddMember = async () => {
    if (!email.trim()) return;
    setError(null);

    try {
      await addMember({
        organizationId,
        userEmail: email.trim(),
        role: selectedRole,
      });
      setIsAddingMember(false);
      setEmail("");
      setSelectedRole("member");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      // Traducir códigos de error específicos
      if (errorMessage === "USER_NOT_FOUND") {
        setError(t("organizations.members.userNotFound"));
      } else if (errorMessage === "MEMBER_LIMIT_REACHED") {
        setError(t("organizations.members.limitReached"));
      } else if (errorMessage === "ALREADY_MEMBER") {
        setError(t("organizations.members.alreadyMember"));
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleRemoveMember = async (userId: Id<"users">, memberRole: string) => {
    // No permitir eliminar al owner
    if (memberRole === "owner") {
      setError(t("organizations.members.cannotRemoveOwner"));
      return;
    }

    setError(null);
    try {
      await removeMember({ organizationId, userId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleRoleChange = async (userId: Id<"users">, newRole: "admin" | "member", currentRole: string) => {
    // No permitir cambiar el rol del owner
    if (currentRole === "owner") {
      return;
    }

    setError(null);
    try {
      await updateRole({ organizationId, userId, role: newRole });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      if (errorMessage === "CANNOT_CHANGE_OWNER_ROLE") {
        setError(t("organizations.members.cannotRemoveOwner"));
      } else {
        setError(errorMessage);
      }
    }
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || "??";
  };

  if (members === undefined) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("common.loading")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("organizations.members.title")}</CardTitle>
            <CardDescription>
              {t("organizations.members.count", { count: members.length })}
            </CardDescription>
          </div>
          {canManage && !isAddingMember && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingMember(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {t("organizations.members.add")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add member form */}
        {isAddingMember && (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div>
              <label className="text-sm font-medium">
                {t("organizations.members.add")}
              </label>
              <Input
                type="email"
                placeholder={t("organizations.members.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                {t("organizations.members.selectRole")}
              </label>
              <select
                className="w-full mt-1 p-2 border rounded-md bg-background"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as "admin" | "member")}
              >
                <option value="member">{t("organizations.roles.member")}</option>
                <option value="admin">{t("organizations.roles.admin")}</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddMember} disabled={!email.trim()} size="sm">
                {t("organizations.members.addButton")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingMember(false);
                  setEmail("");
                  setError(null);
                }}
                size="sm"
              >
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Members list */}
        <div className="space-y-2">
          {members.map((member: any) => (
            <div
              key={member._id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={member.user?.image || undefined} />
                  <AvatarFallback>
                    {getInitials(member.user?.name, member.user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {member.user?.name || member.user?.email || t("common.unknown")}
                    </span>
                    {member.role === "owner" && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  {member.user?.email && member.user?.name && (
                    <span className="text-sm text-muted-foreground">
                      {member.user.email}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canManage && member.role !== "owner" ? (
                  <select
                    className="p-1 text-sm border rounded bg-background"
                    value={member.role}
                    onChange={(e) =>
                      handleRoleChange(member.userId, e.target.value as "admin" | "member", member.role)
                    }
                  >
                    <option value="member">{t("organizations.roles.member")}</option>
                    <option value="admin">{t("organizations.roles.admin")}</option>
                  </select>
                ) : (
                  <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                    {t(`organizations.roles.${member.role}`)}
                  </Badge>
                )}

                {canManage && member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.userId, member.role)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {members.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            {t("organizations.members.empty")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
