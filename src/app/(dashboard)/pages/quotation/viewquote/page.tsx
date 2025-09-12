'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Plus
} from 'lucide-react';
import { fetchApi } from '@/lib/apiConfig';
import { toast } from 'sonner';
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

// Types
interface QuoteItem {
  id: string;
  productId: string;
  productName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description?: string;
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
    city?: string;
    district?: string;
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

const ViewQuotes = () => {
  // State
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Fetch quotes
  const fetchQuotes = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Mock data for now - replace with actual API call
      const mockQuotes: Quote[] = [
        {
          id: '1',
          quoteNumber: 'QUO/241201/001',
          customer: {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '256700000001',
            company: 'ABC Motors',
            address: 'Kampala Road',
            city: 'Kampala',
            district: 'Central'
          },
          items: [
            {
              id: '1',
              productId: 'prod1',
              productName: 'Brake Pads',
              size: 'Standard',
              quantity: 2,
              unitPrice: 50000,
              totalPrice: 100000,
              description: 'High quality brake pads'
            },
            {
              id: '2',
              productId: 'prod2',
              productName: 'Oil Filter',
              size: 'Large',
              quantity: 1,
              unitPrice: 25000,
              totalPrice: 25000,
              description: 'Premium oil filter'
            }
          ],
          subtotal: 125000,
          vatAmount: 22500,
          total: 147500,
          includeVat: true,
          vatRate: 0.18,
          validUntil: 30,
          notes: 'Urgent delivery required',
          terms: 'Payment terms: 50% advance, 50% on delivery',
          status: 'Sent',
          createdAt: '2024-12-01T10:00:00Z',
          updatedAt: '2024-12-01T10:00:00Z'
        },
        {
          id: '2',
          quoteNumber: 'QUO/241201/002',
          customer: {
            name: 'Jane Smith',
            email: 'jane@example.com',
            phone: '256700000002',
            company: 'XYZ Garage',
            address: 'Entebbe Road',
            city: 'Kampala',
            district: 'Central'
          },
          items: [
            {
              id: '3',
              productId: 'prod3',
              productName: 'Spark Plugs',
              size: 'Standard',
              quantity: 4,
              unitPrice: 15000,
              totalPrice: 60000,
              description: 'Iridium spark plugs'
            }
          ],
          subtotal: 60000,
          vatAmount: 0,
          total: 60000,
          includeVat: false,
          vatRate: 0,
          validUntil: 15,
          notes: '',
          terms: 'Payment on delivery',
          status: 'Draft',
          createdAt: '2024-12-01T14:30:00Z',
          updatedAt: '2024-12-01T14:30:00Z'
        }
      ];

      setQuotes(mockQuotes);
      setFilteredQuotes(mockQuotes);

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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    toast.info('Edit functionality coming soon');
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (confirm('Are you sure you want to delete this quote?')) {
      try {
        setQuotes(quotes.filter(quote => quote.id !== quoteId));
        toast.success('Quote deleted successfully');
      } catch (error) {
        console.error('Error deleting quote:', error);
        toast.error('Failed to delete quote');
      }
    }
  };

  const handleDuplicateQuote = (quote: Quote) => {
    toast.info('Duplicate functionality coming soon');
  };

  const handleDownloadQuote = (quote: Quote) => {
    toast.info('Download functionality coming soon');
  };

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
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">View Quotes</h1>
            </div>
            <p className="text-muted-foreground">
              Manage and view all your quotes
            </p>
          </div>
          <Button onClick={() => window.location.href = '/dashboard/pages/quotation/addquote/view'}>
            <Plus className="h-4 w-4 mr-2" />
            Create Quote
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search quotes by number, customer, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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

      {/* Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Quotes ({filteredQuotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredQuotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No quotes found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Get started by creating your first quote'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => window.location.href = '/dashboard/pages/quotation/addquote/view'}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quote
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
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
                  {filteredQuotes.map((quote) => {
                    const daysUntilExpiry = getDaysUntilExpiry(quote.createdAt, quote.validUntil);
                    return (
                      <TableRow key={quote.id}>
                        <TableCell className="font-medium">
                          {quote.quoteNumber}
                        </TableCell>
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
                          <div className="font-medium">
                            UGX {quote.total.toLocaleString()}
                          </div>
                          {quote.includeVat && (
                            <div className="text-sm text-muted-foreground">
                              (incl. VAT)
                            </div>
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
                        <TableCell>
                          {formatDate(quote.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 ${
                            daysUntilExpiry < 0 ? 'text-red-600' :
                            daysUntilExpiry < 3 ? 'text-orange-600' :
                            'text-green-600'
                          }`}>
                            <Clock className="h-4 w-4" />
                            {daysUntilExpiry < 0 ? 'Expired' : `${daysUntilExpiry} days`}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
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
                              <DropdownMenuItem onClick={() => handleDuplicateQuote(quote)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadQuote(quote)}>
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteQuote(quote.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
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
          )}
        </CardContent>
      </Card>

      {/* Quote Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                <Card>
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

                <Card>
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
                  </CardContent>
                </Card>
              </div>

              {/* Quote Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quote Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedQuote.items.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
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
              <Card>
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
                <Card>
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
    </div>
  );
};

export default ViewQuotes;
