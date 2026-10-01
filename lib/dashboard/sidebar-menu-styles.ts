import { cn } from "@/lib/utils";

/** Main nav rows in SidebarContent (icon + label). */
export const sidebarNavMenuButtonClassName =
  "relative h-9! rounded-full px-3 text-[13.5px]! font-semibold text-sidebar-foreground [&_svg]:size-[18px]! group-data-[collapsible=icon]:[&_svg]:size-[18px]! hover:bg-white/15 hover:text-sidebar-foreground data-active:bg-white data-active:font-semibold data-active:text-[#0091FF]";

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
  "rounded-2xl font-semibold text-sidebar-foreground hover:bg-transparent active:bg-transparent data-open:bg-transparent data-open:hover:bg-transparent",
);

/** Account row — sun avatar, name, and a round options button. */
export const sidebarAccountMenuButtonClassName = cn(
  sidebarIconModeChromeClassName,
  "h-auto! gap-2.5 overflow-visible! rounded-none! bg-transparent! px-0.5! py-0.5! font-semibold text-sidebar-foreground hover:bg-transparent! hover:text-sidebar-foreground active:bg-transparent! data-[state=open]:bg-transparent data-[state=open]:text-sidebar-foreground data-open:bg-transparent data-popup-open:bg-transparent group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0.5! [&_img]:size-9!",
);

/** Workspace switcher — demo `.ws` is 12px, not a pill. */
export const sidebarWorkspaceMenuButtonClassName =
  "flex w-full items-center gap-2.5 rounded-[12px] border border-white/28 bg-white/10 px-2.5 py-2 text-left text-sidebar-foreground outline-none hover:bg-white/18 hover:text-sidebar-foreground data-popup-open:bg-white/18 data-popup-open:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-white/70 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0";

export const sidebarWorkspaceMarkClassName =
  "grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-(--sun) text-[12px] font-extrabold text-[#4D3400] group-data-[collapsible=icon]:size-6";

export const sidebarGroupLabelClassName =
  "h-auto px-3 pt-3.5 pb-1 text-[11.5px] font-bold tracking-[0.02em] text-sidebar-muted";
