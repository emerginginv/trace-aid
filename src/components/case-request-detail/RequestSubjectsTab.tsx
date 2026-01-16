import { User, Mail, Phone, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CaseRequestSubject {
  id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  date_of_birth: string | null;
  email: string | null;
  cell_phone: string | null;
  address1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  is_primary: boolean | null;
  subject_type_id: string | null;
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
  const getSubjectTypeName = (typeId: string | null) => {
    if (!typeId) return 'Unknown';
    const type = subjectTypes.find(t => t.id === typeId);
    return type?.name || 'Unknown';
  };

  const formatName = (subject: CaseRequestSubject) => {
    const parts = [subject.first_name, subject.middle_name, subject.last_name].filter(Boolean);
    return parts.join(' ') || 'Unnamed Subject';
  };

  const formatAddress = (subject: CaseRequestSubject) => {
    const parts = [
      subject.address1,
      [subject.city, subject.state].filter(Boolean).join(', '),
      subject.zip,
    ].filter(Boolean);
    return parts.join(' ');
  };

  if (subjects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No subjects</h3>
          <p className="text-muted-foreground">
            This request has no subjects attached.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((subject) => (
              <TableRow key={subject.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatName(subject)}</span>
                    {subject.is_primary && (
                      <Badge variant="secondary" className="text-xs">Primary</Badge>
                    )}
                  </div>
                  {subject.date_of_birth && (
                    <p className="text-sm text-muted-foreground">
                      DOB: {subject.date_of_birth}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {getSubjectTypeName(subject.subject_type_id)}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {subject.email && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <a href={`mailto:${subject.email}`} className="text-primary hover:underline">
                          {subject.email}
                        </a>
                      </div>
                    )}
                    {subject.cell_phone && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <a href={`tel:${subject.cell_phone}`} className="hover:underline">
                          {subject.cell_phone}
                        </a>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {formatAddress(subject) ? (
                    <div className="flex items-start gap-1.5 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                      <span>{formatAddress(subject)}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
