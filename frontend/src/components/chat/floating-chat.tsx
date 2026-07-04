"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTER_MESSAGES: Message[] = [
  {
    role: "assistant",
    content:
      "RescueOS AI online. I can help with search zone analysis, resource allocation, and rescue planning. What do you need?",
  },
];

export function FloatingChat() {
  const [messages, setMessages] = useState<Message[]>(STARTER_MESSAGES);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [
      ...m,
      { role: "user", content: userMsg },
      {
        role: "assistant",
        content: getMockReply(userMsg),
      },
    ]);
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg shadow-orange-500/20"
        size="icon-lg"
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 z-50 flex h-[420px] w-[360px] flex-col border-border/60 shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bot className="h-4 w-4 text-orange-400" />
          AI Assistant
        </CardTitle>
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
          ×
        </Button>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden p-3 pt-0">
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "ml-8 bg-orange-500/15 text-foreground"
                    : "mr-4 bg-muted/50 text-muted-foreground"
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <Input
            placeholder="Ask about rescue ops..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <Button size="icon" onClick={send}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getMockReply(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("drone")) {
    return "Deploy Drone 2 to Sector C immediately. Two survivors detected with 89% confidence. ETA 4 minutes.";
  }
  if (lower.includes("weather") || lower.includes("wind")) {
    return "High winds expected in 18 minutes (22 m/s gusts). Recommend grounding Drone 1 and completing Sector C sweep before then.";
  }
  if (lower.includes("survivor") || lower.includes("wearable")) {
    return "Survivor Gamma is in RED status — HR 118, no movement for 5 min. Dispatch ground team to 34.148, -118.261.";
  }
  return "Analyzing operational data... Priority action: complete Sector C drone sweep, then route Ambulance Alpha to LZ-2.";
}
