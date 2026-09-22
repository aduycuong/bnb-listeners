"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
  table: ({ children, ...props }) => (
    <div className="typeset-scroll">
      <table {...props}>{children}</table>
    </div>
  ),
};

type ResearchMarkdownProps = {
  content: string;
};

export function ResearchMarkdown({ content }: ResearchMarkdownProps) {
  return (
    <div className="typeset typeset-docs">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
