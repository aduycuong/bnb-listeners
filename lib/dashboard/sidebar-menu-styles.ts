import { cn } from "@/lib/utils";

/** Main nav rows in SidebarContent (icon + label). */
export const sidebarNavMenuButtonClassName =
  "h-[34px]! text-[15px]! font-normal text-sidebar-foreground/80 [&_svg]:size-[17px]! group-data-[collapsible=icon]:[&_svg]:size-[17px]! data-active:font-normal data-active:text-sidebar-foreground";

/** App icon / avatar in header & footer — always 32×32 (shadcn `size="lg"` slot). */
export const sidebarPrimaryMediaClassName = "size-8 shrink-0";

/**
 * Header/footer chrome: no hover/active/open background when collapsed to icons.
 * @see https://ui.shadcn.com/docs/components/base/sidebar
 */
export const sidebarIconModeChromeClassName =
  "group-data-[collapsible=icon]:hover:bg-transparent group-data-[collapsible=icon]:active:bg-transparent group-data-[collapsible=icon]:data-open:bg-transparent group-data-[collapsible=icon]:data-open:hover:bg-transparent group-data-[collapsible=icon]:data-popup-open:bg-transparent group-data-[collapsible=icon]:data-[state=open]:bg-transparent";

/** Brand row — flat in expanded and icon modes (no menu hover plate). */
export const sidebarBrandMenuButtonClassName = cn(
  sidebarIconModeChromeClassName,
  "font-normal text-sidebar-foreground hover:bg-transparent active:bg-transparent data-open:bg-transparent data-open:hover:bg-transparent",
);

/** Account row — accent when open/expanded hover; flat when icon-only sidebar. */
export const sidebarAccountMenuButtonClassName = cn(
  sidebarIconModeChromeClassName,
  "font-normal text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
);

/** Workspace switcher — primary chip; keep the fill in icon mode so hover does not flash transparent. */
export const sidebarWorkspaceMenuButtonClassName =
  "bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground active:bg-primary/80 active:text-primary-foreground data-[state=open]:bg-primary data-[state=open]:text-primary-foreground data-open:bg-primary data-open:text-primary-foreground data-popup-open:bg-primary data-popup-open:text-primary-foreground group-data-[collapsible=icon]:hover:bg-primary group-data-[collapsible=icon]:hover:text-primary-foreground group-data-[collapsible=icon]:active:bg-primary group-data-[collapsible=icon]:active:text-primary-foreground group-data-[collapsible=icon]:data-open:bg-primary group-data-[collapsible=icon]:data-open:hover:bg-primary group-data-[collapsible=icon]:data-popup-open:bg-primary group-data-[collapsible=icon]:data-[state=open]:bg-primary";
