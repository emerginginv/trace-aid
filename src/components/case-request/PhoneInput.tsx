import React, { useState, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { formatPhoneNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onChange, onBlur, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      setDisplayValue(rawValue);
      onChange?.(rawValue);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const formattedValue = formatPhoneNumber(displayValue);
      setDisplayValue(formattedValue);
      onChange?.(formattedValue);
      onBlur?.(e);
    };

    // Sync with external value changes
    React.useEffect(() => {
      if (value !== displayValue) {
        setDisplayValue(value);
      }
    }, [value]);

    return (
      <Input
        ref={ref}
        type="tel"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="(555) 555-5555"
        className={cn(className)}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
