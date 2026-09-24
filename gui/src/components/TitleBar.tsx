import { useState, useEffect } from "react";
import { appWindow, LogicalSize } from "@tauri-apps/api/window";
import { exit } from '@tauri-apps/api/process';
import { Minus, Square, X, Maximize2, Moon, Sun, Monitor, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
  MenubarRadioGroup,
  MenubarRadioItem,
} from "@/components/ui/menubar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// Modern Hamburger Icon Component
const HamburgerIcon = ({ open }: { open: boolean }) => (
  <div className="w-5 h-4 flex flex-col justify-between items-start">
    <span
      className={cn(
        "block h-[2px] w-5 bg-current transition-all duration-300 ease-out rounded-full",
        open && "rotate-45 translate-y-[7px] w-5"
      )}
    />
    <span
      className={cn(
        "block h-[2px] w-3.5 bg-current transition-all duration-300 ease-out rounded-full origin-left",
        open && "opacity-0 scale-x-0"
      )}
    />
    <span
      className={cn(
        "block h-[2px] w-5 bg-current transition-all duration-300 ease-out rounded-full",
        open && "-rotate-45 -translate-y-[7px] w-5"
      )}
    />
  </div>
);

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const { theme, setTheme } = useTheme();
  const [showAbout, setShowAbout] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    };

    checkMaximized();

    const unlisten = appWindow.onResized(() => {
      checkMaximized();
    });

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+H - Hide to tray
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        handleClose();
      }
      // Alt+F4 - Exit application
      else if (e.altKey && e.key === 'F4') {
        e.preventDefault();
        handleExit();
      }
      // Ctrl+M - Minimize window
      else if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        handleMinimize();
      }
      // F11 - Toggle maximize
      else if (e.key === 'F11') {
        e.preventDefault();
        handleMaximize();
      }
      // Ctrl+R - Reset window
      else if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        handleResetWindow();
      }
      // Ctrl+Shift+T - Toggle theme
      else if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setTheme(theme === 'dark' ? 'light' : 'dark');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unlisten.then((fn) => fn());
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [theme]);

  const handleMinimize = () => {
    appWindow.minimize();
  };

  const handleMaximize = async () => {
    const maximized = await appWindow.isMaximized();
    if (maximized) {
      appWindow.unmaximize();
    } else {
      appWindow.maximize();
    }
  };

  const handleResetWindow = async () => {
    await appWindow.unmaximize();
    await appWindow.setSize(new LogicalSize(1240, 800));
    await appWindow.center();
  };

  const handleClose = () => {
    appWindow.close();
  };

  const handleExit = async () => {
    // Force exit the application
    await exit(0);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Only maximize if not clicking on interactive elements
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('button, [role="menuitem"], [role="menu"]');

    if (!isInteractive) {
      handleMaximize();
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-12 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/40 rounded-t-lg"
      onDoubleClick={handleDoubleClick}
    >
      {/* Left Section with Logo and Menubar */}
      <div data-tauri-drag-region className="h-full flex items-center px-4 gap-2 md:gap-0">
        {/* Mobile Menu - Show only on small screens */}
        <div className="md:hidden flex items-center">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 flex items-center justify-center">
                <HamburgerIcon open={mobileMenuOpen} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full max-w-[300px] p-0">
              <div className="px-0 pt-6 pb-4">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                      <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-primary to-primary/60" />
                    </div>
                    gui
                  </SheetTitle>
                  <SheetDescription>
                    Navigation menu
                  </SheetDescription>
                </SheetHeader>
              </div>

              <ScrollArea className="h-[calc(100vh-120px)] px-4">
                <Accordion type="multiple" className="w-full space-y-2 pb-6">
                {/* File Menu */}
                <AccordionItem value="file">
                  <AccordionTrigger className="text-sm font-semibold">File</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm"
                        onClick={() => { window.location.reload(); setMobileMenuOpen(false); }}
                      >
                        New Window
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Open...
                      </Button>
                      <Separator className="my-2" />
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm"
                        onClick={() => { handleClose(); setMobileMenuOpen(false); }}
                      >
                        Hide to Tray
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm text-destructive hover:text-destructive"
                        onClick={() => { handleExit(); setMobileMenuOpen(false); }}
                      >
                        Exit
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Edit Menu */}
                <AccordionItem value="edit">
                  <AccordionTrigger className="text-sm font-semibold">Edit</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => setMobileMenuOpen(false)}>
                        Undo
                      </Button>
                      <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => setMobileMenuOpen(false)}>
                        Redo
                      </Button>
                      <Separator className="my-2" />
                      <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => setMobileMenuOpen(false)}>
                        Cut
                      </Button>
                      <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => setMobileMenuOpen(false)}>
                        Copy
                      </Button>
                      <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => setMobileMenuOpen(false)}>
                        Paste
                      </Button>
                      <Separator className="my-2" />
                      <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => setMobileMenuOpen(false)}>
                        Select All
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* View Menu */}
                <AccordionItem value="view">
                  <AccordionTrigger className="text-sm font-semibold">View</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm"
                        onClick={() => { handleMinimize(); setMobileMenuOpen(false); }}
                      >
                        Minimize
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm"
                        onClick={() => { handleMaximize(); setMobileMenuOpen(false); }}
                      >
                        {isMaximized ? "Restore" : "Maximize"}
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm"
                        onClick={() => { handleResetWindow(); setMobileMenuOpen(false); }}
                      >
                        Reset Window
                      </Button>
                      <Separator className="my-2" />
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Theme</div>
                      <Button
                        variant={theme === "light" ? "secondary" : "ghost"}
                        className="w-full justify-start text-sm"
                        onClick={() => { setTheme("light"); setMobileMenuOpen(false); }}
                      >
                        <Sun className="mr-2 h-4 w-4" />
                        Light
                      </Button>
                      <Button
                        variant={theme === "dark" ? "secondary" : "ghost"}
                        className="w-full justify-start text-sm"
                        onClick={() => { setTheme("dark"); setMobileMenuOpen(false); }}
                      >
                        <Moon className="mr-2 h-4 w-4" />
                        Dark
                      </Button>
                      <Button
                        variant={theme === "system" ? "secondary" : "ghost"}
                        className="w-full justify-start text-sm"
                        onClick={() => { setTheme("system"); setMobileMenuOpen(false); }}
                      >
                        <Monitor className="mr-2 h-4 w-4" />
                        System
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Help Menu */}
                <AccordionItem value="help">
                  <AccordionTrigger className="text-sm font-semibold">Help</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1">
                      <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => setMobileMenuOpen(false)}>
                        Documentation
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm"
                        onClick={() => { setShowShortcuts(true); setMobileMenuOpen(false); }}
                      >
                        Keyboard Shortcuts
                      </Button>
                      <Separator className="my-2" />
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm"
                        onClick={() => { setShowAbout(true); setMobileMenuOpen(false); }}
                      >
                        About gui
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo */}
        <div data-tauri-drag-region className="flex items-center gap-3 h-full select-none md:mr-2 pointer-events-none">
          {/* App Icon/Logo */}
          <div data-tauri-drag-region className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <div data-tauri-drag-region className="w-3 h-3 rounded-sm bg-gradient-to-br from-primary to-primary/60" />
          </div>

          {/* App Title */}
          <span data-tauri-drag-region className="text-sm font-medium text-foreground/90">
            gui
          </span>
        </div>

        {/* Menubar - Hide on mobile */}
        <Menubar className="border-0 bg-transparent h-full rounded-none hidden md:flex">
          <MenubarMenu>
            <MenubarTrigger className="text-sm font-normal cursor-default focus:outline-none">File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={() => window.location.reload()}>
                New Window
              </MenubarItem>
              <MenubarItem>Open...</MenubarItem>
              <MenubarSeparator />
              <MenubarItem onClick={handleClose}>Hide to Tray</MenubarItem>
              <MenubarItem onClick={handleExit} className="text-destructive focus:text-destructive">
                Exit
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="text-sm font-normal cursor-default focus:outline-none">Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Undo</MenubarItem>
              <MenubarItem>Redo</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Cut</MenubarItem>
              <MenubarItem>Copy</MenubarItem>
              <MenubarItem>Paste</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Select All</MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="text-sm font-normal cursor-default focus:outline-none">View</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={handleMinimize}>Minimize</MenubarItem>
              <MenubarItem onClick={handleMaximize}>
                {isMaximized ? "Restore" : "Maximize"}
              </MenubarItem>
              <MenubarItem onClick={handleResetWindow}>Reset Window</MenubarItem>
              <MenubarSeparator />
              <MenubarRadioGroup value={theme} onValueChange={(value) => setTheme(value as "dark" | "light" | "system")}>
                <MenubarRadioItem value="light">
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </MenubarRadioItem>
                <MenubarRadioItem value="dark">
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </MenubarRadioItem>
                <MenubarRadioItem value="system">
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="text-sm font-normal cursor-default focus:outline-none">Help</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Documentation</MenubarItem>
              <MenubarItem onClick={() => setShowShortcuts(true)}>
                Keyboard Shortcuts
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onClick={() => setShowAbout(true)}>
                About gui
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>

      {/* Spacer */}
      <div data-tauri-drag-region className="flex-1 pointer-events-none"></div>

      {/* Window Controls */}
      <div className="flex h-full items-center">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={cn(
            "h-8 w-8 mx-2 bg-secondary/60 hover:bg-secondary transition-colors duration-200 rounded-md",
            "flex items-center justify-center group"
          )}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Moon className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        <button
          onClick={handleMinimize}
          className={cn(
            "h-full px-4 hover:bg-accent transition-colors duration-200",
            "flex items-center justify-center group"
          )}
          aria-label="Minimize"
        >
          <Minus className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>

        <button
          onClick={handleMaximize}
          className={cn(
            "h-full px-4 hover:bg-accent transition-colors duration-200",
            "flex items-center justify-center group"
          )}
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <Square className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </button>

        <button
          onClick={handleClose}
          className={cn(
            "h-full px-4 hover:bg-destructive transition-colors duration-200",
            "flex items-center justify-center group"
          )}
          aria-label="Close"
        >
          <X className="w-4 h-4 text-muted-foreground group-hover:text-destructive-foreground transition-colors" />
        </button>
      </div>

      {/* About Dialog */}
      <Dialog open={showAbout} onOpenChange={setShowAbout}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary to-primary/60" />
              </div>
              About gui
            </DialogTitle>
            <DialogDescription className="pt-4">
              A modern, beautiful desktop application built with cutting-edge technologies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform</span>
                <span className="font-medium">Tauri + React</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">UI Framework</span>
                <span className="font-medium">Shadcn UI</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created by</span>
                <span className="font-medium">Your Name</span>
              </div>
            </div>
            <div className="pt-4 text-xs text-center text-muted-foreground">
              © 2026 Your Name. All rights reserved.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Master these shortcuts to boost your productivity
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="font-medium text-sm">Window Controls</div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Minimize Window</span>
                  <kbd className="px-2 py-1 text-xs bg-muted rounded border">Ctrl+M</kbd>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Toggle Maximize</span>
                  <kbd className="px-2 py-1 text-xs bg-muted rounded border">F11</kbd>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Reset Window</span>
                  <kbd className="px-2 py-1 text-xs bg-muted rounded border">Ctrl+R</kbd>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Hide to Tray</span>
                  <kbd className="px-2 py-1 text-xs bg-muted rounded border">Ctrl+H</kbd>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Exit Application</span>
                  <kbd className="px-2 py-1 text-xs bg-muted rounded border">Alt+F4</kbd>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="font-medium text-sm">Appearance</div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Toggle Theme</span>
                  <kbd className="px-2 py-1 text-xs bg-muted rounded border">Ctrl+Shift+T</kbd>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
