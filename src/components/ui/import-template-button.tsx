import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface ImportTemplateButtonProps {
  templateFileName: string;
  entityDisplayName: string;
  className?: string;
}

interface MultiTemplateOption {
  fileName: string;
  label: string;
}

interface ImportTemplateDropdownProps {
  options: MultiTemplateOption[];
  className?: string;
}

const downloadTemplate = (fileName: string) => {
  const link = document.createElement('a');
  link.href = `/import-templates/${fileName}`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success(`Template downloaded: ${fileName}`);
};

export function ImportTemplateButton({ 
  templateFileName, 
  entityDisplayName,
  className 
}: ImportTemplateButtonProps) {
  const handleDownload = () => {
    downloadTemplate(templateFileName);
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className={`h-10 ${className || ''}`}
      onClick={handleDownload}
      title={`Download ${entityDisplayName} import template`}
    >
      <FileSpreadsheet className="h-4 w-4 mr-2" />
      Template
    </Button>
  );
}

export function ImportTemplateDropdown({ options, className }: ImportTemplateDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={`h-10 ${className || ''}`}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Templates
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((option) => (
          <DropdownMenuItem key={option.fileName} onClick={() => downloadTemplate(option.fileName)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
