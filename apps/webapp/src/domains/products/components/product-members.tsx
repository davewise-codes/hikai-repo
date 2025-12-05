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
} from "@hikai/ui";
import { useTranslation } from "react-i18next";
import {
  useProductMembers,
  useAvailableOrgMembers,
  useAddProductMember,
  useRemoveProductMember,
  useUpdateProductMemberRole,
} from "../hooks";
import { Id } from "@hikai/convex/convex/_generated/dataModel";

interface ProductMembersProps {
  productId: Id<"products">;
  userRole: "admin" | "member";
}

export function ProductMembers({ productId, userRole }: ProductMembersProps) {
  const { t } = useTranslation("common");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [selectedRole, setSelectedRole] = useState<"admin" | "member">("member");
  const [error, setError] = useState<string | null>(null);

  const members = useProductMembers(productId);
  const availableMembers = useAvailableOrgMembers(productId);
  const addMember = useAddProductMember();
  const removeMember = useRemoveProductMember();
  const updateRole = useUpdateProductMemberRole();

  const isAdmin = userRole === "admin";

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    setError(null);

    try {
      await addMember({
        productId,
        userId: selectedUserId,
        role: selectedRole,
      });
      setIsAddingMember(false);
      setSelectedUserId(null);
      setSelectedRole("member");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("products.errors.unknown"));
    }
  };

  const handleRemoveMember = async (userId: Id<"users">) => {
    try {
      await removeMember({ productId, userId });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("products.errors.unknown"));
    }
  };

  const handleRoleChange = async (userId: Id<"users">, newRole: "admin" | "member") => {
    try {
      await updateRole({ productId, userId, role: newRole });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("products.errors.unknown"));
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
            <CardTitle>{t("products.members.title")}</CardTitle>
            <CardDescription>
              {t("products.members.count", { count: members.length })}
            </CardDescription>
          </div>
          {isAdmin && !isAddingMember && availableMembers && availableMembers.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingMember(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {t("products.members.add")}
            </Button>
          )}
          {isAdmin && !isAddingMember && availableMembers && availableMembers.length === 0 && (
            <span className="text-sm text-muted-foreground">
              {t("products.members.noAvailable")}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add member form */}
        {isAddingMember && availableMembers && (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div>
              <label className="text-sm font-medium">
                {t("products.members.selectUser")}
              </label>
              <select
                className="w-full mt-1 p-2 border rounded-md bg-background"
                value={selectedUserId || ""}
                onChange={(e) => setSelectedUserId(e.target.value as Id<"users">)}
              >
                <option value="">{t("products.members.selectPlaceholder")}</option>
                {availableMembers
                  .filter((m): m is NonNullable<typeof m> => m !== null)
                  .map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name || member.email} ({member.orgRole})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">
                {t("products.members.selectRole")}
              </label>
              <select
                className="w-full mt-1 p-2 border rounded-md bg-background"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as "admin" | "member")}
              >
                <option value="member">{t("products.roles.member")}</option>
                <option value="admin">{t("products.roles.admin")}</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddMember} disabled={!selectedUserId} size="sm">
                {t("products.members.addButton")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingMember(false);
                  setSelectedUserId(null);
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
          {members.map((member) => (
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
                    {member.role === "admin" && (
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
                {isAdmin ? (
                  <select
                    className="p-1 text-sm border rounded bg-background"
                    value={member.role}
                    onChange={(e) =>
                      handleRoleChange(member.userId, e.target.value as "admin" | "member")
                    }
                  >
                    <option value="member">{t("products.roles.member")}</option>
                    <option value="admin">{t("products.roles.admin")}</option>
                  </select>
                ) : (
                  <Badge variant="secondary">
                    {t(`products.roles.${member.role}`)}
                  </Badge>
                )}

                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.userId)}
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
            {t("products.members.empty")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
