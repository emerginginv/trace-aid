import { format } from "date-fns";
import { X, User, MapPin, Phone, Mail, Calendar, Ruler, Scale } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface CaseRequestSubject {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  alias: string | null;
  date_of_birth: string | null;
  age: number | null;
  sex: string | null;
  race: string | null;
  height: string | null;
  weight: string | null;
  ssn: string | null;
  email: string | null;
  cell_phone: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  photo_url: string | null;
  is_primary: boolean | null;
  subject_type_id: string | null;
  custom_fields: Record<string, any> | null;
}

interface SubjectType {
  id: string;
  name: string;
}

interface SubjectDetailDrawerProps {
  subject: CaseRequestSubject | null;
  subjectTypes: SubjectType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubjectDetailDrawer({
  subject,
  subjectTypes,
  open,
  onOpenChange,
}: SubjectDetailDrawerProps) {
  if (!subject) return null;

  const getSubjectTypeName = (typeId: string | null) => {
    if (!typeId) return "Unknown Type";
    const type = subjectTypes.find((t) => t.id === typeId);
    return type?.name || "Unknown Type";
  };

  const formatName = () => {
    const parts = [subject.first_name, subject.middle_name, subject.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "Unnamed Subject";
  };

  const formatAddress = () => {
    const lines = [
      subject.address1,
      subject.address2,
      subject.address3,
    ].filter(Boolean);
    
    const cityStateZip = [
      subject.city,
      subject.state,
      subject.zip,
    ].filter(Boolean).join(", ");
    
    if (cityStateZip) lines.push(cityStateZip);
    if (subject.country) lines.push(subject.country);
    
    return lines;
  };

  const getInitials = () => {
    const first = subject.first_name?.[0] || "";
    const last = subject.last_name?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const maskSSN = (ssn: string) => {
    if (ssn.length >= 4) {
      return `***-**-${ssn.slice(-4)}`;
    }
    return "***-**-****";
  };

  const addressLines = formatAddress();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={subject.photo_url || undefined} alt={formatName()} />
              <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span>{formatName()}</span>
                {subject.is_primary && (
                  <Badge variant="default" className="text-xs">Primary</Badge>
                )}
              </div>
              <p className="text-sm font-normal text-muted-foreground">
                {getSubjectTypeName(subject.subject_type_id)}
              </p>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Identity Section */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Identity
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {subject.alias && (
                <div>
                  <span className="text-muted-foreground">Alias:</span>
                  <p className="font-medium">{subject.alias}</p>
                </div>
              )}
              {subject.date_of_birth && (
                <div>
                  <span className="text-muted-foreground">Date of Birth:</span>
                  <p className="font-medium">
                    {format(new Date(subject.date_of_birth), "MMM d, yyyy")}
                  </p>
                </div>
              )}
              {subject.age !== null && (
                <div>
                  <span className="text-muted-foreground">Age:</span>
                  <p className="font-medium">{subject.age} years</p>
                </div>
              )}
              {subject.sex && (
                <div>
                  <span className="text-muted-foreground">Sex:</span>
                  <p className="font-medium capitalize">{subject.sex}</p>
                </div>
              )}
              {subject.race && (
                <div>
                  <span className="text-muted-foreground">Race:</span>
                  <p className="font-medium">{subject.race}</p>
                </div>
              )}
              {subject.ssn && (
                <div>
                  <span className="text-muted-foreground">SSN:</span>
                  <p className="font-medium">{maskSSN(subject.ssn)}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Physical Description */}
          {(subject.height || subject.weight) && (
            <>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Physical Description
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {subject.height && (
                    <div>
                      <span className="text-muted-foreground">Height:</span>
                      <p className="font-medium">{subject.height}</p>
                    </div>
                  )}
                  {subject.weight && (
                    <div>
                      <span className="text-muted-foreground">Weight:</span>
                      <p className="font-medium">{subject.weight}</p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Contact Information */}
          {(subject.email || subject.cell_phone) && (
            <>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact Information
                </h3>
                <div className="space-y-2 text-sm">
                  {subject.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${subject.email}`} className="text-primary hover:underline">
                        {subject.email}
                      </a>
                    </div>
                  )}
                  {subject.cell_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${subject.cell_phone}`} className="text-primary hover:underline">
                        {subject.cell_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Address */}
          {addressLines.length > 0 && (
            <>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </h3>
                <div className="text-sm">
                  {addressLines.map((line, index) => (
                    <p key={index} className="font-medium">{line}</p>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Custom Fields */}
          {subject.custom_fields && Object.keys(subject.custom_fields).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Additional Information
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {Object.entries(subject.custom_fields).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/_/g, " ")}:
                    </span>
                    <p className="font-medium">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
