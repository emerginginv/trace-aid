/**
 * Not Found Page
 * 
 * Displayed when a requested resource doesn't exist.
 */

import { FileQuestion, ArrowLeft, Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface NotFoundPageProps {
  /** Custom title for the page */
  title?: string;
  /** Custom description */
  description?: string;
  /** Resource type that wasn't found */
  resourceType?: string;
  /** Resource ID that wasn't found */
  resourceId?: string;
  /** Show back button */
  showBackButton?: boolean;
  /** Custom back URL */
  backUrl?: string;
  /** Show search suggestion */
  showSearchSuggestion?: boolean;
  /** Search URL for the resource type */
  searchUrl?: string;
}

export function NotFoundPage({
  title = 'Not Found',
  description = "The resource you're looking for doesn't exist or has been removed.",
  resourceType,
  resourceId,
  showBackButton = true,
  backUrl,
  showSearchSuggestion = false,
  searchUrl,
}: NotFoundPageProps) {
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

  const handleSearch = () => {
    if (searchUrl) {
      navigate(searchUrl);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-base">
            {description}
            {resourceType && (
              <span className="block mt-2 text-sm">
                {resourceType}
                {resourceId && (
                  <span className="font-mono text-xs ml-1">({resourceId.slice(0, 8)}...)</span>
                )}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
          {showBackButton && (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          )}
          {showSearchSuggestion && searchUrl && (
            <Button variant="outline" onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              Search {resourceType || 'Resources'}
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
