'use client';
import { formatDisplayDate, formatDisplayDateTime } from '@/lib/formatDate';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { jsPDF } from 'jspdf'; // Add this import

import { 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  FileText, 
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Plus,
  FilePlus2
} from 'lucide-react';
import { fetchApi } from '@/lib/apiConfig';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

// Types
interface QuoteItem {
  id: string;
  productId: string;
  productName: string;
  size: string;
  quantity: number;
  purchasePrice: string;
  sellingPrice: string;
  unitPrice: number;
  totalPrice: number;
  description?: string;
  availableSizes?: SizeOption[];
}

interface Quote {
  id: string;
  quoteNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    company?: string;
    address?: string;
    customerCity?: string; // Changed from city
    customerDistrict?: string; // Changed from district
  };
  items: QuoteItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  includeVat: boolean;
  vatRate: number;
  validUntil: number;
  notes?: string;
  terms?: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
  createdAt: string;
  updatedAt: string;
}

interface SizeOption {
  value: string;
  label: string;
}

const ViewQuotes = () => {
  const router = useRouter();
  // State
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editableQuote, setEditableQuote] = useState<Quote | null>(null);

  // Fetch quotes
  const fetchQuotes = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const data = await fetchApi('/quotes', {
        method: 'GET', // Explicitly set method to GET
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        } as any
      });

      const fetchedData = (data?.data?.quotes || data?.items || data) as any[];
      const fetchedQuotes: Quote[] = Array.isArray(fetchedData) ? fetchedData.map((quote: any) => ({
        ...quote,
        customer: {
          name: quote.customerName || '',
          email: quote.customerEmail || '',
          phone: quote.customerPhone || '',
          company: quote.customerCompany || '',
          address: quote.customerAddress || '',
          customerCity: quote.customerCity || '',
          customerDistrict: quote.customerDistrict || '',
        },
        // Ensure items are also correctly typed if needed, though they seem fine from the log
        items: quote.items.map((item: any) => ({
          ...item,
          purchasePrice: item.unitPrice ? item.unitPrice.toString() : '0', // Assuming unitPrice from API is purchasePrice
          sellingPrice: item.unitPrice ? item.unitPrice.toString() : '0', // Assuming unitPrice from API is sellingPrice
        }))
      })) : [];
      setQuotes(fetchedQuotes);
      setFilteredQuotes(fetchedQuotes);

    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error('Failed to load quotes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Filter quotes
  useEffect(() => {
    let filtered = quotes;

    if (searchTerm) {
      filtered = filtered.filter(quote =>
        quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.customer.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(quote => quote.status === statusFilter);
    }

    setFilteredQuotes(filtered);
  }, [quotes, searchTerm, statusFilter]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800';
      case 'Sent':
        return 'bg-blue-100 text-blue-800';
      case 'Accepted':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'Expired':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Draft':
        return <FileText className="h-4 w-4" />;
      case 'Sent':
        return <Clock className="h-4 w-4" />;
      case 'Accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'Rejected':
        return <XCircle className="h-4 w-4" />;
      case 'Expired':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return formatDisplayDate(dateString);
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = (createdAt: string, validUntil: number) => {
    const created = new Date(createdAt);
    const expiry = new Date(created.getTime() + validUntil * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Handle quote actions
  const handleViewQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsViewModalOpen(true);
  };

  const handleEditQuote = (quote: Quote) => {
    setEditableQuote(quote);
    setIsEditModalOpen(true);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (editableQuote) {
      setEditableQuote(prev => {
        if (!prev) return null;
        // Handle nested customer object
        if (name.startsWith('customer.')) {
          const customerField = name.split('.')[1];
          return {
            ...prev,
            customer: { ...prev.customer, [customerField]: value }
          };
        }
        // Handle top-level fields like validUntil, notes, terms, includeVat, status
        if (name === 'validUntil') {
          return { ...prev, [name]: parseInt(value) || 0 };
        } else if (name === 'includeVat') {
            // This will be handled by the checkbox directly
        } else if (name === 'status') {
          return { ...prev, [name]: value as Quote['status'] };
        }
        return { ...prev, [name]: value };
      });
    }
  };

  const handleEditItemChange = (itemId: string, field: keyof QuoteItem, value: any) => {
    if (editableQuote) {
      setEditableQuote(prev => {
        if (!prev) return null;
        const updatedItems = prev.items.map(item => {
          if (item.id === itemId) {
            const updatedItem = { ...item, [field]: value };
            // Recalculate total price if quantity or sellingPrice changes
            if (field === 'quantity' || field === 'sellingPrice') {
              const currentSellingPrice = parseFloat(updatedItem.sellingPrice) || 0;
              const currentQuantity = parseInt(updatedItem.quantity.toString()) || 0;
              updatedItem.totalPrice = currentQuantity * currentSellingPrice;
              updatedItem.unitPrice = currentSellingPrice;
            } else if (field === 'purchasePrice' || field === 'size') {
                // Just update the value, no recalculation needed for these fields affecting total
            }
            return updatedItem;
          }
          return item;
        });
        
        const newSubtotal = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const newVatAmount = prev.includeVat ? newSubtotal * prev.vatRate : 0; 
        const newTotal = newSubtotal + newVatAmount;

        return {
          ...prev,
          items: updatedItems,
          subtotal: newSubtotal,
          vatAmount: newVatAmount,
          total: newTotal,
        };
      });
    }
  };

  const handleSaveEdit = () => {
    if (editableQuote) {
      setQuotes(prevQuotes =>
        prevQuotes.map(quote => (quote.id === editableQuote.id ? editableQuote : quote))
      );
      setIsEditModalOpen(false);
      setEditableQuote(null);
      toast.success('Quote updated successfully!');
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    // This function will be removed along with its menu item
  };

  const handleDuplicateQuote = (quote: Quote) => {
    // This function will be removed along with its menu item
  };

  // Helper function to draw a dashed line
  const drawDashedLine = (
    doc: jsPDF,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    dashLength: number = 1,
    gapLength: number = 1
  ) => {
    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const dashAndGap = dashLength + gapLength;
    const numDashes = Math.floor(length / dashAndGap);
    const xStep = (x2 - x1) / length * dashAndGap;
    const yStep = (y2 - y1) / length * dashAndGap;

    for (let i = 0; i < numDashes; i++) {
      const startX = x1 + i * xStep;
      const startY = y1 + i * yStep;
      const endX = startX + (x2 - x1) / length * dashLength;
      const endY = startY + (y2 - y1) / length * dashLength;
      doc.line(startX, startY, endX, endY);
    }
  };


  const handleGenerateInvoice = async (quote: Quote) => {
    try {
      setGeneratingId(quote.id);
      const res = await fetchApi("/sales/invoices/from-quote", {
        method: "POST",
        body: JSON.stringify({ quoteId: quote.id }),
      });
      const invoice = res?.data || res;
      toast.success(
        invoice?.invoiceNumber
          ? `Invoice ${invoice.invoiceNumber} created`
          : "Invoice created from quote"
      );
      router.push("/pages/sales/invoices");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate invoice");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleDownloadQuote = async (quote: Quote) => {
    const {
      fetchBusinessSettings,
      businessDisplayName,
      businessDetailLines,
    } = await import("@/lib/businessSettings");
    const business = await fetchBusinessSettings();
    const companyName = businessDisplayName(business);
    const companyDetails = businessDetailLines(business);

    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 180] // Thermal receipt with extra bottom space
    });

    let yPos = 10;
    const centerX = doc.internal.pageSize.width / 2;
    const margin = 5;
    const lineHeight = 5; // Reduced line height for compact receipt look
    const smallTextSize = 8;
    const normalTextSize = 10;
    const largeTextSize = 14;

    // Business name from Settings
    doc.setFontSize(largeTextSize);
    doc.text(companyName, centerX, yPos, { align: 'center' });
    yPos += lineHeight;
    doc.setFontSize(smallTextSize);
    if (companyDetails.length) {
      companyDetails.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, 70);
        wrapped.forEach((w: string) => {
          doc.text(w, centerX, yPos, { align: 'center' });
          yPos += lineHeight;
        });
      });
    }
    yPos += lineHeight;

    // Address
    doc.setFontSize(normalTextSize);
    doc.text(quote.customer.address || '', centerX, yPos, { align: 'center' });
    yPos += lineHeight;
    doc.text(`${quote.customer.customerCity || ''}, ${quote.customer.customerDistrict || ''}`, centerX, yPos, { align: 'center' }); // Changed to customerCity, customerDistrict
    yPos += lineHeight * 2;

    // Date, Time, Quote ID
    doc.setFontSize(smallTextSize);
    doc.text(formatDisplayDateTime(quote.createdAt), margin, yPos);
    doc.text(`QUOTE: ${quote.quoteNumber}`, doc.internal.pageSize.width - margin, yPos, { align: 'right' });
    yPos += lineHeight * 2;

    // Optional: Customer Name as "CHIP HOST" equivalent
    if (quote.customer.name) {
      doc.text(`CUSTOMER: ${quote.customer.name.toUpperCase()}`, margin, yPos);
      yPos += lineHeight;
    }
    yPos += lineHeight;

    // Items Header
    drawDashedLine(doc, margin, yPos, doc.internal.pageSize.width - margin, yPos);
    yPos += lineHeight;

    doc.setFontSize(normalTextSize);
    doc.text('QTY', margin, yPos);
    doc.text('DESC', centerX - 10, yPos);
    doc.text('AMT', doc.internal.pageSize.width - margin, yPos, { align: 'right' });
    yPos += lineHeight;

    drawDashedLine(doc, margin, yPos, doc.internal.pageSize.width - margin, yPos);
    yPos += lineHeight;

    // Items List
    doc.setFontSize(normalTextSize);
    quote.items.forEach((item) => {
      const itemTotal = parseFloat(item.totalPrice.toFixed(2));
      doc.text(item.quantity.toString(), margin, yPos);
      doc.text(item.productName, centerX - 10, yPos);
      doc.text(itemTotal.toLocaleString('en-UG', { style: 'currency', currency: 'UGX' }).replace('UGX', '$'), doc.internal.pageSize.width - margin, yPos, { align: 'right' });
      yPos += lineHeight;
    });

    drawDashedLine(doc, margin, yPos, doc.internal.pageSize.width - margin, yPos);
    yPos += lineHeight;

    // Totals
    doc.setFontSize(largeTextSize);
    doc.text('TOTAL', margin, yPos);
    doc.text(quote.total.toLocaleString('en-UG', { style: 'currency', currency: 'UGX' }).replace('UGX', '$'), doc.internal.pageSize.width - margin, yPos, { align: 'right' });
    yPos += lineHeight * 2;

    doc.setFontSize(normalTextSize);
    doc.text('SUB-TOTAL', margin, yPos);
    doc.text(quote.subtotal.toLocaleString('en-UG', { style: 'currency', currency: 'UGX' }).replace('UGX', '$'), doc.internal.pageSize.width - margin, yPos, { align: 'right' });
    yPos += lineHeight;

    if (quote.includeVat) {
      doc.text('TAX', margin, yPos);
      doc.text(quote.vatAmount.toLocaleString('en-UG', { style: 'currency', currency: 'UGX' }).replace('UGX', '$'), doc.internal.pageSize.width - margin, yPos, { align: 'right' });
      yPos += lineHeight;
    }
    yPos += lineHeight; // Additional space

    // Notes and Terms
    if (quote.notes) {
      doc.setFontSize(normalTextSize);
      doc.text('NOTES:', margin, yPos);
      yPos += lineHeight;
      doc.setFontSize(smallTextSize);
      // Split notes into multiple lines if too long
      const notesLines = doc.splitTextToSize(quote.notes, doc.internal.pageSize.width - (2 * margin));
      notesLines.forEach((line: string) => {
        doc.text(line, margin, yPos);
        yPos += lineHeight;
      });
      yPos += lineHeight; // Add space after notes
    }

    // Terms & Conditions (default: Cash payment)
    const termsText = (quote.terms && quote.terms.trim()) || 'Cash payment';
    doc.setFontSize(normalTextSize);
    doc.text('TERMS & CONDITIONS:', margin, yPos);
    yPos += lineHeight;
    doc.setFontSize(smallTextSize);
    doc.text('Payment: Cash payment', margin, yPos);
    yPos += lineHeight;
    if (termsText.toLowerCase() !== 'cash payment') {
      const termsLines = doc.splitTextToSize(termsText, doc.internal.pageSize.width - (2 * margin));
      termsLines.forEach((line: string) => {
        doc.text(line, margin, yPos);
        yPos += lineHeight;
      });
    }
    // Extra bottom padding so content is not cut off when printing
    yPos += lineHeight * 4;
    doc.setFontSize(smallTextSize);
    doc.text('Thank you for your business!', centerX, yPos, { align: 'center' });
    yPos += lineHeight * 3;

    // Barcode Placeholder (simple rectangle)
    // doc.rect(margin, yPos, doc.internal.pageSize.width - (2 * margin), 15); // x, y, width, height
    // yPos += 20;


    doc.save(`quote-${quote.quoteNumber}.pdf`);
    toast.success('Quote PDF downloaded successfully with new design!');
  };

  const sizeOptions: SizeOption[] = [
    { value: 'XS', label: 'XS' },
    { value: 'S', label: 'S' },
    { value: 'M', label: 'M' },
    { value: 'L', label: 'L' },
    { value: 'XL', label: 'XL' },
    { value: 'XXL', label: 'XXL' },
    { value: 'One Size', label: 'One Size' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quotes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full min-w-0 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-1">
            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
            <h1 className="text-xl sm:text-3xl font-bold truncate">View Quotes</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage and view all your quotes
          </p>
        </div>
        <Button
          className="w-full sm:w-auto min-h-11 shrink-0"
          onClick={() => (window.location.href = "/pages/quotation/addquote")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Quote
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search quotes by number, customer, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 min-h-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48 shrink-0">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="min-h-10">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes list */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="h-5 w-5" />
            Quotes ({filteredQuotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {filteredQuotes.length === 0 ? (
            <div className="text-center py-10 sm:py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No quotes found</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Get started by creating your first quote"}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button
                  className="min-h-11"
                  onClick={() => (window.location.href = "/pages/quotation/addquote")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quote
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {filteredQuotes.map((quote, index) => {
                  const daysUntilExpiry = getDaysUntilExpiry(quote.createdAt, quote.validUntil);
                  return (
                    <div key={quote.id} className="border rounded-xl p-3 space-y-2 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">#{index + 1}</div>
                          <div className="font-semibold break-words">{quote.quoteNumber}</div>
                          <div className="text-sm font-medium break-words">{quote.customer.name}</div>
                          <div className="text-xs text-muted-foreground break-all">
                            {quote.customer.email}
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(quote.status)} shrink-0`}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(quote.status)}
                            {quote.status}
                          </span>
                        </Badge>
                      </div>
                      <div className="text-sm space-y-0.5">
                        <div className="font-medium">UGX {quote.total.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          Created {formatDate(quote.createdAt)}
                        </div>
                        <div
                          className={`flex items-center gap-1 text-xs ${
                            daysUntilExpiry < 0
                              ? "text-red-600"
                              : daysUntilExpiry < 3
                                ? "text-orange-600"
                                : "text-green-600"
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          {daysUntilExpiry < 0 ? "Expired" : `${daysUntilExpiry} days left`}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-10"
                          onClick={() => handleViewQuote(quote)}
                        >
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-10"
                          onClick={() => handleEditQuote(quote)}
                        >
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-10"
                          disabled={generatingId === quote.id}
                          onClick={() => handleGenerateInvoice(quote)}
                        >
                          <FilePlus2 className="h-4 w-4 mr-1" />
                          {generatingId === quote.id ? "…" : "Invoice"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-10"
                          onClick={() => handleDownloadQuote(quote)}
                        >
                          <Download className="h-4 w-4 mr-1" /> PDF
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto -mx-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-muted-foreground">#</TableHead>
                      <TableHead>Quote Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires In</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote, index) => {
                      const daysUntilExpiry = getDaysUntilExpiry(quote.createdAt, quote.validUntil);
                      return (
                        <TableRow key={quote.id}>
                          <TableCell className="text-muted-foreground tabular-nums">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{quote.customer.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {quote.customer.email}
                              </div>
                              {quote.customer.company && (
                                <div className="text-sm text-muted-foreground">
                                  {quote.customer.company}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">UGX {quote.total.toLocaleString()}</div>
                            {quote.includeVat && (
                              <div className="text-sm text-muted-foreground">(incl. VAT)</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(quote.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(quote.status)}
                                {quote.status}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(quote.createdAt)}</TableCell>
                          <TableCell>
                            <div
                              className={`flex items-center gap-1 ${
                                daysUntilExpiry < 0
                                  ? "text-red-600"
                                  : daysUntilExpiry < 3
                                    ? "text-orange-600"
                                    : "text-green-600"
                              }`}
                            >
                              <Clock className="h-4 w-4" />
                              {daysUntilExpiry < 0 ? "Expired" : `${daysUntilExpiry} days`}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-10 w-10 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleViewQuote(quote)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditQuote(quote)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Quote
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadQuote(quote)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={generatingId === quote.id}
                                  onClick={() => handleGenerateInvoice(quote)}
                                  
                                >
                                  <FilePlus2 className="h-4 w-4 mr-2" />
                                  {generatingId === quote.id ? "Generating…" : "Generate Invoice"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quote Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white w-[calc(100%-1.5rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quote Details - {selectedQuote?.quoteNumber}
            </DialogTitle>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="space-y-6">
              {/* Quote Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white"> {/* Set Quote Information Card to white */}
                  <CardHeader>
                    <CardTitle className="text-lg">Quote Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quote Number:</span>
                      <span className="font-medium">{selectedQuote.quoteNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={getStatusColor(selectedQuote.status)}>
                        {selectedQuote.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{formatDate(selectedQuote.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valid Until:</span>
                      <span>{selectedQuote.validUntil} days</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white"> {/* Set Customer Information Card to white */}
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{selectedQuote.customer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{selectedQuote.customer.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{selectedQuote.customer.phone}</span>
                    </div>
                    {selectedQuote.customer.company && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Company:</span>
                        <span>{selectedQuote.customer.company}</span>
                      </div>
                    )}
                    {selectedQuote.customer.address && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Address:</span>
                        <span>{selectedQuote.customer.address}</span>
                      </div>
                    )}
                    {selectedQuote.customer.customerCity && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">City:</span>
                        <span>{selectedQuote.customer.customerCity}</span>
                      </div>
                    )}
                    {selectedQuote.customer.customerDistrict && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">District:</span>
                        <span>{selectedQuote.customer.customerDistrict}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quote Items */}
              <Card className="bg-white"> {/* Set Quote Items Card to white */}
                <CardHeader>
                  <CardTitle className="text-lg">Quote Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedQuote.items.map((item, index) => (
                      <div key={item.id} className="border rounded-lg p-4 bg-white"> {/* Keep individual item background white if it's currently bg-gray-50 */}
                        <div className="flex items-start gap-2 mb-2"> { /* Adjusted this div for better alignment */}
                          <div className="flex-shrink-0 text-lg font-bold">
                            {index + 1}.
                          </div>
                          <div>
                            <h4 className="font-medium">{item.productName}</h4>
                            {item.size && (
                              <p className="text-sm text-muted-foreground">Size: {item.size}</p>
                            )}
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">UGX {item.totalPrice.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} × UGX {item.unitPrice.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quote Summary */}
              <Card className="bg-white"> {/* Set Quote Summary Card to white */}
                <CardHeader>
                  <CardTitle className="text-lg">Quote Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>UGX {selectedQuote.subtotal.toLocaleString()}</span>
                    </div>
                    {selectedQuote.includeVat && (
                      <div className="flex justify-between">
                        <span>VAT ({Math.round(selectedQuote.vatRate * 100)}%):</span>
                        <span>UGX {selectedQuote.vatAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>UGX {selectedQuote.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes and Terms */}
              {(selectedQuote.notes || selectedQuote.terms) && (
                <Card className="bg-white"> {/* Set Additional Information Card to white */}
                  <CardHeader>
                    <CardTitle className="text-lg">Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedQuote.notes && (
                      <div>
                        <h4 className="font-medium mb-2">Notes:</h4>
                        <p className="text-sm text-muted-foreground">{selectedQuote.notes}</p>
                      </div>
                    )}
                    {selectedQuote.terms && (
                      <div>
                        <h4 className="font-medium mb-2">Terms & Conditions:</h4>
                        <p className="text-sm text-muted-foreground">{selectedQuote.terms}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Quote Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white w-[calc(100%-1.5rem)]"> {/* Added bg-white here */}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Quote - {editableQuote?.quoteNumber}
            </DialogTitle>
          </DialogHeader>
          
          {editableQuote && (
            <div className="space-y-6 bg-white p-6 rounded-lg shadow-lg">
              {/* Customer Information */}
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="customerName" className="text-sm font-medium">Name</label>
                      <Input
                        id="customerName"
                        name="customer.name"
                        value={editableQuote.customer.name}
                        onChange={handleEditInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="customerEmail" className="text-sm font-medium">Email</label>
                      <Input
                        id="customerEmail"
                        name="customer.email"
                        type="email"
                        value={editableQuote.customer.email}
                        onChange={handleEditInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="customerPhone" className="text-sm font-medium">Phone</label>
                      <Input
                        id="customerPhone"
                        name="customer.phone"
                        type="tel"
                        value={editableQuote.customer.phone}
                        onChange={handleEditInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="customerCompany" className="text-sm font-medium">Company</label>
                      <Input
                        id="customerCompany"
                        name="customer.company"
                        value={editableQuote.customer.company || ''}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="customerAddress" className="text-sm font-medium">Address</label>
                    <Input
                      id="customerAddress"
                      name="customer.address"
                      value={editableQuote.customer.address || ''}
                      onChange={handleEditInputChange}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="customerShippingCity" className="text-sm font-medium">City / Town</label>
                      <Input
                        id="customerShippingCity"
                        name="customer.customerCity" // Changed
                        value={editableQuote.customer.customerCity || ''} // Changed
                        onChange={handleEditInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="customerShippingDistrict" className="text-sm font-medium">District</label>
                      <Input
                        id="customerShippingDistrict"
                        name="customer.customerDistrict" // Changed
                        value={editableQuote.customer.customerDistrict || ''} // Changed
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quote Items */}
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg">Quote Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {editableQuote.items.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-1 md:grid-cols-8 gap-4 items-end border rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-center">
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 font-medium">
                            {index + 1}
                          </div>
                        </div>
                        <div className="space-y-2 col-span-2">
                          <label htmlFor={`editItemName-${item.id}`} className="font-medium text-sm block">Product</label>
                          <Input
                            id={`editItemName-${item.id}`}
                            name="productName"
                            value={item.productName}
                            onChange={(e) => handleEditItemChange(item.id, 'productName', e.target.value)}
                            className="w-full form-input text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor={`editItemSize-${item.id}`} className="font-medium text-sm block">Size</label>
                          <Select
                            value={item.size}
                            onValueChange={(value) => handleEditItemChange(item.id, 'size', value)}
                          >
                            <SelectTrigger id={`editItemSize-${item.id}`} className="w-full text-sm">
                              <SelectValue placeholder="Select Size" />
                            </SelectTrigger>
                            <SelectContent>
                              {(item.availableSizes && item.availableSizes.length > 0 ? item.availableSizes : sizeOptions).map((size) => (
                                <SelectItem key={size.value} value={size.value}>
                                  {size.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor={`editItemPurchasePrice-${item.id}`} className="font-medium text-sm block">Cost (UGX)</label>
                          <Input
                            id={`editItemPurchasePrice-${item.id}`}
                            type="number"
                            value={item.purchasePrice}
                            readOnly
                            className="w-full form-input text-sm bg-gray-50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor={`editItemSellingPrice-${item.id}`} className="font-medium text-sm block">Price (UGX)</label>
                          <Input
                            id={`editItemSellingPrice-${item.id}`}
                            type="number"
                            value={item.sellingPrice}
                            onChange={(e) => handleEditItemChange(item.id, 'sellingPrice', e.target.value)}
                            className="w-full form-input text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor={`editItemQuantity-${item.id}`} className="font-medium text-sm block">Qty</label>
                          <Input
                            id={`editItemQuantity-${item.id}`}
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleEditItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full form-input text-sm"
                            min="1"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="font-medium text-sm block">Total (UGX)</label>
                          <div className="p-2 bg-gray-50 rounded border text-sm font-medium h-10 flex items-center">
                            UGX {item.totalPrice.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-end h-10">
                          {editableQuote.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setEditableQuote(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== item.id) } : null)}
                              className="text-red-500 hover:text-red-700"
                              title="Remove item"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quote Summary */}
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg">Quote Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>UGX {editableQuote.subtotal.toLocaleString()}</span>
                    </div>
                    {editableQuote.includeVat && (
                      <div className="flex justify-between">
                        <span>VAT ({Math.round(editableQuote.vatRate * 100)}%):</span>
                        <span>UGX {editableQuote.vatAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>UGX {editableQuote.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quote Settings */}
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg">Quote Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="editStatus" className="text-sm font-medium">Quote Status</label>
                    <Select
                      value={editableQuote.status}
                      onValueChange={(value) => handleEditInputChange({ target: { name: 'status', value } } as React.ChangeEvent<HTMLSelectElement>)}
                    >
                      <SelectTrigger id="editStatus" className="w-full text-sm">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Sent">Sent</SelectItem>
                        <SelectItem value="Accepted">Accepted</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                        <SelectItem value="Expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="validUntil" className="text-sm font-medium">Valid Until (Days)</label>
                    <Input
                      id="validUntil"
                      name="validUntil"
                      type="number"
                      value={editableQuote.validUntil}
                      onChange={handleEditInputChange}
                      min="1"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeVatEdit"
                      checked={editableQuote.includeVat}
                      onCheckedChange={(checked) => setEditableQuote(prev => prev ? { ...prev, includeVat: checked as boolean } : null)}
                    />
                    <label htmlFor="includeVatEdit" className="text-sm font-medium">Include VAT</label>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="notes" className="text-sm font-medium">Notes</label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={editableQuote.notes || ''}
                      onChange={handleEditInputChange}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="terms" className="text-sm font-medium">Terms & Conditions</label>
                    <Textarea
                      id="terms"
                      name="terms"
                      value={editableQuote.terms || ''}
                      onChange={handleEditInputChange}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViewQuotes;
