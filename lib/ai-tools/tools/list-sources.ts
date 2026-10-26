import { z } from "zod";

import { stripVietnameseDiacritics } from "@/lib/common/strip-vietnamese-diacritics";
import { listSelectableSources } from "@/lib/projects/services/list-selectable-sources";

import { AI_TOOLS_CONFIG } from "../config";
import { defineAiTool } from "../utils/define-ai-tool";

function normalize(text: string) {
  return stripVietnameseDiacritics(text).toLowerCase();
}

export const listSourcesTool = defineAiTool({
  name: "list_sources",
  scope: "projects:write",
  description:
    "Nguồn dữ liệu (group, page Facebook, kênh TikTok, từ khóa tìm kiếm…) mà project có thể theo " +
    "dõi, nhiều bài nhất trước. Lọc theo tên hoặc URL, không cần dấu. Dùng id cho create_project.",
  inputSchema: z.object({
    q: z.string().trim().max(120).optional().describe("Chữ trong tên hoặc URL nguồn."),
    platform: z.string().trim().max(40).optional().describe("VD: facebook, tiktok."),
  }),
  async run({ q, platform }) {
    const { items } = await listSelectableSources();
    const query = q ? normalize(q) : null;
    const matches = items
      .filter((item) => !platform || item.platform === platform)
      .filter((item) => !query || normalize(`${item.name ?? ""} ${item.url ?? ""}`).includes(query))
      .sort((a, b) => b.postCount - a.postCount);
    return {
      total: matches.length,
      items: matches.slice(0, AI_TOOLS_CONFIG.maxSources).map((item) => ({
        id: item.id,
        platform: item.platform,
        type: item.sourceType,
        name: item.name,
        url: item.url,
        members: item.memberCount,
        posts: item.postCount,
        lastCollectedAt: item.lastCollectedAt,
      })),
    };
  },
});
