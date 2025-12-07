import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Trash2,
  Crown,
} from "@hikai/ui";
import { getInitials, formatRelativeDate } from "../../utils";

export interface MemberData {
  _id: string;
  userId: string;
  role: string;
  joinedAt: number;
  lastAccessAt?: number;
  user: {
    _id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

export interface MemberRowProps {
  member: MemberData;
  canManage: boolean;
  isProtected: boolean;
  roleOptions: Array<{ value: string; label: string }>;
  highlightRoles: string[];
  onRoleChange: (userId: string, newRole: string) => void;
  onRemove: (userId: string) => void;
  locale: string;
  gridCols: string;
  translations: {
    neverSeen: string;
  };
}

export function MemberRow({
  member,
  canManage,
  isProtected,
  roleOptions,
  highlightRoles,
  onRoleChange,
  onRemove,
  locale,
  gridCols,
  translations,
}: MemberRowProps) {
  const showHighlight = highlightRoles.includes(member.role);

  return (
    <div
      className={`grid ${gridCols} gap-4 px-4 py-3 items-center hover:bg-muted/50 border-b last:border-b-0`}
    >
      {/* Name + Avatar */}
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={member.user?.image || undefined} />
          <AvatarFallback className="text-fontSize-xs">
            {getInitials(member.user?.name, member.user?.email)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-fontSize-sm font-medium truncate">
            {member.user?.name || member.user?.email || "Unknown"}
          </span>
          {showHighlight && (
            <Crown className="w-4 h-4 text-warning shrink-0" />
          )}
        </div>
      </div>

      {/* Email */}
      <div className="text-fontSize-xs text-muted-foreground truncate">
        {member.user?.email}
      </div>

      {/* Role */}
      <div>
        {canManage && !isProtected ? (
          <Select
            value={member.role}
            onValueChange={(v) => onRoleChange(member.userId, v)}
          >
            <SelectTrigger className="w-full h-7 text-fontSize-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant={member.role as "owner" | "admin" | "member"}>
            {roleOptions.find((o) => o.value === member.role)?.label ||
              member.role}
          </Badge>
        )}
      </div>

      {/* Joined */}
      <div className="text-fontSize-xs text-muted-foreground">
        {formatRelativeDate(member.joinedAt, locale)}
      </div>

      {/* Last seen */}
      <div className="text-fontSize-xs text-muted-foreground">
        {member.lastAccessAt
          ? formatRelativeDate(member.lastAccessAt, locale)
          : translations.neverSeen}
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        {canManage && !isProtected && (
          <Button
            variant="ghost-destructive"
            size="icon"
            className="h-7 w-7"
            onClick={() => onRemove(member.userId)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
