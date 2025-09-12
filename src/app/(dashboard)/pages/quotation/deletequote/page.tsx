'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Trash2, 
  FileText, 
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Eye,
  AlertTriangle,
  Shield
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
import { Checkbox } from '@/components/ui/checkbox';

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

const DeleteQuotes = () => {
  // State
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

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
            }
          ],
          subtotal: 100000,
          vatAmount: 18000,
          total: 118000,
          includeVat: true,
          vatRate: 0.18,
          validUntil: 30,
          notes: 'Urgent delivery required',
          terms: 'Payment terms: 50% advance, 50% on delivery',
          status: 'Draft',
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
              id: '2',
              productId: 'prod2',
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
          status: 'Expired',
          createdAt: '2024-11-15T14:30:00Z',
          updatedAt: '2024-11-15T14:30:00Z'
        },
        {
          id: '3',
          quoteNumber: 'QUO/241201/003',
          customer: {
            name: 'Mike Johnson',
            email: 'mike@example.com',
            phone: '256700000003',
            company: 'Auto Care Ltd',
            address: 'Ntinda Road',
            city: 'Kampala',
            district: 'Central'
          },
          items: [
            {
              id: '3',
              productId: 'prod3',
              productName: 'Air Filter',
              size: 'Medium',
              quantity: 2,
              unitPrice: 30000,
              totalPrice: 60000,
              description: 'High performance air filter'
            }
          ],
          subtotal: 60000,
          vatAmount: 10800,
          total: 70800,
          includeVat: true,
          vatRate: 0.18,
          validUntil: 7,
          notes: 'Customer requested urgent quote',
          terms: 'Payment within 7 days',
          status: 'Sent',
          createdAt: '2024-11-25T09:15:00Z',
          updatedAt: '2024-11-25T09:15:00Z'
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

  // Handle quote selection
  const handleQuoteSelect = (quoteId: string, checked: boolean) => {
    if (checked) {
      setSelectedQuotes(prev => [...prev, quoteId]);
    } else {
      setSelectedQuotes(prev => prev.filter(id => id !== quoteId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuotes(filteredQuotes.map(quote => quote.id));
    } else {
      setSelectedQuotes([]);
    }
  };

  // Handle view quote
  const handleViewQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsViewModalOpen(true);
  };

  // Handle delete quotes
  const handleDeleteQuotes = () => {
    if (selectedQuotes.length === 0) {
      toast.error('Please select quotes to delete');
      return;
    }
    setIsDeleteModalOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type "DELETE" to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      // In a real implementation, you would call the API for each quote
      // await Promise.all(selectedQuotes.map(id => fetchApi(`/quotes/${id}`, { method: 'DELETE' })));
      
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setQuotes(quotes.filter(quote => !selectedQuotes.includes(quote.id)));
      setSelectedQuotes([]);
      setDeleteConfirmation('');
      setIsDeleteModalOpen(false);
      
      toast.success(`Successfully deleted ${selectedQuotes.length} quote(s)`);
    } catch (error) {
      console.error('Error deleting quotes:', error);
      toast.error('Failed to delete quotes. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Get selected quotes for display
  const getSelectedQuotes = () => {
    return quotes.filter(quote => selectedQuotes.includes(quote.id));
  };

  // Check if quote can be deleted
  const canDeleteQuote = (quote: Quote) => {
    // Only allow deletion of Draft or Expired quotes
    return quote.status === 'Draft' || quote.status === 'Expired';
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
        <div className="flex items-center gap-3 mb-2">
          <Trash2 className="h-8 w-8 text-red-500" />
          <h1 className="text-3xl font-bold">Delete Quotes</h1>
        </div>
        <p className="text-muted-foreground">
          Select and delete quotes. Only Draft and Expired quotes can be deleted.
        </p>
      </div>

      {/* Warning Alert */}
      <Alert className="mb-6 border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Warning:</strong> This action cannot be undone. Only Draft and Expired quotes can be deleted. 
          Sent, Accepted, and Rejected quotes are protected from deletion.
        </AlertDescription>
      </Alert>

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

      {/* Selection Actions */}
      {selectedQuotes.length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-800">
                  {selectedQuotes.length} quote(s) selected for deletion
                </span>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleDeleteQuotes}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No quotes available for deletion'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedQuotes.length === filteredQuotes.length && filteredQuotes.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
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
                    const canDelete = canDeleteQuote(quote);
                    const isSelected = selectedQuotes.includes(quote.id);
                    
                    return (
                      <TableRow 
                        key={quote.id} 
                        className={!canDelete ? 'opacity-50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleQuoteSelect(quote.id, checked as boolean)}
                            disabled={!canDelete}
                          />
                        </TableCell>
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
                          {!canDelete && (
                            <div className="text-xs text-red-600 mt-1">
                              Protected
                            </div>
                          )}
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
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  if (canDelete) {
                                    setSelectedQuotes([quote.id]);
                                    handleDeleteQuotes();
                                  }
                                }}
                                disabled={!canDelete}
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Quote Deletion
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. You are about to delete {selectedQuotes.length} quote(s).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Warning:</strong> This will permanently delete the selected quotes and all associated data.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">Quotes to be deleted:</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {getSelectedQuotes().map(quote => (
                  <div key={quote.id} className="text-sm text-muted-foreground">
                    • {quote.quoteNumber} - {quote.customer.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type &quot;DELETE&quot; to confirm:
              </label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="border-red-200 focus:border-red-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteConfirmation('');
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteConfirmation !== 'DELETE' || isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedQuotes.length} Quote(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeleteQuotes;
