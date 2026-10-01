import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ListeningDemo } from "@/lib/projects/listening-demo-data";

import { ShareList } from "./listening-ui";

type ListeningPlacesCardProps = {
  demo: ListeningDemo;
};

export function ListeningPlacesCard({ demo }: ListeningPlacesCardProps) {
  return (
    <Card className="h-full @container">
      <CardHeader>
        <CardTitle>Kênh và địa điểm</CardTitle>
        <CardDescription>
          Thảo luận xuất phát từ đâu, và địa danh được nhắc
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 @min-[28rem]:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-medium">Kênh</p>
          <ShareList items={demo.channels} />
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium">Địa danh</p>
          <ShareList items={demo.places} />
        </div>
      </CardContent>
    </Card>
  );
}
