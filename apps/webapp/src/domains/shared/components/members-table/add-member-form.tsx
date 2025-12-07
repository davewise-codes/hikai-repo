import { useState } from "react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hikai/ui";

interface AvailableMember {
  userId: string;
  name?: string | null;
  email?: string | null;
  orgRole?: string;
}

interface AddMemberFormProps {
  mode: "email" | "select";
  roleOptions: Array<{ value: string; label: string }>;
  defaultRole: string;
  availableMembers?: AvailableMember[];
  onSubmit: (data: { email?: string; userId?: string; role: string }) => Promise<void>;
  onCancel: () => void;
  translations: {
    addMemberLabel: string;
    emailPlaceholder?: string;
    selectPlaceholder?: string;
    roleLabel: string;
    cancelLabel: string;
    confirmLabel: string;
    noAvailable?: string;
  };
}

export function AddMemberForm({
  mode,
  roleOptions,
  defaultRole,
  availableMembers,
  onSubmit,
  onCancel,
  translations,
}: AddMemberFormProps) {
  const [email, setEmail] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState(defaultRole);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (mode === "email") {
        await onSubmit({ email: email.trim(), role: selectedRole });
      } else {
        await onSubmit({ userId: selectedUserId, role: selectedRole });
      }
      setEmail("");
      setSelectedUserId("");
      setSelectedRole(defaultRole);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid =
    mode === "email" ? email.trim().length > 0 : selectedUserId.length > 0;

  // For select mode, check if there are available members
  if (mode === "select" && (!availableMembers || availableMembers.length === 0)) {
    return (
      <div className="border rounded-lg p-4 bg-muted/30">
        <p className="text-fontSize-sm text-muted-foreground">
          {translations.noAvailable}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="mt-2"
        >
          {translations.cancelLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
      {/* Email input or user select */}
      <div>
        <label className="text-fontSize-sm font-medium">
          {translations.addMemberLabel}
        </label>
        {mode === "email" ? (
          <Input
            type="email"
            placeholder={translations.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
            disabled={isSubmitting}
          />
        ) : (
          <Select
            value={selectedUserId}
            onValueChange={setSelectedUserId}
            disabled={isSubmitting}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={translations.selectPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {availableMembers?.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  {member.name || member.email}
                  {member.orgRole && (
                    <span className="text-muted-foreground ml-1">
                      ({member.orgRole})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Role select */}
      <div>
        <label className="text-fontSize-sm font-medium">
          {translations.roleLabel}
        </label>
        <Select
          value={selectedRole}
          onValueChange={setSelectedRole}
          disabled={isSubmitting}
        >
          <SelectTrigger className="mt-1">
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
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          size="sm"
        >
          {translations.confirmLabel}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          size="sm"
          disabled={isSubmitting}
        >
          {translations.cancelLabel}
        </Button>
      </div>
    </div>
  );
}
