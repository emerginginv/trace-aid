import { useRef, forwardRef, useImperativeHandle, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Braces } from "lucide-react";

// Define all available placeholders with categories
const PLACEHOLDER_OPTIONS = [
  // Organization placeholders
  { key: 'company_name', label: 'Company Name', category: 'Organization' },
  { key: 'company_logo', label: 'Company Logo', category: 'Organization' },
  { key: 'company_address', label: 'Full Address', category: 'Organization' },
  { key: 'company_street', label: 'Street Address', category: 'Organization' },
  { key: 'company_city', label: 'City', category: 'Organization' },
  { key: 'company_state', label: 'State', category: 'Organization' },
  { key: 'company_zip', label: 'ZIP Code', category: 'Organization' },
  { key: 'company_phone', label: 'Phone', category: 'Organization' },
  { key: 'company_email', label: 'Email', category: 'Organization' },
  { key: 'company_website', label: 'Website', category: 'Organization' },
  // Case placeholders
  { key: 'case_title', label: 'Case Title', category: 'Case Info' },
  { key: 'case_number', label: 'Case Number', category: 'Case Info' },
  { key: 'claim_number', label: 'Claim Number', category: 'Case Info' },
  // People placeholders
  { key: 'client_list', label: 'All Clients', category: 'People' },
  { key: 'primary_client', label: 'Primary Client', category: 'People' },
  { key: 'subject_list', label: 'All Subjects', category: 'People' },
  { key: 'primary_subject', label: 'Primary Subject', category: 'People' },
  { key: 'investigator_list', label: 'Investigators', category: 'People' },
  { key: 'case_manager', label: 'Case Manager', category: 'People' },
  { key: 'location_list', label: 'Locations', category: 'People' },
  // Date placeholders
  { key: 'assignment_date', label: 'Assignment Date', category: 'Dates' },
  { key: 'due_date', label: 'Due Date', category: 'Dates' },
  { key: 'surveillance_dates', label: 'Surveillance Date Range', category: 'Dates' },
  { key: 'surveillance_start', label: 'Surveillance Start', category: 'Dates' },
  { key: 'surveillance_end', label: 'Surveillance End', category: 'Dates' },
  { key: 'current_date', label: 'Current Date', category: 'Dates' },
];

// Group placeholders by category
const groupedPlaceholders = PLACEHOLDER_OPTIONS.reduce((acc, placeholder) => {
  if (!acc[placeholder.category]) {
    acc[placeholder.category] = [];
  }
  acc[placeholder.category].push(placeholder);
  return acc;
}, {} as Record<string, typeof PLACEHOLDER_OPTIONS>);

const CATEGORY_ORDER = ['Organization', 'Case Info', 'People', 'Dates'];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showPlaceholderDropdown?: boolean;
}

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link"],
    ["clean"],
  ],
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "align",
  "link",
];

export const RichTextEditor = forwardRef<ReactQuill, RichTextEditorProps>(
  ({ value, onChange, placeholder, className, showPlaceholderDropdown = false }, ref) => {
    const quillRef = useRef<ReactQuill>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useImperativeHandle(ref, () => quillRef.current as ReactQuill);

    const insertPlaceholder = (placeholderKey: string) => {
      const quill = quillRef.current?.getEditor();
      if (!quill) return;

      const placeholderText = `{{${placeholderKey}}}`;
      const range = quill.getSelection(true); // true = focus if not focused

      if (range) {
        quill.insertText(range.index, placeholderText);
        // Move cursor after the inserted text
        quill.setSelection(range.index + placeholderText.length, 0);
      } else {
        // If no selection, append at end
        const length = quill.getLength();
        quill.insertText(length - 1, placeholderText);
      }

      setDropdownOpen(false);
    };

    return (
      <div className={cn("rich-text-editor", className)}>
        {showPlaceholderDropdown && (
          <div className="flex justify-end mb-2">
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                  <Braces className="h-3.5 w-3.5" />
                  <span className="text-xs">Insert Placeholder</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
                {CATEGORY_ORDER.map((category, categoryIndex) => {
                  const placeholders = groupedPlaceholders[category];
                  if (!placeholders) return null;

                  return (
                    <div key={category}>
                      {categoryIndex > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                        {category}
                      </DropdownMenuLabel>
                      <DropdownMenuGroup>
                        {placeholders.map((p) => (
                          <DropdownMenuItem
                            key={p.key}
                            onClick={() => insertPlaceholder(p.key)}
                            className="cursor-pointer"
                          >
                            <span className="flex-1">{p.label}</span>
                            <code className="text-[10px] text-muted-foreground ml-2">
                              {`{{${p.key}}}`}
                            </code>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </div>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
        />
      </div>
    );
  }
);

RichTextEditor.displayName = "RichTextEditor";
