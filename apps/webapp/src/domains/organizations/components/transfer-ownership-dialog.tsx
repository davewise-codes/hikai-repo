import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Avatar,
  AvatarFallback,
  AvatarImage,
  AlertTriangle,
} from "@hikai/ui";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "@hikai/convex";
import { Id } from "@hikai/convex/convex/_generated/dataModel";

interface Member {
  _id: Id<"organizationMembers">;
  userId: Id<"users">;
  role: string;
  user?: {
    _id: Id<"users">;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

interface TransferOwnershipDialogProps {
  organizationId: Id<"organizations">;
  organizationName: string;
  members: Member[];
  currentUserId: Id<"users">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TransferOwnershipDialog({
  organizationId,
  organizationName,
  members,
  currentUserId,
  open,
  onOpenChange,
  onSuccess,
}: TransferOwnershipDialogProps) {
  const { t } = useTranslation("organizations");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transferOwnership = useMutation(
    api.organizations.organizations.transferOwnership
  );

  // Filter out the current owner from eligible members
  const eligibleMembers = members.filter(
    (member) => member.userId !== currentUserId
  );

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

  const handleTransfer = async () => {
    if (!selectedUserId) return;

    setIsTransferring(true);
    setError(null);

    try {
      await transferOwnership({
        organizationId,
        newOwnerId: selectedUserId as Id<"users">,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      if (errorMessage === "ONLY_OWNER_CAN_TRANSFER") {
        setError(t("transfer.errors.onlyOwner"));
      } else if (errorMessage === "CANNOT_TRANSFER_PERSONAL_ORG") {
        setError(t("transfer.cannotTransferPersonal"));
      } else if (errorMessage === "CANNOT_TRANSFER_TO_SELF") {
        setError(t("transfer.errors.cannotTransferToSelf"));
      } else if (errorMessage === "NEW_OWNER_NOT_MEMBER") {
        setError(t("transfer.errors.notMember"));
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsTransferring(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedUserId("");
      setError(null);
    }
    onOpenChange(newOpen);
  };

  const selectedMember = eligibleMembers.find(
    (m) => m.userId === selectedUserId
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("transfer.title")}</DialogTitle>
          <DialogDescription>
            {t("transfer.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t("transfer.warning")}
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {eligibleMembers.length === 0 ? (
            <p className="text-fontSize-sm text-muted-foreground">
              {t("transfer.noEligibleMembers")}
            </p>
          ) : (
            <div className="space-y-2">
              <label className="text-fontSize-sm font-medium">
                {t("transfer.selectMember")}
              </label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("transfer.selectPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {eligibleMembers.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.user?.image || undefined} />
                          <AvatarFallback className="text-fontSize-xs">
                            {getInitials(member.user?.name, member.user?.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {member.user?.name ||
                            member.user?.email ||
                            t("common.unknown")}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedMember && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-fontSize-sm">
                {t("transfer.confirmMessage", {
                  name:
                    selectedMember.user?.name ||
                    selectedMember.user?.email ||
                    t("common.unknown"),
                  org: organizationName,
                })}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isTransferring}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleTransfer}
            disabled={!selectedUserId || isTransferring}
          >
            {isTransferring
              ? t("transfer.transferring")
              : t("transfer.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
