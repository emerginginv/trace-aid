import { User, Star, MapPin, Phone, Mail, Calendar, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SubjectWithImage } from "@/lib/caseSummaryData";

interface PdfSubjectCardsProps {
  subjects: SubjectWithImage[];
}

export function PdfSubjectCards({ subjects }: PdfSubjectCardsProps) {
  if (subjects.length === 0) {
    return null;
  }

  const formatDetailValue = (key: string, value: any): string => {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  const getSubjectTypeIcon = (type: string) => {
    if (type.toLowerCase().includes("vehicle")) {
      return <Car className="h-4 w-4" />;
    }
    return <User className="h-4 w-4" />;
  };

  return (
    <div className="pdf-section mb-6">
      <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2 mb-4 flex items-center gap-2">
        <User className="h-5 w-5 text-primary" />
        Subjects ({subjects.length})
      </h2>
      
      <div className="grid grid-cols-2 gap-4">
        {subjects.map((subject) => (
          <div 
            key={subject.id} 
            className="border border-border rounded-lg p-4 bg-card"
          >
            <div className="flex gap-4">
              {/* Photo */}
              <div className="shrink-0">
                {subject.signedImageUrl ? (
                  <img
                    src={subject.signedImageUrl}
                    alt={subject.name}
                    className="w-20 h-20 object-cover rounded-lg border border-border"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center border border-border">
                    {getSubjectTypeIcon(subject.subject_type)}
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground truncate">{subject.name}</h3>
                  {subject.is_primary && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Primary
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground capitalize mt-0.5">
                  {subject.subject_type.replace(/_/g, " ")}
                </p>
                
                {/* Details */}
                {subject.details && (
                  <div className="mt-2 space-y-1 text-xs">
                    {Object.entries(subject.details).slice(0, 6).map(([key, value]) => {
                      const formattedValue = formatDetailValue(key, value);
                      if (!formattedValue) return null;
                      
                      return (
                        <div key={key} className="flex gap-1">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, " ")}:
                          </span>
                          <span className="font-medium truncate">{formattedValue}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {subject.notes && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {subject.notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
