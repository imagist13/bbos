import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Calendar } from "@/components/ui/calendar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { NavigationMenuDemo } from "@/components/demo/NavigationMenuDemo";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  Sparkles,
  Settings,
  User,
  LogOut,
  AlertCircle,
  Terminal,
  Home,
  Calendar as CalendarIcon,
  Info,
  Bold,
  Italic,
  Underline,
  Plus,
  Minus,
  Calculator,
  Smile,
  CreditCard,
} from "lucide-react";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

// Form validation schema (FormField pattern)
const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  bio: z.string().max(160, {
    message: "Bio must not exceed 160 characters.",
  }).optional(),
  framework: z.string({
    message: "Please select a framework.",
  }),
  newsletter: z.boolean().default(false).optional(),
  notifications: z.enum(["all", "mentions", "none"], {
    message: "Please select a notification preference.",
  }),
  marketingEmails: z.boolean().default(false).optional(),
  dob: z.date({
    message: "A date of birth is required.",
  }),
});

// Modern Field pattern schema (Controller pattern - Recommended)
const bugReportSchema = z.object({
  title: z
    .string()
    .min(5, "Bug title must be at least 5 characters.")
    .max(32, "Bug title must be at most 32 characters."),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters.")
    .max(100, "Description must be at most 100 characters."),
});

export const DemoComponents = () => {
  const [textValue, setTextValue] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [status, setStatus] = useState("online");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isChecked, setIsChecked] = useState(false);
  const [switchState, setSwitchState] = useState(false);
  const [radioValue, setRadioValue] = useState("option-one");
  const [progress, setProgress] = useState(33);
  const [isOpen, setIsOpen] = useState(false);
  const [togglePressed, setTogglePressed] = useState(false);
  const [toggleGroupValue, setToggleGroupValue] = useState("left");

  // Form instance (FormField pattern)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      bio: "",
      newsletter: false,
      marketingEmails: false,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    toast.success("Form submitted!", {
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(values, null, 2)}</code>
        </pre>
      ),
    });
  }

  // Modern Field pattern form (Controller pattern - Recommended)
  const bugReportForm = useForm<z.infer<typeof bugReportSchema>>({
    resolver: zodResolver(bugReportSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  function onBugReportSubmit(data: z.infer<typeof bugReportSchema>) {
    toast.success("Bug report submitted!", {
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
  }

  return (
    <>
      {/* Header */}
      <div className="text-center space-y-2 gap-2 mt-5 mb-10 flex flex-col items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Exploring 52 Shadcn UI Components
        </h1>
        <p className="text-muted-foreground w-full mx-auto md:w-[500px]">
          A showcase and demonstration of 52 beautifully designed, production-ready UI components from the Shadcn UI library, built with React and Tailwind CSS.
        </p>
      </div>

      {/* Button Variants Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Button Variants
        </h2>
        <div className="flex flex-col gap-4">
          {/* Small */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs text-muted-foreground min-w-[60px]">Small</span>
            <Button size="sm">Default</Button>
            <Button size="sm" variant="destructive">Destructive</Button>
            <Button size="sm" variant="outline">Outline</Button>
            <Button size="sm" variant="secondary">Secondary</Button>
            <Button size="sm" variant="ghost">Ghost</Button>
            <Button size="sm" variant="link">Link</Button>
          </div>
          {/* Default */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs text-muted-foreground min-w-[60px]">Default</span>
            <Button size="default">Default</Button>
            <Button size="default" variant="destructive">Destructive</Button>
            <Button size="default" variant="outline">Outline</Button>
            <Button size="default" variant="secondary">Secondary</Button>
            <Button size="default" variant="ghost">Ghost</Button>
            <Button size="default" variant="link">Link</Button>
          </div>
          {/* Large */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs text-muted-foreground min-w-[60px]">Large</span>
            <Button size="lg">Default</Button>
            <Button size="lg" variant="destructive">Destructive</Button>
            <Button size="lg" variant="outline">Outline</Button>
            <Button size="lg" variant="secondary">Secondary</Button>
            <Button size="lg" variant="ghost">Ghost</Button>
            <Button size="lg" variant="link">Link</Button>
          </div>
          {/* Icon */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs text-muted-foreground min-w-[60px]">Icon</span>
            <Button size="icon">
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="destructive">
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline">
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary">
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost">
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="link">
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Dropdown Menus Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Dropdown Menus</h2>
        <div className="flex flex-wrap gap-4">
          {/* Simple Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Menu <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Checkbox Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Preferences <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Preferences</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={notifications}
                onCheckedChange={setNotifications}
              >
                Notifications
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>
                Email Updates
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Radio Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Status: {status} <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={status} onValueChange={setStatus}>
                <DropdownMenuRadioItem value="online">
                  Online
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="away">
                  Away
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="busy">
                  Busy
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="offline">
                  Offline
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Textarea Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Textarea</h2>
        <Textarea
          placeholder="Type your message here..."
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          className="min-h-[120px]"
        />
        {textValue && (
          <p className="text-sm text-muted-foreground">
            Characters: {textValue.length}
          </p>
        )}
      </div>

      {/* Resizable Panels Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Resizable Panels</h2>
        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-[300px] rounded-lg border"
        >
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">Panel 1</h3>
                <p className="text-sm text-muted-foreground">
                  Drag the handle to resize
                </p>
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="flex h-full items-center justify-center p-6 bg-muted/30">
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">Panel 2</h3>
                <p className="text-sm text-muted-foreground">
                  Try resizing this panel
                </p>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Accordion Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Accordion</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>
              Yes. It adheres to the WAI-ARIA design pattern.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Is it styled?</AccordionTrigger>
            <AccordionContent>
              Yes. It comes with default styles that matches the other components' aesthetic.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Is it animated?</AccordionTrigger>
            <AccordionContent>
              Yes. It's animated by default, but you can disable it if you prefer.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Alert Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Alert</h2>
        <div className="space-y-4">
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Heads up!</AlertTitle>
            <AlertDescription>
              You can add components to your app using the cli.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Your session has expired. Please log in again.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Aspect Ratio Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Aspect Ratio</h2>
        <AspectRatio ratio={16 / 9} className="bg-muted rounded-md overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
            alt="Photo by Drew Beamer"
            className="h-full w-full object-cover"
          />
        </AspectRatio>
      </div>

      {/* Avatar & Badge Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Avatar & Badge</h2>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          </div>
          <Separator orientation="vertical" className="h-12" />
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </div>
      </div>

      {/* Breadcrumb Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Breadcrumb</h2>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">
                <Home className="h-4 w-4" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Components</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Calendar Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Calendar</h2>
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border"
          />
        </div>
      </div>

      {/* Carousel Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Carousel</h2>
        <Carousel className="w-full max-w-xs mx-auto">
          <CarouselContent>
            {Array.from({ length: 5 }).map((_, index) => (
              <CarouselItem key={index}>
                <div className="p-1">
                  <Card>
                    <CardContent className="flex aspect-square items-center justify-center p-6">
                      <span className="text-4xl font-semibold">{index + 1}</span>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>

      {/* Card Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Card</h2>
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This is a card component. It can contain any content you want.
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline">Cancel</Button>
            <Button>Deploy</Button>
          </CardFooter>
        </Card>
      </div>

      {/* Checkbox & Switch Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Checkbox & Switch</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="terms" checked={isChecked} onCheckedChange={(checked) => setIsChecked(checked as boolean)} />
            <label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Accept terms and conditions
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="airplane-mode" checked={switchState} onCheckedChange={setSwitchState} />
            <Label htmlFor="airplane-mode">Airplane Mode</Label>
          </div>
        </div>
      </div>

      {/* Collapsible Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Collapsible</h2>
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">@peduarte starred 3 repositories</h4>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0">
                <ChevronDown className="h-4 w-4" />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          <div className="rounded-md border px-4 py-3 text-sm">@radix-ui/primitives</div>
          <CollapsibleContent className="space-y-2">
            <div className="rounded-md border px-4 py-3 text-sm">@radix-ui/colors</div>
            <div className="rounded-md border px-4 py-3 text-sm">@stitches/react</div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Command Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Command</h2>
        <Command className="rounded-lg border shadow-md">
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem>
                <CalendarIcon />
                <span>Calendar</span>
              </CommandItem>
              <CommandItem>
                <Smile />
                <span>Search Emoji</span>
              </CommandItem>
              <CommandItem disabled>
                <Calculator />
                <span>Calculator</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Settings">
              <CommandItem>
                <User />
                <span>Profile</span>
              </CommandItem>
              <CommandItem>
                <CreditCard />
                <span>Billing</span>
              </CommandItem>
              <CommandItem>
                <Settings />
                <span>Settings</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </div>

      {/* Context Menu Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Context Menu</h2>
        <ContextMenu>
          <ContextMenuTrigger className="flex h-[150px] w-full items-center justify-center rounded-md border border-dashed text-sm">
            Right click here
          </ContextMenuTrigger>
          <ContextMenuContent className="w-64">
            <ContextMenuItem inset>
              Back
            </ContextMenuItem>
            <ContextMenuItem inset disabled>
              Forward
            </ContextMenuItem>
            <ContextMenuItem inset>
              Reload
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger inset>More Tools</ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                <ContextMenuItem>
                  Save Page As...
                </ContextMenuItem>
                <ContextMenuItem>Create Shortcut...</ContextMenuItem>
                <ContextMenuItem>Name Window...</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {/* Dialog & Alert Dialog Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Dialog & Alert Dialog</h2>
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
                <DialogDescription>
                  Make changes to your profile here. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input id="name" value="John Doe" className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your
                  account and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Drawer Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Drawer</h2>
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline">Open Drawer</Button>
          </DrawerTrigger>
          <DrawerContent>
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader>
                <DrawerTitle>Move Goal</DrawerTitle>
                <DrawerDescription>Set your daily activity goal.</DrawerDescription>
              </DrawerHeader>
              <div className="p-4 pb-0">
                <div className="flex items-center justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-full"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 text-center">
                    <div className="text-7xl font-bold tracking-tighter">350</div>
                    <div className="text-[0.70rem] uppercase text-muted-foreground">
                      Calories/day
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <DrawerFooter>
                <Button>Submit</Button>
                <DrawerClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Hover Card Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Hover Card</h2>
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button variant="link">@nextjs</Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="flex justify-between space-x-4">
              <Avatar>
                <AvatarImage src="https://github.com/vercel.png" />
                <AvatarFallback>VC</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">@nextjs</h4>
                <p className="text-sm">
                  The React Framework – created and maintained by @vercel.
                </p>
                <div className="flex items-center pt-2">
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                  <span className="text-xs text-muted-foreground">
                    Joined December 2021
                  </span>
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>

      {/* Input & Select Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Input & Select</h2>
        <div className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input type="email" id="email" placeholder="Email" />
          </div>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="framework">Framework</Label>
            <Select>
              <SelectTrigger id="framework">
                <SelectValue placeholder="Select a framework" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="react">React</SelectItem>
                <SelectItem value="vue">Vue</SelectItem>
                <SelectItem value="angular">Angular</SelectItem>
                <SelectItem value="svelte">Svelte</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Input OTP Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Input OTP</h2>
        <InputOTP maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      {/* Modern Field Pattern with React Hook Form (Recommended) */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <div className="space-y-2">
          <h2 className="text-md font-medium">Modern Field Pattern (Controller + Field - Recommended)</h2>
          <p className="text-sm text-muted-foreground">
            The recommended approach using Field components with Controller from React Hook Form for flexible, accessible forms.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bug Report</CardTitle>
            <CardDescription>
              Help us improve by reporting bugs you encounter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="bug-report-form" onSubmit={bugReportForm.handleSubmit(onBugReportSubmit)}>
              <FieldGroup>
                <Controller
                  name="title"
                  control={bugReportForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="bug-report-title">
                        Bug Title
                      </FieldLabel>
                      <Input
                        {...field}
                        id="bug-report-title"
                        aria-invalid={fieldState.invalid}
                        placeholder="Login button not working on mobile"
                        autoComplete="off"
                      />
                      <FieldDescription>
                        Provide a concise title for your bug report (5-32 characters).
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="description"
                  control={bugReportForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="bug-report-description">
                        Description
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupTextarea
                          {...field}
                          id="bug-report-description"
                          placeholder="I'm having an issue with the login button on mobile..."
                          rows={6}
                          className="min-h-24 resize-none"
                          aria-invalid={fieldState.invalid}
                        />
                        <InputGroupAddon align="block-end">
                          <InputGroupText className="tabular-nums">
                            {field.value.length}/100 characters
                          </InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                      <FieldDescription>
                        Include steps to reproduce, expected behavior, and what actually happened (20-100 characters).
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
            </form>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => bugReportForm.reset()}
            >
              Reset
            </Button>
            <Button type="submit" form="bug-report-form">
              Submit Bug Report
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* React Hook Form with Zod Validation Section (FormField Pattern) */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <div className="space-y-2">
          <h2 className="text-md font-medium">React Hook Form + Zod Validation (FormField Pattern)</h2>
          <p className="text-sm text-muted-foreground">
            Legacy FormField pattern - comprehensive form with validation, error handling, and various input types.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Username Field */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is your public display name.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      We'll never share your email.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormDescription>
                      Minimum 8 characters required.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Framework Select */}
              <FormField
                control={form.control}
                name="framework"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Framework</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a framework" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="react">React</SelectItem>
                        <SelectItem value="vue">Vue</SelectItem>
                        <SelectItem value="angular">Angular</SelectItem>
                        <SelectItem value="svelte">Svelte</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose your preferred framework.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Bio Textarea */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about yourself..."
                      className="resize-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Brief description for your profile (max 160 characters).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date of Birth */}
            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of Birth</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Your date of birth is used to calculate your age.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notification Radio Group */}
            <FormField
              control={form.control}
              name="notifications"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Notify me about...</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="all" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          All new messages
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="mentions" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Direct messages and mentions
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="none" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Nothing
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Newsletter Checkbox */}
            <FormField
              control={form.control}
              name="newsletter"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Subscribe to newsletter
                    </FormLabel>
                    <FormDescription>
                      Receive updates about new features and products.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Marketing Emails Switch */}
            <FormField
              control={form.control}
              name="marketingEmails"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Marketing emails
                    </FormLabel>
                    <FormDescription>
                      Receive emails about new products, features, and more.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button type="submit" className="flex-1">
                Submit Form
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                className="flex-1"
              >
                Reset Form
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Menubar Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Menubar</h2>
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                New Tab
              </MenubarItem>
              <MenubarItem>New Window</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Share</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Print</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Undo</MenubarItem>
              <MenubarItem>Redo</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Always Show Bookmarks Bar</MenubarItem>
              <MenubarItem>Always Show Full URLs</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>

      {/* Navigation Menu Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Navigation Menu</h2>
        <p className="text-sm text-muted-foreground">
          A comprehensive navigation menu with multiple variations: nested menus, simple links, lists, and icon navigation.
        </p>
        <div className="flex justify-center">
          <NavigationMenuDemo />
        </div>
      </div>

      {/* Pagination Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Pagination</h2>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                2
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Popover Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Popover</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Open popover</Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Dimensions</h4>
                <p className="text-sm text-muted-foreground">
                  Set the dimensions for the layer.
                </p>
              </div>
              <div className="grid gap-2">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="width">Width</Label>
                  <Input
                    id="width"
                    defaultValue="100%"
                    className="col-span-2 h-8"
                  />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="maxWidth">Max. width</Label>
                  <Input
                    id="maxWidth"
                    defaultValue="300px"
                    className="col-span-2 h-8"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Radio Group Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Radio Group</h2>
        <RadioGroup value={radioValue} onValueChange={setRadioValue}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option-one" id="option-one" />
            <Label htmlFor="option-one">Option One</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option-two" id="option-two" />
            <Label htmlFor="option-two">Option Two</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option-three" id="option-three" />
            <Label htmlFor="option-three">Option Three</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Progress Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Progress</h2>
        <div className="space-y-4">
          <Progress value={progress} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setProgress(Math.max(0, progress - 10))}>
              Decrease
            </Button>
            <Button size="sm" onClick={() => setProgress(Math.min(100, progress + 10))}>
              Increase
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll Area Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Scroll Area</h2>
        <ScrollArea className="h-72 w-full rounded-md border">
          <div className="p-4">
            <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
            {Array.from({ length: 50 }).map((_, i) => (
              <div key={i} className="text-sm">
                Tag {i + 1}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Sheet Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Sheet</h2>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Open Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Edit profile</SheetTitle>
              <SheetDescription>
                Make changes to your profile here. Click save when you're done.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input id="name" value="Pedro Duarte" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Username
                </Label>
                <Input id="username" value="@peduarte" className="col-span-3" />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Skeleton Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Skeleton</h2>
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-12 w-1/2" />
        </div>
      </div>

      {/* Spinner Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Spinner</h2>
        <div className="flex items-center gap-4">
          <Spinner className="size-4" />
          <Spinner className="size-6" />
          <Spinner className="size-8" />
        </div>
      </div>

      {/* Table Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Table</h2>
        <Table>
          <TableCaption>A list of your recent invoices.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Invoice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">INV001</TableCell>
              <TableCell>Paid</TableCell>
              <TableCell>Credit Card</TableCell>
              <TableCell className="text-right">$250.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">INV002</TableCell>
              <TableCell>Pending</TableCell>
              <TableCell>PayPal</TableCell>
              <TableCell className="text-right">$150.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">INV003</TableCell>
              <TableCell>Unpaid</TableCell>
              <TableCell>Bank Transfer</TableCell>
              <TableCell className="text-right">$350.00</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Tabs Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Tabs</h2>
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Make changes to your account here. Click save when you're done.
            </p>
          </TabsContent>
          <TabsContent value="password" className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Change your password here. After saving, you'll be logged out.
            </p>
          </TabsContent>
          <TabsContent value="settings" className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Adjust your application settings and preferences.
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Toggle Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Toggle</h2>
        <div className="flex gap-2">
          <Toggle aria-label="Toggle italic" pressed={togglePressed} onPressedChange={setTogglePressed}>
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle aria-label="Toggle italic">
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle aria-label="Toggle underline">
            <Underline className="h-4 w-4" />
          </Toggle>
        </div>
      </div>

      {/* Toggle Group Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Toggle Group</h2>
        <ToggleGroup type="single" value={toggleGroupValue} onValueChange={setToggleGroupValue}>
          <ToggleGroupItem value="left" aria-label="Align left">
            <Bold className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" aria-label="Align center">
            <Italic className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" aria-label="Align right">
            <Underline className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Tooltip Section */}
      <div className="space-y-4 p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-md font-medium">Tooltip</h2>
        <div className="flex flex-wrap gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add to library</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>This is a helpful tooltip!</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex flex-col items-center justify-center gap-2 py-8">
        <div className="flex items-center gap-2 text-base font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent select-none">
          <Sparkles className="h-4 w-4" />
          Crafted with ❤️ by the gui Team
          <span className="text-xs font-normal px-2 py-0.5 rounded bg-secondary text-foreground/60">2025</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          A modern desktop UI experience.
          <a
            href="https://github.com/sunnysid3up/project-wind"
            className="underline underline-offset-4 ml-1 hover:text-primary transition"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </>
  );
};
