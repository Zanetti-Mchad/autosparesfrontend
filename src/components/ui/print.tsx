"use client";

import React, { forwardRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface PrintableContentProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

const PrintableContent = forwardRef<HTMLDivElement, PrintableContentProps>(
  ({ children, title = "Document", className = "" }, ref) => {
    const handlePrint = useReactToPrint({
      contentRef: ref as React.RefObject<HTMLDivElement>,
      documentTitle: title,
      pageStyle: `
        @page {
          margin: 0.5in;
          size: A4;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-break {
            page-break-before: always;
          }
        }
      `,
    });

    return (
      <div className={`print-container ${className}`}>
        <div className="no-print mb-4 flex justify-end">
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
        <div ref={ref} className="print-content">
          {children}
        </div>
      </div>
    );
  }
);

PrintableContent.displayName = 'PrintableContent';

export default PrintableContent;
