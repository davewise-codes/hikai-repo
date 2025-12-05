import { useState } from "react";
import {
  Alert,
  AlertDescription,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  const { t } = useTranslation("products");
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
      setError(err instanceof Error ? err.message : t("errors.unknown"));
    }
  };

  const handleRemoveMember = async (userId: Id<"users">) => {
    try {
      await removeMember({ productId, userId });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.unknown"));
    }
  };

  const handleRoleChange = async (userId: Id<"users">, newRole: "admin" | "member") => {
    try {
      await updateRole({ productId, userId, role: newRole });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.unknown"));
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
            <CardTitle>{t("members.title")}</CardTitle>
            <CardDescription>
              {t("members.count", { count: members.length })}
            </CardDescription>
          </div>
          {isAdmin && !isAddingMember && availableMembers && availableMembers.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingMember(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {t("members.add")}
            </Button>
          )}
          {isAdmin && !isAddingMember && availableMembers && availableMembers.length === 0 && (
            <span className="text-sm text-muted-foreground">
              {t("members.noAvailable")}
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
                {t("members.selectUser")}
              </label>
              <Select
                value={selectedUserId || ""}
                onValueChange={(value) => setSelectedUserId(value as Id<"users">)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("members.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers
                    .filter((m): m is NonNullable<typeof m> => m !== null)
                    .map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {member.name || member.email} ({member.orgRole})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">
                {t("members.selectRole")}
              </label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as "admin" | "member")}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">{t("roles.member")}</SelectItem>
                  <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddMember} disabled={!selectedUserId} size="sm">
                {t("members.addButton")}
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
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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
                  <Select
                    value={member.role}
                    onValueChange={(value) =>
                      handleRoleChange(member.userId, value as "admin" | "member")
                    }
                  >
                    <SelectTrigger className="w-auto h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">{t("roles.member")}</SelectItem>
                      <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={member.role as "admin" | "member"}>
                    {t(`roles.${member.role}`)}
                  </Badge>
                )}

                {isAdmin && (
                  <Button
                    variant="ghost-destructive"
                    size="sm"
                    onClick={() => handleRemoveMember(member.userId)}
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
            {t("members.empty")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
