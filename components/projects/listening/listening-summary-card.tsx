"use client";

import { CircleCheckIcon, LightbulbIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  ListeningDemo,
  ListeningInsight,
  ListeningPrompt,
} from "@/lib/projects/listening-demo-data";

const TONE_STYLE: Record<
  ListeningInsight["tone"],
  { icon: typeof TriangleAlertIcon; className: string }
> = {
  alert: {
    icon: TriangleAlertIcon,
    className: "text-rose-700 dark:text-rose-400",
  },
  idea: {
    icon: LightbulbIcon,
    className: "text-amber-700 dark:text-amber-400",
  },
  good: {
    icon: CircleCheckIcon,
    className: "text-emerald-700 dark:text-emerald-400",
  },
};

type ListeningSummaryCardProps = {
  demo: ListeningDemo;
};

function answerFor(question: string, prompts: ListeningPrompt[]) {
  const query = question.trim().toLowerCase();
  const exact = prompts.find((prompt) => prompt.label.toLowerCase() === query);
  if (exact) {
    return exact.answer;
  }

  const match = prompts.find((prompt) =>
    prompt.keywords.some((keyword) => query.includes(keyword)),
  );

  return match?.answer ?? prompts[0]?.answer ?? "";
}

export function ListeningSummaryCard({ demo }: ListeningSummaryCardProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  function ask(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed) {
      return;
    }

    setQuestion(trimmed);
    setAnswer(answerFor(trimmed, demo.prompts));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tóm tắt kỳ này</CardTitle>
        <CardDescription>
          Việc nên làm với dữ liệu demo. Hỏi đáp bên dưới cũng là câu trả lời mẫu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="max-w-4xl text-sm leading-relaxed">{demo.brief}</p>
        <div className="grid gap-3 lg:grid-cols-3">
          {demo.insights.map((insight) => {
            const tone = TONE_STYLE[insight.tone];
            const Icon = tone.icon;

            return (
              <div key={insight.text} className="flex gap-2.5 rounded-lg bg-muted/70 px-3 py-2.5">
                <Icon className={`mt-0.5 size-4 shrink-0 ${tone.className}`} />
                <p className="text-sm leading-snug text-muted-foreground">
                  {insight.text}
                </p>
              </div>
            );
          })}
        </div>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            ask(question);
          }}
        >
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Hỏi AI về dữ liệu của bạn..."
            aria-label="Hỏi AI về dữ liệu của bạn"
          />
          <Button type="submit">Hỏi</Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {demo.prompts.map((prompt) => (
            <Button
              key={prompt.label}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => ask(prompt.label)}
            >
              {prompt.label}
            </Button>
          ))}
        </div>
        {answer ? (
          <p className="text-sm leading-relaxed">{answer}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
