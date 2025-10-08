import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { ValidationError, ValidationResult } from '@/lib/validation';

interface FormFieldProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'url' | 'textarea';
  value: string | number;
  onChange: (value: string | number) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  errors?: ValidationError[];
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  min,
  max,
  step,
  rows = 4,
  errors = [],
  className = ''
}) => {
  const fieldErrors = errors.filter(error => error.field === id || error.field === id.split('.').pop());
  const hasErrors = fieldErrors.length > 0;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    onChange(newValue);
  }, [onChange, type]);

  const inputProps = {
    id,
    value: value.toString(),
    onChange: handleChange,
    onBlur,
    placeholder,
    disabled,
    required,
    min,
    max,
    step,
    className: `${hasErrors ? 'border-red-500 focus:border-red-500' : ''} ${className}`
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-white font-medium drop-shadow-sm">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </Label>

      {type === 'textarea' ? (
        <Textarea
          {...inputProps}
          rows={rows}
          className={`bg-white/30 backdrop-blur-sm border-white/40 text-white placeholder-white/70 focus:bg-white/40 focus:border-white/60 ${inputProps.className}`}
        />
      ) : (
        <Input
          {...inputProps}
          type={type}
          className={`bg-white/30 backdrop-blur-sm border-white/40 text-white placeholder-white/70 focus:bg-white/40 focus:border-white/60 ${inputProps.className}`}
        />
      )}

      {hasErrors && (
        <div className="flex items-start gap-2 mt-1">
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-red-400 text-sm drop-shadow-sm">
            {fieldErrors.map((error, index) => (
              <div key={index}>{error.message}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface ValidatedFormProps {
  onSubmit: (data: any) => Promise<void> | void;
  validate: (data: any) => ValidationResult;
  children: React.ReactNode;
  className?: string;
  submitText?: string;
  loading?: boolean;
  resetOnSuccess?: boolean;
  initialData?: any;
}

export const ValidatedForm: React.FC<ValidatedFormProps> = ({
  onSubmit,
  validate,
  children,
  className = '',
  submitText = 'Submit',
  loading = false,
  resetOnSuccess = false,
  initialData = {}
}) => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const data: any = {};

    // Convert FormData to object
    formData.forEach((value, key) => {
      data[key] = value;
    });

    // Validate the data
    const validation = validate(data);
    setErrors(validation.errors);

    if (!validation.isValid) {
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      await onSubmit(data);
      setSubmitSuccess(true);
      setErrors([]);

      if (resetOnSuccess) {
        e.currentTarget.reset();
      }
    } catch (error: any) {
      console.error('Form submission error:', error);
      setErrors([{
        field: 'submit',
        message: error.message || 'An error occurred while submitting the form'
      }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitErrors = errors.filter(error => error.field === 'submit');
  const fieldErrors = errors.filter(error => error.field !== 'submit');

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* Pass errors to children */}
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === FormField) {
          return React.cloneElement(child, { errors: fieldErrors } as any);
        }
        return child;
      })}

      {/* Submit button and feedback */}
      <div className="space-y-4">
        {submitErrors.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-red-400 text-sm">
              {submitErrors.map((error, index) => (
                <div key={index}>{error.message}</div>
              ))}
            </div>
          </div>
        )}

        {submitSuccess && (
          <div className="flex items-start gap-2 p-3 bg-green-500/20 border border-green-500/30 rounded-lg backdrop-blur-sm">
            <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div className="text-green-400 text-sm">
              Form submitted successfully!
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || loading}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Submitting...
            </div>
          ) : (
            submitText
          )}
        </Button>
      </div>
    </form>
  );
};

// Hook for form validation state
export const useFormValidation = (validator: (data: any) => ValidationResult, initialData: any = {}) => {
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});

  const validateField = useCallback((fieldName: string, value: any) => {
    const fieldData = { ...data, [fieldName]: value };
    const validation = validator(fieldData);
    const fieldErrors = validation.errors.filter(error => error.field === fieldName);

    setErrors(prevErrors => [
      ...prevErrors.filter(error => error.field !== fieldName),
      ...fieldErrors
    ]);

    return fieldErrors.length === 0;
  }, [data, validator]);

  const validateAll = useCallback(() => {
    const validation = validator(data);
    setErrors(validation.errors);
    return validation.isValid;
  }, [data, validator]);

  const setValue = useCallback((fieldName: string, value: any) => {
    setData((prev: Record<string, any>) => ({ ...prev, [fieldName]: value }));

    // If field was touched, validate immediately
    if (touched[fieldName]) {
      validateField(fieldName, value);
    }
  }, [touched, validateField]);

  const setTouched = useCallback((fieldName: string) => {
    setTouchedState(prev => ({ ...prev, [fieldName]: true }));
    validateField(fieldName, data[fieldName]);
  }, [data, validateField]);

  const reset = useCallback(() => {
    setData(initialData);
    setErrors([]);
    setTouchedState({});
  }, [initialData]);

  return {
    data,
    errors,
    touched,
    setValue,
    setTouched,
    validateField,
    validateAll,
    reset,
    isValid: errors.length === 0
  };
};