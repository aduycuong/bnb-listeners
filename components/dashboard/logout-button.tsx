"use client";

import { useState } from "react";
import { LogOutIcon } from "lucide-react";
import { useT } from "next-i18next/client";

import { useAuth } from "@/components/auth/auth-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const { t: tDashboard } = useT("dashboard");
  const { t: tCommon } = useT("common");
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={tDashboard("logout.label")}
            className="size-8"
          />
        }
      >
        <LogOutIcon className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tDashboard("logout.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {tDashboard("logout.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={signingOut}>
            {tCommon("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={signingOut}
            onClick={handleSignOut}
          >
            {tDashboard("logout.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
