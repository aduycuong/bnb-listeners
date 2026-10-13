import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin sign in",
};

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-100">{children}</div>
    </div>
  );
}
