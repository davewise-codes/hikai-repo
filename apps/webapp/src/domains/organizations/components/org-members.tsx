import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  useOrganizationMembers,
  useAddMember,
  useRemoveMember,
  useUpdateMemberRole,
} from "../hooks";
import { Id } from "@hikai/convex/convex/_generated/dataModel";
import { MembersTable, type MemberData } from "@/domains/shared";

interface OrgMembersProps {
  organizationId: Id<"organizations">;
  userRole: "owner" | "admin" | "member";
}

export function OrgMembers({ organizationId, userRole }: OrgMembersProps) {
  const { t, i18n } = useTranslation("organizations");
  const [error, setError] = useState<string | null>(null);

  const members = useOrganizationMembers(organizationId as string);
  const addMember = useAddMember();
  const removeMember = useRemoveMember();
  const updateRole = useUpdateMemberRole();

  const canManage = userRole === "owner" || userRole === "admin";

  // Transform members to MemberData type - defined before handlers
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

  const handleAddMember = async (data: {
    email?: string;
    userId?: string;
    role: string;
  }) => {
    if (!data.email?.trim()) return;

    try {
      await addMember({
        organizationId,
        userEmail: data.email.trim(),
        role: data.role as "admin" | "member",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      if (errorMessage === "USER_NOT_FOUND") {
        setError(t("members.userNotFound"));
      } else if (errorMessage === "MEMBER_LIMIT_REACHED") {
        setError(t("members.limitReached"));
      } else if (errorMessage === "ALREADY_MEMBER") {
        setError(t("members.alreadyMember"));
      } else {
        setError(errorMessage);
      }
      throw err;
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const member = membersData?.find((m) => m.userId === userId);
    if (member?.role === "owner") {
      setError(t("members.cannotRemoveOwner"));
      return;
    }

    try {
      await removeMember({ organizationId, userId: userId as Id<"users"> });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const member = membersData?.find((m) => m.userId === userId);
    if (member?.role === "owner") {
      return;
    }

    try {
      await updateRole({
        organizationId,
        userId: userId as Id<"users">,
        role: newRole as "admin" | "member",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      if (errorMessage === "CANNOT_CHANGE_OWNER_ROLE") {
        setError(t("members.cannotRemoveOwner"));
      } else {
        setError(errorMessage);
      }
    }
  };

  const roleOptions = [
    { value: "member", label: t("roles.member") },
    { value: "admin", label: t("roles.admin") },
  ];

  return (
    <MembersTable
      members={membersData}
      canManage={canManage}
      locale={i18n.language}
      addMemberMode="email"
      onAddMember={handleAddMember}
      roleOptions={roleOptions}
      defaultRole="member"
      protectedRoles={["owner"]}
      highlightRoles={["owner"]}
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
        addMemberLabel: t("members.add"),
        emailPlaceholder: t("members.emailPlaceholder"),
        roleLabel: t("members.selectRole"),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("members.addButton"),
        confirmRemoveTitle: t("members.confirmRemoveTitle"),
        confirmRemove: t("members.confirmRemove"),
      }}
    />
  );
}
