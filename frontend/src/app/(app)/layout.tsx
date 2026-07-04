import { AppSidebar } from "@/components/layout/app-sidebar";
import { FloatingChat } from "@/components/chat/floating-chat";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
      <FloatingChat />
    </div>
  );
}
