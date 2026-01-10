import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCenterSheet } from "./HelpCenterSheet";

export function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="h-5 w-5" />
            <span className="sr-only">Help Center</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Help Center</p>
        </TooltipContent>
      </Tooltip>

      <HelpCenterSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
