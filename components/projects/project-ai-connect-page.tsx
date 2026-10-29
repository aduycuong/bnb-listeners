"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectChatWidgetCard } from "@/components/projects/project-chat-widget-card";
import { ProjectFormPage } from "@/components/projects/project-form-layout";
import { mcpEndpointUrl } from "@/components/workspace/api-key-dialog";
import { WorkspaceApiKeysCard } from "@/components/workspace/workspace-api-keys-card";
import { useProjectRouteContext } from "@/hooks/use-project-route-context";

type ProjectAiConnectPageProps = {
  workspaceIndexParam: string;
  projectIndexParam: string;
};

function CopyBlock({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative rounded-md border bg-muted">
      <pre className="overflow-x-auto px-3 py-2 pr-11 font-mono text-xs leading-relaxed whitespace-pre">
        {value}
      </pre>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-1.5 right-1.5"
        onClick={copy}
        aria-label={`Sao chép ${label}`}
      >
        {copied ? <CheckIcon className="size-4 text-green-600" /> : <CopyIcon className="size-4" />}
      </Button>
    </div>
  );
}

function clientSnippets(url: string) {
  return [
    {
      id: "http",
      label: "Agent HTTP",
      hint: "Chat agent, Cursor và client MCP hỗ trợ Streamable HTTP kèm header.",
      code: JSON.stringify(
        {
          mcpServers: {
            "bnb-listening": { url, headers: { Authorization: "Bearer <API_KEY>" } },
          },
        },
        null,
        2,
      ),
    },
    {
      id: "claude-code",
      label: "Claude Code",
      hint: "Chạy trong terminal.",
      code: `claude mcp add --transport http bnb-listening ${url} --header "Authorization: Bearer <API_KEY>"`,
    },
    {
      id: "claude-desktop",
      label: "Claude Desktop",
      hint: "Thêm vào claude_desktop_config.json; dùng mcp-remote để gửi header.",
      code: JSON.stringify(
        {
          mcpServers: {
            "bnb-listening": {
              command: "npx",
              args: ["-y", "mcp-remote", url, "--header", "Authorization:Bearer ${BNB_API_KEY}"],
              env: { BNB_API_KEY: "<API_KEY>" },
            },
          },
        },
        null,
        2,
      ),
    },
  ];
}

function subscribeNever() {
  return () => {};
}

/** The project's MCP connection (D27): endpoint, sample client configs, and its API keys. */
export function ProjectAiConnectPage({
  workspaceIndexParam,
  projectIndexParam,
}: ProjectAiConnectPageProps) {
  const { workspace, project } = useProjectRouteContext(workspaceIndexParam, projectIndexParam);
  // The full URL needs the browser's origin; the server render shows the path.
  const url = useSyncExternalStore(subscribeNever, mcpEndpointUrl, () => "/api/mcp");

  if (!workspace || !project) return null;
  const snippets = clientSnippets(url);

  return (
    <ProjectFormPage
      title="Kết nối AI"
      description={
        <p>
          Cho Claude, chat agent hay công cụ khác đọc số liệu và đề cập của {project.name} qua MCP.
        </p>
      }
    >
      <div className="flex max-w-3xl flex-col gap-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle>Địa chỉ MCP</CardTitle>
            <CardDescription>
              Streamable HTTP. Gửi API key trong header{" "}
              <code className="text-xs">Authorization: Bearer &lt;API_KEY&gt;</code>. Agent gọi{" "}
              <code className="text-xs">list_projects</code> để lấy id project, hoặc dùng id bên dưới.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <CopyBlock value={url} label="địa chỉ MCP" />
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">Id project</p>
              <CopyBlock value={project.id} label="id project" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cấu hình mẫu</CardTitle>
            <CardDescription>Thay &lt;API_KEY&gt; bằng key tạo ở dưới.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={snippets[0].id}>
              <TabsList>
                {snippets.map((snippet) => (
                  <TabsTrigger key={snippet.id} value={snippet.id}>
                    {snippet.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {snippets.map((snippet) => (
                <TabsContent key={snippet.id} value={snippet.id} className="flex flex-col gap-2 pt-2">
                  <p className="text-xs text-muted-foreground">{snippet.hint}</p>
                  <CopyBlock value={snippet.code} label={`cấu hình ${snippet.label}`} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <ProjectChatWidgetCard
          key={`${project.id}:${project.chatWidget.enabled}:${project.chatWidget.publicKey}`}
          workspace={workspace}
          project={project}
        />

        <WorkspaceApiKeysCard workspace={workspace} project={project} />
      </div>
    </ProjectFormPage>
  );
}
