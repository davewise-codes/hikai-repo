import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/domains/auth/hooks";
import {
  Button,
  Input,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Camera,
  CheckCircle,
  toast,
} from "@hikai/ui";
import {
  SettingsLayout,
  SettingsHeader,
  SettingsSection,
  SettingsRow,
  SettingsRowContent,
  getInitials,
} from "@/domains/shared";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/settings/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useTranslation("profile");
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const updateProfile = useMutation(api.users.updateUserProfile);

  // Form state
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when user loads
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  // Loading state
  if (isAuthLoading || user === undefined) {
    return (
      <SettingsLayout>
        <div className="text-center py-8 text-muted-foreground">
          {t("common:loading", "Loading...")}
        </div>
      </SettingsLayout>
    );
  }

  // Not authenticated
  if (!user) {
    navigate({ to: "/login" });
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await updateProfile({ name: name.trim() });
      toast.success(t("saveSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = name.trim() !== (user.name || "");

  return (
    <SettingsLayout>
      <SettingsHeader title={t("title")} subtitle={t("subtitle")} />

      {/* Personal Information */}
      <SettingsSection title={t("personalInfo")}>
        {/* Avatar */}
        <SettingsRow
          label={t("avatar")}
          control={
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={user.image || undefined}
                  alt={user.name || t("title")}
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback>
                  {getInitials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" disabled className="gap-2">
                <Camera className="w-4 h-4" />
                {t("avatarComingSoon")}
              </Button>
            </div>
          }
        />

        {/* Name */}
        <SettingsRow
          label={t("name")}
          control={
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              disabled={isSaving}
              className="w-64"
            />
          }
        />

        {/* Email (read-only) */}
        <SettingsRow
          label={t("email")}
          description={t("emailReadonly")}
          control={
            <Input
              value={user.email || ""}
              disabled
              className="w-64 bg-muted"
            />
          }
        />
      </SettingsSection>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving || !name.trim()}
        >
          {isSaving ? t("saving") : t("save")}
        </Button>
      </div>

      {/* Authentication Methods */}
      <SettingsSection title={t("authMethods")}>
        {user.emailVerificationTime && (
          <SettingsRow
            label={t("emailVerified")}
            description={user.email || ""}
            control={<CheckCircle className="w-5 h-5 text-success" />}
          />
        )}
        <SettingsRowContent>
          <p className="text-fontSize-sm text-muted-foreground">
            {t("moreOptionsSoon")}
          </p>
        </SettingsRowContent>
      </SettingsSection>
    </SettingsLayout>
  );
}
