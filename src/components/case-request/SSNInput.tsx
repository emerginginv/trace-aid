import { useState, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SSNInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
}

export const SSNInput = forwardRef<HTMLInputElement, SSNInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const [displayValue, setDisplayValue] = useState('');

    // Format SSN as XXX-XX-XXXX
    const formatSSN = (input: string): string => {
      const cleaned = input.replace(/\D/g, '').slice(0, 9);
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
    };

    // Mask SSN as ***-**-1234
    const maskSSN = (ssn: string): string => {
      const cleaned = ssn.replace(/\D/g, '');
      if (cleaned.length === 0) return '';
      if (cleaned.length < 4) return '***-**-****'.slice(0, cleaned.length + 2);
      return `***-**-${cleaned.slice(-4)}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      
      if (isVisible) {
        // When visible, format and store raw digits
        const raw = input.replace(/\D/g, '').slice(0, 9);
        setDisplayValue(formatSSN(input));
        onChange(raw);
      } else {
        // When masked, only allow typing at the end
        const raw = input.replace(/[^0-9*-]/g, '').replace(/\D/g, '').slice(0, 9);
        onChange(raw);
      }
    };

    const handleFocus = () => {
      if (isVisible) {
        setDisplayValue(formatSSN(value));
      }
    };

    const getDisplayValue = (): string => {
      if (isVisible) {
        return displayValue || formatSSN(value);
      }
      return value ? maskSSN(value) : '';
    };

    const toggleVisibility = () => {
      setIsVisible(prev => {
        if (!prev) {
          // Switching to visible
          setDisplayValue(formatSSN(value));
        }
        return !prev;
      });
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          value={getDisplayValue()}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder="XXX-XX-XXXX"
          className={cn("pr-10", className)}
          autoComplete="off"
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={toggleVisibility}
          tabIndex={-1}
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    );
  }
);

SSNInput.displayName = "SSNInput";
