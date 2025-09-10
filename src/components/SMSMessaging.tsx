'use client';

import { useState, useRef } from 'react';
import { sendQuickSMS, sendBulkSMS } from '@/lib/smsUtils';

interface SMSMessagingProps {
  recipients?: string[];
  defaultMessage?: string;
  onSendSuccess?: (results: Record<string, string | Error>) => void;
  onSendError?: (error: Error) => void;
}

export default function SMSMessaging({
  recipients = [],
  defaultMessage = '',
  onSendSuccess,
  onSendError
}: SMSMessagingProps) {
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState(defaultMessage);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [numbers, setNumbers] = useState<string[]>(recipients);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format phone number to EGO SMS format (256XXXXXXXXX)
  const formatPhoneNumber = (number: string): string => {
    let formatted = number.replace(/\D/g, '');
    if (formatted.startsWith('0')) {
      return '256' + formatted.substring(1);
    }
    if (!formatted.startsWith('256')) {
      return '256' + formatted;
    }
    return formatted;
  };

  // Validate phone number format
  const isValidPhoneNumber = (number: string): boolean => {
    const digits = number.replace(/\D/g, '');
    return digits.length >= 10 && /^[0-9]+$/.test(digits);
  };

  // Handle sending a single SMS
  const handleSendSMS = async () => {
    if (!phoneNumber || !message) {
      setError('Phone number and message are required');
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsSending(true);
    setError(null);
    setResult(null);

    try {
      const response = await sendQuickSMS(phoneNumber, message);
      setResult(`Message sent successfully: ${response}`);
      if (onSendSuccess) {
        onSendSuccess({ [phoneNumber]: response });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to send message: ${errorMessage}`);
      if (onSendError) {
        onSendError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setIsSending(false);
    }
  };

  // Handle sending bulk SMS
  const handleSendBulkSMS = async () => {
    if (numbers.length === 0 || !message) {
      setError('At least one recipient and a message are required');
      return;
    }

    setIsSending(true);
    setError(null);
    setResult(null);

    try {
      const results = await sendBulkSMS(numbers, message);
      
      // Count successes and failures
      let successCount = 0;
      let failureCount = 0;
      
      Object.values(results).forEach(result => {
        if (result instanceof Error) {
          failureCount++;
        } else {
          successCount++;
        }
      });
      
      setResult(`Messages sent: ${successCount} successful, ${failureCount} failed`);
      
      if (onSendSuccess) {
        onSendSuccess(results);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to send messages: ${errorMessage}`);
      if (onSendError) {
        onSendError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setIsSending(false);
    }
  };

  // Handle importing numbers from CSV
  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const phoneNumbers = content
        .split(/[\r\n,;]+/) // Split by newlines, commas, or semicolons
        .map(num => num.trim())
        .filter(num => num && /^\+?\d+$/.test(num)) // Basic validation
        .map(formatPhoneNumber) // Format all numbers
        .filter(num => num.length >= 12 && num.length <= 13); // Validate length
      
      setNumbers(prev => Array.from(new Set([...prev, ...phoneNumbers]))); // Add unique numbers
      setError(null);
    };
    reader.readAsText(file);
    
    // Reset file input to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove a number from the list
  const removeNumber = (index: number) => {
    setNumbers(prev => prev.filter((_, i) => i !== index));
  };

  // Add a single number to the list
  const addNumber = () => {
    if (!phoneNumber) return;
    
    if (!isValidPhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number (e.g., 07XXXXXXXX or 2567XXXXXXX)');
      return;
    }
    
    const formattedNumber = formatPhoneNumber(phoneNumber);
    if (!numbers.includes(formattedNumber)) {
      setNumbers(prev => [...prev, formattedNumber]);
      setPhoneNumber('');
      setError(null);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">SMS Messaging</h2>
      
      {/* Message input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message
        </label>
        <textarea
          className="w-full p-2 border border-gray-300 rounded-md"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your message here..."
        />
        <p className="text-sm text-gray-500 mt-1">
          {message.length}/160 characters
        </p>
      </div>
      
      {/* Single SMS section */}
      <div className="mb-6 p-4 border border-gray-200 rounded-md">
        <h3 className="font-medium mb-2">Send Single SMS</h3>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 p-2 border border-gray-300 rounded-md"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Phone number (e.g. +256788200915)"
          />
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-blue-300"
            onClick={handleSendSMS}
            disabled={isSending || !phoneNumber || !message}
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
      
      {/* Bulk SMS section */}
      <div className="mb-6 p-4 border border-gray-200 rounded-md">
        <h3 className="font-medium mb-2">Bulk SMS</h3>
        
        {/* Add recipients */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            className="flex-1 p-2 border border-gray-300 rounded-md"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Add phone number"
          />
          <button
            className="px-4 py-2 bg-gray-600 text-white rounded-md"
            onClick={addNumber}
          >
            Add
          </button>
        </div>
        
        {/* Import from CSV */}
        <div className="mb-3">
          <input
            type="file"
            accept=".csv,.txt"
            ref={fileInputRef}
            className="hidden"
            onChange={handleImportCSV}
          />
          <button
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            Import Numbers from CSV/TXT
          </button>
        </div>
        
        {/* Recipients list */}
        <div className="mb-3 max-h-40 overflow-y-auto">
          <h4 className="text-sm font-medium mb-1">Recipients ({numbers.length})</h4>
          <ul className="bg-gray-50 p-2 rounded-md">
            {numbers.length > 0 ? (
              numbers.map((num, index) => (
                <li key={index} className="flex justify-between items-center mb-1 p-1 hover:bg-gray-100">
                  <span>{num}</span>
                  <button
                    className="text-red-600 hover:text-red-800"
                    onClick={() => removeNumber(index)}
                  >
                    Remove
                  </button>
                </li>
              ))
            ) : (
              <li className="text-gray-500 italic">No recipients added</li>
            )}
          </ul>
        </div>
        
        {/* Send bulk button */}
        <button
          className="px-4 py-2 bg-green-600 text-white rounded-md w-full disabled:bg-green-300"
          onClick={handleSendBulkSMS}
          disabled={isSending || numbers.length === 0 || !message}
        >
          {isSending ? 'Sending...' : `Send to ${numbers.length} Recipients`}
        </button>
      </div>
      
      {/* Result/Error messages */}
      {result && (
        <div className="p-3 bg-green-100 text-green-800 rounded-md mb-2">
          {result}
        </div>
      )}
      
      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
} 