"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { BNB_CHAT_BASE_URL } from "@/lib/chat-widget/constants";
import type { ProjectChatWidget } from "@/lib/projects/types";

import type { BnbChatInstance } from "./bnb-chat-types";
import { loadBnbChatScript } from "./load-bnb-chat-script";

/** The widget has no destroy call, so nodes it adds to <body> right after init are removed on cleanup. */
const MOUNT_WINDOW_MS = 1000;

export type ProjectChatWidgetApi = {
  /** `off`: not configured or disabled; `loading`: enabled, widget not ready yet. */
  status: "off" | "loading" | "ready";
  open: () => void;
  send: (text: string) => Promise<void>;
};

const OFF: ProjectChatWidgetApi = {
  status: "off",
  open: () => {},
  send: () => Promise.reject(new Error("BNB chat widget is off.")),
};

const ProjectChatWidgetContext = createContext<ProjectChatWidgetApi>(OFF);

export function useProjectChatWidget(): ProjectChatWidgetApi {
  return useContext(ProjectChatWidgetContext);
}

/**
 * Mounts the BNB chat widget for one project when it is enabled with a public key. Wrap the
 * project's pages only, so the widget never shows elsewhere in the app.
 */
export function ProjectChatWidgetProvider({
  projectId,
  config,
  children,
}: {
  projectId: string | null;
  config: ProjectChatWidget | null;
  children: React.ReactNode;
}) {
  const [instance, setInstance] = useState<BnbChatInstance | null>(null);
  const publicKey = config?.enabled ? config.publicKey.trim() : "";

  useEffect(() => {
    if (!projectId || !publicKey) return;

    let cancelled = false;
    const added: Node[] = [];
    const observer = new MutationObserver((records) => {
      for (const record of records) added.push(...record.addedNodes);
    });
    let timer: number | undefined;

    loadBnbChatScript()
      .then(() => {
        if (cancelled || !window.BnbChat) return;
        observer.observe(document.body, { childList: true });
        const created = window.BnbChat.init({
          publicKey,
          baseUrl: BNB_CHAT_BASE_URL,
          name: `project-${projectId}`,
          position: "bottom-right",
        });
        timer = window.setTimeout(() => observer.disconnect(), MOUNT_WINDOW_MS);
        setInstance(created);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      observer.takeRecords().forEach((record) => added.push(...record.addedNodes));
      observer.disconnect();
      added.forEach((node) => node.parentNode?.removeChild(node));
      setInstance(null);
    };
  }, [projectId, publicKey]);

  const api = useMemo<ProjectChatWidgetApi>(() => {
    if (!publicKey) return OFF;
    if (!instance) {
      return { ...OFF, status: "loading" };
    }
    return {
      status: "ready",
      open: () => instance.open(),
      send: async (text) => {
        await instance.sendMessage(text);
      },
    };
  }, [instance, publicKey]);

  return (
    <ProjectChatWidgetContext.Provider value={api}>{children}</ProjectChatWidgetContext.Provider>
  );
}
