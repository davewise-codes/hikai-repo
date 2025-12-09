import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  useProductMembers,
  useAvailableOrgMembers,
  useAddProductMember,
  useRemoveProductMember,
  useUpdateProductMemberRole,
} from "../hooks";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { MembersTable, type MemberData } from "@/domains/shared";

interface ProductMembersProps {
  productId: Id<"products">;
  userRole: "admin" | "member";
}

export function ProductMembers({ productId, userRole }: ProductMembersProps) {
  const { t, i18n } = useTranslation("products");
  const [error, setError] = useState<string | null>(null);

  const members = useProductMembers(productId);
  const availableMembers = useAvailableOrgMembers(productId);
  const addMember = useAddProductMember();
  const removeMember = useRemoveProductMember();
  const updateRole = useUpdateProductMemberRole();

  const isAdmin = userRole === "admin";

  // Transform members to MemberData type
  const membersData: MemberData[] | undefined = useMemo(() => {
    if (!members) return undefined;
    return members.map((member: {
      _id: string;
      userId: string;
      role: string;
      joinedAt: number;
      lastAccessAt?: number;
      user: { _id?: string; name?: string | null; email?: string | null; image?: string | null } | null;
    }) => ({
      _id: member._id,
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      lastAccessAt: member.lastAccessAt,
      user: member.user,
    }));
  }, [members]);

  // Transform available members for the select
  const availableMembersData = useMemo(() => {
    if (!availableMembers) return undefined;
    return availableMembers
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .map((member: { userId: string; name?: string | null; email?: string | null; orgRole: string }) => ({
        userId: member.userId,
        name: member.name,
        email: member.email,
        orgRole: member.orgRole,
      }));
  }, [availableMembers]);

  const handleAddMember = async (data: {
    email?: string;
    userId?: string;
    role: string;
  }) => {
    if (!data.userId) return;

    try {
      await addMember({
        productId,
        userId: data.userId as Id<"users">,
        role: data.role as "admin" | "member",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.unknown"));
      throw err;
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember({ productId, userId: userId as Id<"users"> });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.unknown"));
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateRole({
        productId,
        userId: userId as Id<"users">,
        role: newRole as "admin" | "member",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.unknown"));
    }
  };

  const roleOptions = [
    { value: "member", label: t("roles.member") },
    { value: "admin", label: t("roles.admin") },
  ];

  return (
    <MembersTable
      members={membersData}
      canManage={isAdmin}
      locale={i18n.language}
      addMemberMode="select"
      onAddMember={handleAddMember}
      availableMembers={availableMembersData}
      roleOptions={roleOptions}
      defaultRole="member"
      protectedRoles={[]}
      highlightRoles={["admin"]}
      onRoleChange={handleRoleChange}
      onRemoveMember={handleRemoveMember}
      error={error}
      onErrorClear={() => setError(null)}
      translations={{
        title: t("members.title"),
        count: t("members.count", { count: membersData?.length ?? 0 }),
        addButton: t("members.add"),
        searchPlaceholder: t("members.searchPlaceholder"),
        columnName: t("members.columnName"),
        columnEmail: t("members.columnEmail"),
        columnRole: t("members.columnRole"),
        columnJoined: t("members.columnJoined"),
        columnLastSeen: t("members.columnLastSeen"),
        neverSeen: t("members.neverSeen"),
        empty: t("members.empty"),
        loading: t("common.loading"),
        addMemberLabel: t("members.selectUser"),
        selectPlaceholder: t("members.selectPlaceholder"),
        roleLabel: t("members.selectRole"),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("members.addButton"),
        noAvailable: t("members.noAvailable"),
        confirmRemoveTitle: t("members.confirmRemoveTitle"),
        confirmRemove: t("members.confirmRemove"),
      }}
    />
  );
}
