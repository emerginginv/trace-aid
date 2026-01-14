import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, X } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Subject, PERSON_ROLES } from "../types";
import { ProfileImageUpload } from "../../ProfileImageUpload";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

const personSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  role: z.string().min(1, "Role is required"),
  date_of_birth: z.date().optional().nullable(),
  height: z.string().optional(),
  weight: z.string().optional(),
  hair_color: z.string().optional(),
  eye_color: z.string().optional(),
  identifying_marks: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export type PersonFormValues = z.infer<typeof personSchema>;

interface PersonFormProps {
  subject?: Subject;
  onSubmit: (values: PersonFormValues, profileImageUrl: string | null) => void;
  isSubmitting: boolean;
  readOnly?: boolean;
}

export const PersonForm = ({ subject, onSubmit, isSubmitting, readOnly = false }: PersonFormProps) => {
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(subject?.profile_image_url || null);
  const [dobOpen, setDobOpen] = useState(false);
  const [aliasInput, setAliasInput] = useState("");

  const details = subject?.details || {};
  const existingAliases = details.aliases 
    ? (typeof details.aliases === 'string' ? details.aliases.split(',').map((a: string) => a.trim()).filter(Boolean) : details.aliases)
    : [];

  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      name: subject?.name || "",
      role: subject?.role || "",
      date_of_birth: details.date_of_birth ? new Date(details.date_of_birth) : null,
      height: details.height || "",
      weight: details.weight || "",
      hair_color: details.hair_color || "",
      eye_color: details.eye_color || "",
      identifying_marks: details.identifying_marks || "",
      aliases: existingAliases,
      notes: subject?.notes || "",
    },
  });

  const aliases = form.watch("aliases") || [];

  const addAlias = () => {
    if (aliasInput.trim() && !aliases.includes(aliasInput.trim())) {
      form.setValue("aliases", [...aliases, aliasInput.trim()]);
      setAliasInput("");
    }
  };

  const removeAlias = (alias: string) => {
    form.setValue("aliases", aliases.filter((a) => a !== alias));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addAlias();
    }
  };

  const handleSubmit = (values: PersonFormValues) => {
    onSubmit(values, profileImageUrl);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="flex items-start gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Profile Photo</label>
            {!readOnly && (
              <ProfileImageUpload
                currentImageUrl={profileImageUrl || undefined}
                onImageChange={setProfileImageUrl}
                subjectId={subject?.id}
              />
            )}
            {readOnly && profileImageUrl && (
              <img src={profileImageUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
            )}
          </div>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John Doe or Unknown Male #1" {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PERSON_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date_of_birth"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Birth</FormLabel>
              <Popover open={dobOpen} onOpenChange={setDobOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      disabled={readOnly}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={(date) => {
                      field.onChange(date);
                      setDobOpen(false);
                    }}
                    disabled={(date) => date > new Date()}
                    captionLayout="dropdown"
                    fromYear={1920}
                    toYear={new Date().getFullYear()}
                    defaultMonth={field.value || new Date(2000, 0, 1)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Physical Description Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Physical Description</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="height"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Height</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 5'10&quot;" {...field} disabled={readOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 180 lbs" {...field} disabled={readOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="hair_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hair Color</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Brown" {...field} disabled={readOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="eye_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Eye Color</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Blue" {...field} disabled={readOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="identifying_marks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Identifying Marks</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Scars, tattoos, birthmarks..."
                    className="min-h-[60px]"
                    {...field}
                    disabled={readOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="aliases"
          render={() => (
            <FormItem>
              <FormLabel>Aliases</FormLabel>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add alias..."
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={readOnly}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={addAlias}
                    disabled={readOnly || !aliasInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {aliases.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {aliases.map((alias, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {alias}
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => removeAlias(alias)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional notes..."
                  className="min-h-[100px]"
                  {...field}
                  disabled={readOnly}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!readOnly && (
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : subject ? "Update Person" : "Add Person"}
          </Button>
        )}
      </form>
    </Form>
  );
};
