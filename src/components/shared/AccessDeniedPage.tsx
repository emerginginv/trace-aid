/**
 * Access Denied Page
 * 
 * Displayed when user attempts to access a resource they don't have permission for.
 */

import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface AccessDeniedPageProps {
  /** Custom title for the page */
  title?: string;
  /** Custom description explaining the denial */
  description?: string;
  /** Resource type that was denied */
  resourceType?: string;
  /** Show back button */
  showBackButton?: boolean;
  /** Custom back URL */
  backUrl?: string;
}

export function AccessDeniedPage({
  title = 'Access Denied',
  description = "You don't have permission to view this resource.",
  resourceType,
  showBackButton = true,
  backUrl,
}: AccessDeniedPageProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backUrl) {
      navigate(backUrl);
    } else {
      navigate(-1);
    }
  };

  const handleHome = () => {
    navigate('/');
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-base">
            {description}
            {resourceType && (
              <span className="block mt-1 text-sm">
                Resource type: <span className="font-medium">{resourceType}</span>
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 justify-center">
          {showBackButton && (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          )}
          <Button onClick={handleHome}>
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
