import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CaseContext {
  caseTitle: string;
  caseNumber: string;
  statute?: string;
  agencyType?: string;
  state?: string;
  subjects?: string[];
  recordsRequested?: string;
}

interface AIDraftFieldProps {
  fieldType: 'fee_waiver' | 'expedited' | 'purpose';
  value: string;
  onChange: (value: string) => void;
  caseContext: CaseContext;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  description?: string;
}

type ToneDirection = 'formal' | 'assertive' | 'diplomatic';

export function AIDraftField({
  fieldType,
  value,
  onChange,
  caseContext,
  placeholder,
  disabled,
  label,
  description,
}: AIDraftFieldProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  const handleDraft = async (tone?: ToneDirection) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('draft-case-content', {
        body: {
          type: fieldType,
          caseContext,
          toneDirection: tone,
        },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (data.error.includes('credits')) {
          toast.error('AI credits depleted. Please add funds to continue.');
        } else {
          throw new Error(data.error);
        }
        return;
      }

      if (data?.content) {
        onChange(data.content);
        toast.success('Draft generated');
      }
    } catch (error) {
      console.error('AI draft error:', error);
      toast.error('Failed to generate draft');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async (tone: ToneDirection) => {
    if (!value.trim()) {
      toast.error('Enter some text first to refine');
      return;
    }

    setIsRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke('draft-case-content', {
        body: {
          type: 'refine',
          caseContext,
          existingText: value,
          toneDirection: tone,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.content) {
        onChange(data.content);
        toast.success('Text refined');
      }
    } catch (error) {
      console.error('AI refine error:', error);
      toast.error('Failed to refine text');
    } finally {
      setIsRefining(false);
    }
  };

  const fieldLabels = {
    fee_waiver: 'Fee Waiver Justification',
    expedited: 'Expedited Processing Justification',
    purpose: 'Purpose of Request',
  };

  const fieldPlaceholders = {
    fee_waiver: 'Explain why disclosure serves the public interest and qualifies for a fee waiver...',
    expedited: 'Explain why expedited processing is warranted...',
    purpose: 'Briefly describe the purpose of this records request...',
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium">{label || fieldLabels[fieldType]}</label>
      )}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || fieldPlaceholders[fieldType]}
          disabled={disabled || isLoading || isRefining}
          className="min-h-[100px] pr-2"
          rows={4}
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isLoading || isRefining}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              Draft with AI
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleDraft('formal')}>
              Formal tone
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDraft('assertive')}>
              Assertive tone
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDraft('diplomatic')}>
              Diplomatic tone
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {value.trim() && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || isLoading || isRefining}
              >
                {isRefining ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Refine
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleRefine('formal')}>
                More formal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRefine('assertive')}>
                More assertive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRefine('diplomatic')}>
                Softer tone
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
