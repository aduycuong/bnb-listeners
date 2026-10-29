"use client";

import { use } from "react";

import { ProjectChatWidgetProvider } from "@/components/chat-widget/project-chat-widget-provider";
import { useProjectRouteContext } from "@/hooks/use-project-route-context";

type ProjectLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ workspaceIndex: string; projectIndex: string }>;
};

/** Wraps every page of one project; the BNB chat widget lives here so it only shows on them. */
export default function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { workspaceIndex, projectIndex } = use(params);
  const { project } = useProjectRouteContext(workspaceIndex, projectIndex);

  return (
    <ProjectChatWidgetProvider projectId={project?.id ?? null} config={project?.chatWidget ?? null}>
      {children}
    </ProjectChatWidgetProvider>
  );
}
