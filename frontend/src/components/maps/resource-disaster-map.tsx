"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { memo } from "react";
import type { ResourceDisasterMapProps } from "./resource-disaster-map-inner";

const MapInner = dynamic(() => import("./resource-disaster-map-inner").then((m) => m.MapInner), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-[450px] w-full rounded-2xl bg-muted/40" />,
});

const ResourceDisasterMapInner = memo(MapInner);

export function ResourceDisasterMap(props: ResourceDisasterMapProps) {
  return (
    <div className="relative h-full w-full rounded-2xl border border-border/50 overflow-hidden shadow-2xl">
      <ResourceDisasterMapInner {...props} />
    </div>
  );
}
