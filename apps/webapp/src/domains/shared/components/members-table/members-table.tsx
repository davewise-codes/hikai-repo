import { useState, useMemo } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Input,
  UserPlus,
  Search,
} from "@hikai/ui";
import { MemberRow, type MemberData } from "./member-row";
import { AddMemberForm } from "./add-member-form";

interface AvailableMember {
  userId: string;
  name?: string | null;
  email?: string | null;
  orgRole?: string;
}

export interface MembersTableTranslations {
  title: string;
  count: string;
  addButton: string;
  searchPlaceholder: string;
  // Column headers
  columnName: string;
  columnEmail: string;
  columnRole: string;
  columnJoined: string;
  columnLastSeen: string;
  // States
  neverSeen: string;
  empty: string;
  loading: string;
  // Add form
  addMemberLabel: string;
  emailPlaceholder?: string;
  selectPlaceholder?: string;
  roleLabel: string;
  cancelLabel: string;
  confirmLabel: string;
  noAvailable?: string;
  // Remove confirmation dialog
  confirmRemoveTitle: string;
  confirmRemove: string;
}

export interface MembersTableProps {
  members: MemberData[] | undefined;
  canManage: boolean;
  locale: string;

  // Add member configuration
  addMemberMode: "email" | "select";
  onAddMember: (data: {
    email?: string;
    userId?: string;
    role: string;
  }) => Promise<void>;
  availableMembers?: AvailableMember[];

  // Role configuration
  roleOptions: Array<{ value: string; label: string }>;
  defaultRole: string;
  protectedRoles: string[];
  highlightRoles: string[];

  // Callbacks
  onRoleChange: (userId: string, newRole: string) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;

  // Error handling
  error: string | null;
  onErrorClear: () => void;

  // Translations
  translations: MembersTableTranslations;
}

// Grid template for table columns - more space for Name and Email like Linear
const GRID_COLS =
  "grid-cols-[minmax(200px,2fr)_minmax(180px,1.5fr)_100px_100px_100px_48px]";

export function MembersTable({
  members,
  canManage,
  locale,
  addMemberMode,
  onAddMember,
  availableMembers,
  roleOptions,
  defaultRole,
  protectedRoles,
  highlightRoles,
  onRoleChange,
  onRemoveMember,
  error,
  onErrorClear,
  translations,
}: MembersTableProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState("");

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!search.trim()) return members;

    const searchLower = search.toLowerCase();
    return members.filter((member) => {
      const name = member.user?.name?.toLowerCase() || "";
      const email = member.user?.email?.toLowerCase() || "";
      return name.includes(searchLower) || email.includes(searchLower);
    });
  }, [members, search]);

  const handleAddMember = async (data: {
    email?: string;
    userId?: string;
    role: string;
  }) => {
    onErrorClear();
    await onAddMember(data);
    setIsAdding(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    onErrorClear();
    await onRoleChange(userId, newRole);
  };

  const handleRemove = async (userId: string) => {
    onErrorClear();
    await onRemoveMember(userId);
  };

  // Loading state
  if (members === undefined) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="p-8 text-center text-muted-foreground">
          {translations.loading}
        </div>
      </div>
    );
  }

  // Check if add button should be shown
  const showAddButton =
    canManage &&
    !isAdding &&
    (addMemberMode === "email" ||
      (availableMembers && availableMembers.length > 0));

  const showNoAvailableMessage =
    canManage &&
    !isAdding &&
    addMemberMode === "select" &&
    (!availableMembers || availableMembers.length === 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-fontSize-base font-semibold">
            {translations.title}
          </h3>
          <p className="text-fontSize-xs text-muted-foreground">
            {translations.count}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showNoAvailableMessage && (
            <span className="text-fontSize-sm text-muted-foreground">
              {translations.noAvailable}
            </span>
          )}
          {showAddButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {translations.addButton}
            </Button>
          )}
        </div>
      </div>

      {/* Add form */}
      {isAdding && (
        <AddMemberForm
          mode={addMemberMode}
          roleOptions={roleOptions}
          defaultRole={defaultRole}
          availableMembers={availableMembers}
          onSubmit={handleAddMember}
          onCancel={() => {
            setIsAdding(false);
            onErrorClear();
          }}
          translations={{
            addMemberLabel: translations.addMemberLabel,
            emailPlaceholder: translations.emailPlaceholder,
            selectPlaceholder: translations.selectPlaceholder,
            roleLabel: translations.roleLabel,
            cancelLabel: translations.cancelLabel,
            confirmLabel: translations.confirmLabel,
            noAvailable: translations.noAvailable,
          }}
        />
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      {members.length > 0 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={translations.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Table - clean style like Linear (no outer border) */}
      <div className="overflow-x-auto">
        {/* Table header */}
        <div
          className={`grid ${GRID_COLS} gap-4 px-4 py-2 text-fontSize-sm font-medium text-muted-foreground border-b`}
        >
          <div>{translations.columnName}</div>
          <div>{translations.columnEmail}</div>
          <div>{translations.columnRole}</div>
          <div>{translations.columnJoined}</div>
          <div>{translations.columnLastSeen}</div>
          <div></div>
        </div>

        {/* Rows */}
        {filteredMembers.map((member) => (
          <MemberRow
            key={member._id}
            member={member}
            canManage={canManage}
            isProtected={protectedRoles.includes(member.role)}
            roleOptions={roleOptions}
            highlightRoles={highlightRoles}
            onRoleChange={handleRoleChange}
            onRemove={handleRemove}
            locale={locale}
            gridCols={GRID_COLS}
            translations={{
              neverSeen: translations.neverSeen,
              confirmRemoveTitle: translations.confirmRemoveTitle,
              confirmRemove: translations.confirmRemove,
              confirmLabel: translations.confirmLabel,
              cancelLabel: translations.cancelLabel,
            }}
          />
        ))}

        {/* Empty state */}
        {filteredMembers.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground">
            {search ? `No members matching "${search}"` : translations.empty}
          </div>
        )}
      </div>
    </div>
  );
}
