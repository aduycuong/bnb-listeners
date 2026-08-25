import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a BNB Chat Agent account",
};

export default function SignUpPage() {
  redirect("/sign-in?mode=signup");
}
