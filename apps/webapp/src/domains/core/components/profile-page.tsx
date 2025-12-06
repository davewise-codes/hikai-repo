import { useState, useEffect } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/domains/auth/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Avatar,
  AvatarImage,
  AvatarFallback,
  ArrowLeft,
  User,
  Mail,
  CheckCircle,
  Camera,
  toast,
} from "@hikai/ui";
import { useTranslation } from "react-i18next";

export function ProfilePage() {
  const { t } = useTranslation("profile");
  const navigate = useNavigate();
  const router = useRouter();
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

  // Get user initials for fallback
  const getInitials = () => {
    if (user?.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  // Loading state
  if (isAuthLoading || user === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-8 text-muted-foreground">
            {t("common:loading", "Loading...")}
          </div>
        </div>
      </div>
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
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.history.back()}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <h1 className="text-2xl font-bold">{t("title")}</h1>
            </div>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("personalInfo")}</CardTitle>
            <CardDescription>{t("personalInfoDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("avatar")}</label>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={user.image || undefined}
                    alt={user.name || t("title")}
                    referrerPolicy="no-referrer"
                  />
                  <AvatarFallback className="text-xl">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" disabled className="gap-2">
                  <Camera className="w-4 h-4" />
                  {t("avatarComingSoon")}
                </Button>
              </div>
            </div>

            {/* Name field */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("name")}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                disabled={isSaving}
              />
            </div>

            {/* Email field (read-only) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("email")}</label>
              <div className="flex items-center gap-2">
                <Input
                  value={user.email || ""}
                  disabled
                  className="bg-muted"
                />
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("emailReadonly")}
              </p>
            </div>

            {/* Save button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving || !name.trim()}
              >
                {isSaving ? t("saving") : t("save")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Authentication Methods */}
        <Card>
          <CardHeader>
            <CardTitle>{t("authMethods")}</CardTitle>
            <CardDescription>{t("authMethodsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email verified status */}
            {user.emailVerificationTime && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">{t("emailVerified")}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            )}

            {/* Placeholder for future options */}
            <p className="text-sm text-muted-foreground">
              {t("moreOptionsSoon")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
