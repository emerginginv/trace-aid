import { useState } from "react";
import { format } from "date-fns";
import { User, Mail, Phone, MapPin, Eye, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubjectDetailDrawer } from "./SubjectDetailDrawer";

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

interface RequestSubjectsTabProps {
  subjects: CaseRequestSubject[];
  subjectTypes: SubjectType[];
}

export function RequestSubjectsTab({ subjects, subjectTypes }: RequestSubjectsTabProps) {
  const [selectedSubject, setSelectedSubject] = useState<CaseRequestSubject | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const getSubjectTypeName = (typeId: string | null) => {
    if (!typeId) return "Unknown Type";
    const type = subjectTypes.find((t) => t.id === typeId);
    return type?.name || "Unknown Type";
  };

  const formatName = (subject: CaseRequestSubject) => {
    const parts = [subject.first_name, subject.middle_name, subject.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "Unnamed Subject";
  };

  const formatAddress = (subject: CaseRequestSubject) => {
    const parts = [subject.city, subject.state, subject.zip].filter(Boolean);
    return parts.join(", ");
  };

  const getInitials = (subject: CaseRequestSubject) => {
    const first = subject.first_name?.[0] || "";
    const last = subject.last_name?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const getPhysicalDescription = (subject: CaseRequestSubject) => {
    const parts = [];
    if (subject.sex) parts.push(subject.sex);
    if (subject.age !== null) parts.push(`${subject.age} years`);
    return parts.join(", ");
  };

  const handleViewDetails = (subject: CaseRequestSubject) => {
    setSelectedSubject(subject);
    setDrawerOpen(true);
  };

  if (subjects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No subjects</p>
          <p className="text-sm">No subjects were submitted with this request.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {subjects.map((subject) => (
          <Card key={subject.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Avatar className="h-16 w-16 flex-shrink-0">
                  <AvatarImage src={subject.photo_url || undefined} alt={formatName(subject)} />
                  <AvatarFallback className="text-lg">{getInitials(subject)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{formatName(subject)}</h3>
                        {subject.is_primary && <Badge variant="default" className="text-xs">Primary</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getSubjectTypeName(subject.subject_type_id)}
                        {getPhysicalDescription(subject) && <> • {getPhysicalDescription(subject)}</>}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(subject)} className="flex-shrink-0">
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                    {subject.date_of_birth && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>DOB: {format(new Date(subject.date_of_birth), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    {subject.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <a href={`mailto:${subject.email}`} className="truncate hover:text-foreground transition-colors">{subject.email}</a>
                      </div>
                    )}
                    {subject.cell_phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <a href={`tel:${subject.cell_phone}`} className="hover:text-foreground transition-colors">{subject.cell_phone}</a>
                      </div>
                    )}
                    {formatAddress(subject) && (
                      <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{subject.address1 && `${subject.address1}, `}{formatAddress(subject)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <SubjectDetailDrawer subject={selectedSubject} subjectTypes={subjectTypes} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}
