import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface FormFieldSkeletonProps {
  /** Whether to show a label */
  showLabel?: boolean;
  /** Input height variant */
  inputHeight?: 'sm' | 'md' | 'lg' | 'textarea';
}

/**
 * A skeleton for a single form field.
 */
export function FormFieldSkeleton({
  showLabel = true,
  inputHeight = 'md',
}: FormFieldSkeletonProps) {
  const heightClass = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
    textarea: 'h-24',
  }[inputHeight];

  return (
    <div className="space-y-2">
      {showLabel && <Skeleton className="h-4 w-20" />}
      <Skeleton className={`${heightClass} w-full`} />
    </div>
  );
}

interface FormSkeletonProps {
  /** Number of fields to display */
  fields?: number;
  /** Whether to show a submit button skeleton */
  showSubmit?: boolean;
  /** Whether to wrap in a Card */
  withCard?: boolean;
  /** Whether to show a header */
  showHeader?: boolean;
  /** Layout: single column or two columns */
  columns?: 1 | 2;
}

/**
 * A reusable skeleton loader for forms.
 * 
 * @example
 * <FormSkeleton fields={4} showSubmit columns={2} />
 */
export function FormSkeleton({
  fields = 4,
  showSubmit = true,
  withCard = false,
  showHeader = false,
  columns = 1,
}: FormSkeletonProps) {
  const content = (
    <div className="space-y-4">
      {showHeader && (
        <div className="space-y-2 mb-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      )}
      
      <div className={columns === 2 ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
        {Array.from({ length: fields }).map((_, i) => (
          <FormFieldSkeleton 
            key={i} 
            inputHeight={i === fields - 1 && fields > 2 ? 'textarea' : 'md'} 
          />
        ))}
      </div>
      
      {showSubmit && (
        <div className="flex justify-end gap-2 pt-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      )}
    </div>
  );

  if (withCard) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
        )}
        <CardContent className={showHeader ? undefined : 'pt-6'}>
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
}

export default FormSkeleton;
