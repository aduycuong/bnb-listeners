import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SessionUser } from "@/lib/auth/session";

import { SettingsPageLayout } from "./settings-page-layout";

type ProfileSettingsProps = {
  user: SessionUser;
};

function getInitials(name: string | null, email: string) {
  if (name?.trim()) {
    return name.trim().charAt(0).toUpperCase();
  }

  return email.charAt(0).toUpperCase();
}

export function ProfileSettings({ user }: ProfileSettingsProps) {
  return (
    <SettingsPageLayout
      title="Profile"
      description="Your account information."
    >
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Details from your sign-in provider.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt="" />
              ) : null}
              <AvatarFallback>
                {getInitials(user.displayName, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">
                {user.displayName ?? "No display name"}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>

          <dl className="divide-y divide-border">
            <div className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-sm text-muted-foreground">Display name</dt>
              <dd className="text-sm font-medium">
                {user.displayName ?? "—"}
              </dd>
            </div>
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd className="text-sm font-medium">{user.email}</dd>
            </div>
            {user.role ? (
              <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <dt className="text-sm text-muted-foreground">Role</dt>
                <dd className="text-sm font-medium capitalize">{user.role}</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>
    </SettingsPageLayout>
  );
}
