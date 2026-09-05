"use client";

import type { TopicCardSparklinePoint } from "@/lib/topics/types";
import { cn } from "@/lib/utils";

type TopicSparklineProps = {
  points: TopicCardSparklinePoint[];
  className?: string;
};

export function TopicSparkline({ points, className }: TopicSparklineProps) {
  const width = 140;
  const height = 40;
  const padding = 2;
  const maxCount = Math.max(1, ...points.map((point) => point.docCount));

  const coordinates = points.map((point, index) => {
    const x =
      padding +
      (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
    const y =
      height -
      padding -
      (point.docCount / maxCount) * (height - padding * 2);

    return { x, y };
  });

  const linePath = coordinates
    .map((point, index) =>
      index === 0
        ? `M ${point.x} ${point.y}`
        : `L ${point.x} ${point.y}`,
    )
    .join(" ");

  const areaPath = `${linePath} L ${coordinates.at(-1)?.x ?? width} ${height - padding} L ${coordinates[0]?.x ?? padding} ${height - padding} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-10 w-full text-primary", className)}
      aria-hidden
    >
      <path
        d={areaPath}
        className="fill-primary/15"
      />
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
