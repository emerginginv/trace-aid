// UI Components - Barrel exports for commonly used components
// This provides cleaner imports across the codebase

// Core components
export { Badge, badgeVariants, type BadgeProps } from './badge';
export { Button, buttonVariants } from './button';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';
export { Input } from './input';
export { Label } from './label';
export { Textarea } from './textarea';

// Status & indicators
export { StatusBadge, PriorityBadge } from './status-badge';
export { Spinner } from './spinner';
export { Skeleton } from './skeleton';

// AI components (consolidated)
export { AIBadge, type AIBadgeProps } from './ai-badge';
export { AIButton, aiButtonVariants, AI_TOOLTIP_MESSAGE, type AIButtonProps } from './ai-button';
export { AIIndicator } from './ai-indicator';
export { AILabel } from './ai-label';

// Dialog & overlays
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './alert-dialog';
export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './sheet';

// Form components
export { Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField } from './form';
export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator } from './select';
export { Checkbox } from './checkbox';
export { Switch } from './switch';
export { RadioGroup, RadioGroupItem } from './radio-group';

// Navigation & menus
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './dropdown-menu';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

// Feedback
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';
export { useToast, toast } from './use-toast';
export { Toaster } from './toaster';
export { Progress } from './progress';

// Layout
export { ScrollArea, ScrollBar } from './scroll-area';
export { Separator } from './separator';
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion';
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible';

// Data display
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from './table';
export { Avatar, AvatarImage, AvatarFallback } from './avatar';
export { Calendar } from './calendar';
