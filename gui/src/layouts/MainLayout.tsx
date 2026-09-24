import { ThemeProvider } from "@/components/theme-provider";
import { TitleBar } from "@/components/TitleBar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <ThemeProvider>
      <Toaster />
      <TitleBar />
      <div className="bg-gray-50 dark:bg-[#0a0a0a] pt-12 h-screen overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="w-full p-6 space-y-4">
            {children}
          </div>
        </ScrollArea>
      </div>
    </ThemeProvider>
  );
};
