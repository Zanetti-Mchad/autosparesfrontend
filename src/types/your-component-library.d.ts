declare module 'your-component-library' {
    import React from 'react';

    interface LabelProps {
        children: React.ReactNode;
        htmlFor?: string; // Optional prop
    }

    interface CheckboxProps {
        id: string;
        checked?: boolean; // Optional prop
        onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; // Optional prop
    }

    const Label: React.FC<LabelProps>;
    const Checkbox: React.FC<CheckboxProps>;

    export { Label, Checkbox };
    // Add other exports as needed
} 