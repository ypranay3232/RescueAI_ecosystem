"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface Recommendation {
  priority: number;
  action: string;
  eta_minutes: number;
  resource: string;
}

interface AIRecommendationCardProps {
  recommendations: Recommendation[];
  summary?: string;
  riskLevel?: string;
}

export function AIRecommendationCard({ recommendations, summary, riskLevel }: AIRecommendationCardProps) {
  return (
    <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-orange-400" />
          AI Rescue Planner
        </CardTitle>
        {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
        {riskLevel && (
          <span className="inline-flex w-fit rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-400">
            Risk: {riskLevel}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, i) => (
          <motion.div
            key={rec.priority}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-lg border border-border/60 bg-background/50 p-3"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-xs font-bold text-orange-400">
                {rec.priority}
              </span>
              <div>
                <p className="text-sm font-medium">{rec.action}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {rec.resource}
                  {rec.eta_minutes > 0 && ` · ETA ${rec.eta_minutes} min`}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
