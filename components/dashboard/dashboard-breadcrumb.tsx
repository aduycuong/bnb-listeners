"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon } from "lucide-react";
import { useT } from "next-i18next/client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getDashboardBreadcrumbs } from "@/lib/dashboard/get-dashboard-breadcrumbs";

export function DashboardBreadcrumb() {
  const pathname = usePathname();
  const { t } = useT("dashboard");
  const items = getDashboardBreadcrumbs(pathname);

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const label = t(item.labelKey);
          const isHome = item.labelKey === "header.home";

          return (
            <Fragment key={`${item.labelKey}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem className="min-w-0">
                {isLast || !item.href ? (
                  <BreadcrumbPage className="truncate font-medium">
                    {isHome && items.length === 1 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <HomeIcon className="size-3.5 shrink-0" />
                        {label}
                      </span>
                    ) : (
                      label
                    )}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    render={<Link href={item.href} />}
                    className="inline-flex min-w-0 items-center gap-1.5"
                    aria-label={isHome ? t("header.homeAriaLabel") : undefined}
                  >
                    {isHome ? (
                      <HomeIcon className="size-3.5 shrink-0" />
                    ) : (
                      <span className="truncate">{label}</span>
                    )}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
