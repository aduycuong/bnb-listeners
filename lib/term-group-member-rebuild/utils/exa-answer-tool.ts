import { tool } from "langchain";
import { z } from "zod";

import { exaAnswer } from "@/lib/exa/services/exa-answer";

export const exaAnswerTool = tool(
  async ({ query }) => {
    const result = await exaAnswer({
      query,
      text: true,
    });

    return result.answer;
  },
  {
    name: "exa_answer",
    description:
      "Tra cứu web qua Exa để làm rõ tên term, dự án, địa danh, thương hiệu hoặc thực thể mơ hồ. Chỉ gọi khi tên/mô tả term không đủ để quyết định có thuộc group hay không. Đặt câu hỏi đầy đủ ngữ cảnh trong query.",
    schema: z.object({
      query: z
        .string()
        .min(1)
        .describe(
          "Câu hỏi tra cứu web — nên gồm tên term và ngữ cảnh group/phạm vi thu thập.",
        ),
    }),
  },
);
