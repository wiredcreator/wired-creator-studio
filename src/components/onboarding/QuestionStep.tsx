'use client';

import VoiceTextarea from './VoiceTextarea';

export interface QuestionConfig {
  fieldKey: string;
  label: string;
  helperText: string;
  placeholder: string;
  required: boolean;
  rows?: number;
  stepTitle: string;
  stepSubtitle: string;
}

interface QuestionStepProps {
  question: QuestionConfig;
  value: string;
  onChange: (value: string) => void;
}

export default function QuestionStep({ question, value, onChange }: QuestionStepProps) {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center mb-10">
        <h2
          className="text-3xl font-semibold mb-3"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {question.stepTitle}
        </h2>
        <p
          className="text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {question.stepSubtitle}
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor={question.fieldKey}
          className="block text-base font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {question.label}
          {question.required && (
            <span style={{ color: 'var(--color-warning)' }}> *</span>
          )}
        </label>
        <p
          className="text-sm"
          style={{ color: 'var(--color-text-muted)' }}
          dangerouslySetInnerHTML={{ __html: question.helperText }}
        />
        <VoiceTextarea
          id={question.fieldKey}
          value={value}
          onChange={onChange}
          placeholder={question.placeholder}
          rows={question.rows || 5}
        />
      </div>
    </div>
  );
}
