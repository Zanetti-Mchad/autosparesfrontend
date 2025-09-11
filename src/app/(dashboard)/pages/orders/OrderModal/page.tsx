"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, User, MapPin, Package, CreditCard, Info, Calendar, Phone, Mail, Home, MapPin as MapPinIcon, Printer } from 'lucide-react';

interface OrderItem {
  id: string;
  product: string;
  size: string;
  quantity: number;
  price: string;
  total: string;
  [key: string]: string | number; // Index signature for dynamic property access
}

type PaymentStatus = 'Paid' | 'Pending' | 'Failed' | 'Refunded';
type PaymentMethod = 'Mobile Money' | 'Credit Card' | 'Bank Transfer' | 'Cash on Delivery';
type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

interface Order {
  id: string;
  orderNumber?: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  shippingCity: string;
  shippingDistrict: string;
  items: OrderItem[];
  subtotal: string;
  vat: string;
  total: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  date: string;
  notes?: string;
  [key: string]: any; // Index signature for dynamic property access
}

interface OrderModalProps {
  order: Order | null;
  mode: 'view' | 'edit';
  onClose: () => void;
  onSave: (order: Order) => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({ order, mode, onClose, onSave }) => {
  const [editedOrder, setEditedOrder] = useState<Order | null>(order);
  const printRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Note: We render an error state later if order is null to preserve hook order
  
  // Set isClient to true after component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setEditedOrder(order);
  }, [order]);

  // Format time helper function
  const formatTime = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  }, []);

  // Format date helper function
  const formatDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }, []);

  // Receipt print function with compact layout
  const handlePrint = useCallback(() => {
    if (!isClient || !order) {
      console.error('Printing is only available on the client side with valid order data');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Failed to open print window. Please check your popup blocker settings.');
      return;
    }
    
    try {
      // Generate print content with proper error handling
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Order Receipt #${order.orderNumber || order.id}</title>
          <meta charset="UTF-8">
          <style>
            @page { size: auto; margin: 0mm; }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 15px; 
              font-size: 14px;
              line-height: 1.4;
              color: #000;
              background: #fff;
            }
            .receipt-header { text-align: center; margin-bottom: 20px; }
            .receipt-header h1 { margin: 0; font-size: 18px; font-weight: bold; }
            .receipt-header p { margin: 5px 0; }
            .receipt-details { margin-bottom: 20px; }
            .receipt-details p { margin: 3px 0; }
            .receipt-items { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .receipt-items th { text-align: left; border-bottom: 1px solid #000; padding: 5px 0; }
            .receipt-items td { padding: 5px 0; border-bottom: 1px solid #eee; }
            .receipt-totals { margin-top: 15px; text-align: right; }
            .receipt-totals p { margin: 5px 0; }
            .receipt-footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            @media print {
              .no-print { display: none !important; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="receipt-header">
              <h1>ORDER RECEIPT</h1>
              <p>Order #${order.orderNumber || order.id}</p>
              <p>${formatDate(order.date)}</p>
            </div>
            
            <div class="receipt-details">
              <p><strong>Customer:</strong> ${order.customer}</p>
              <p><strong>Email:</strong> ${order.email}</p>
              <p><strong>Phone:</strong> ${order.phone}</p>
              <p><strong>Address:</strong> ${order.address}, ${order.shippingCity}, ${order.shippingDistrict}</p>
              <p><strong>Status:</strong> ${order.status} | <strong>Payment:</strong> ${order.paymentStatus || 'N/A'}</p>
            </div>
            
            <table class="receipt-items">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>${item.product} (${item.size})</td>
                    <td>${item.quantity}</td>
                    <td>${Number(item.price).toFixed(2)}</td>
                    <td>${Number(item.total).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="receipt-totals">
              <p><strong>Subtotal:</strong> ${Number(order.subtotal).toFixed(2)}</p>
              <p><strong>VAT (18%):</strong> ${Number(order.vat).toFixed(2)}</p>
              <p><strong>Total:</strong> ${Number(order.total).toFixed(2)}</p>
            </div>
            
            ${order.notes ? `
              <div class="receipt-notes">
                <p><strong>Notes:</strong></p>
                <p>${order.notes}</p>
              </div>
            ` : ''}
            
            <div class="receipt-footer">
              <p>Thank you for your business!</p>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="no-print" style="margin-top: 20px; text-align: center;">
              <button onclick="window.print()" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Print Receipt
              </button>
              <button onclick="window.close()" style="margin-left: 10px; padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Close
              </button>
            </div>
          </div>
          
          <script>
            // Auto-print when the window loads
            window.onload = function() {
              setTimeout(function() {
                window.print();
                // Close the window after printing (with a delay to ensure printing starts)
                setTimeout(function() {
                  window.close();
                }, 1000);
              }, 500);
            };
            
            // Handle the case where print is canceled
            window.onafterprint = function() {
              window.close();
            };
          </script>
        </body>
        </html>
      `;
      
      // Write the content to the print window
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
      
    } catch (error) {
      console.error('Error generating print content:', error);
      printWindow.close();
      
      // Show error message to user
      alert('Failed to generate receipt. Please try again.');
    }
  }, [isClient, order, formatDate]);

  if (!editedOrder) {
    // Show loading state while order data is being processed
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setEditedOrder(prev => {
      if (!prev) return null;
      
      // Handle nested fields (e.g., customer, shipping info)
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        return {
          ...prev,
          [parent]: {
            ...(prev[parent as keyof Order] as object || {}),
            [child]: type === 'number' ? parseFloat(value) || 0 : value
          }
        };
      }
      
      // Handle array items (e.g., order items)
      if (name.startsWith('items[')) {
        const match = name.match(/items\[(\d+)\]\.(\w+)/);
        if (match) {
          const [_, index, field] = match;
          const updatedItems = [...prev.items];
          updatedItems[parseInt(index)] = {
            ...updatedItems[parseInt(index)],
            [field]: type === 'number' ? parseFloat(value) || 0 : value
          };
          return { ...prev, items: updatedItems };
        }
      }
      
      // Handle direct fields
      return {
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : value
      };
    });
  };

  const handleSave = () => {
    if (!editedOrder) {
      console.error('No order data to save');
      return;
    }

    try {
      // Create a sanitized order object with all required fields
      const orderToSave: Order = {
        id: editedOrder.id,
        orderNumber: editedOrder.orderNumber,
        customer: editedOrder.customer || '',
        email: editedOrder.email || '',
        phone: editedOrder.phone || '',
        address: editedOrder.address || '',
        shippingCity: editedOrder.shippingCity || '',
        shippingDistrict: editedOrder.shippingDistrict || '',
        items: (editedOrder.items || []).map(item => ({
          id: item.id,
          product: item.product || '',
          size: item.size || 'Standard',
          quantity: Number(item.quantity) || 1,
          price: item.price || '0',
          total: item.total || '0'
        })),
        subtotal: editedOrder.subtotal || '0',
        vat: editedOrder.vat || '0',
        total: editedOrder.total || '0',
        status: (editedOrder.status as OrderStatus) || 'Pending',
        paymentStatus: editedOrder.paymentStatus as PaymentStatus | undefined,
        paymentMethod: editedOrder.paymentMethod as PaymentMethod | undefined,
        date: editedOrder.date || new Date().toISOString(),
        notes: editedOrder.notes,
      };

      onSave(orderToSave);
      onClose();
    } catch (error) {
      console.error('Error saving order:', error);
      // You might want to show an error message to the user here
    }
  };

  const isEditMode = mode === 'edit';

  // (formatDate is defined above)

  // Use the edited order if available, otherwise fall back to the original order
  const current = editedOrder || order;
  if (!current) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-2xl shadow-2xl p-6 max-w-md w-full">
          <p>Unable to load order data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-fast">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div>
            <h2 className="text-2xl font-bold text-gradient from-orange-500 to-yellow-500">
              {isEditMode ? `Edit Order #${current.orderNumber || current.id}` : `Order #${current.orderNumber || current.id}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {formatDate(current.date)} • {current.status}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
              title="Print Order"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {/* Print Header - Only visible when printing */}
          <div className="hidden print:block mb-8">
            <div className="flex justify-between items-center border-b-2 border-gray-200 pb-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">INVOICE</h1>
                <p className="text-gray-600">Order #{current.orderNumber || current.id}</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-semibold">ShopDash</h2>
                <p className="text-sm text-gray-600">Kampala, Uganda</p>
                <p className="text-sm text-gray-600">+256 700 000000</p>
              </div>
            </div>
            <div className="flex justify-between mb-6">
              <div>
                <h3 className="font-semibold text-gray-700">Bill To:</h3>
                <p className="font-medium">{current.customer}</p>
                <p className="text-sm text-gray-600">{current.address}</p>
                <p className="text-sm text-gray-600">{current.shippingCity}, {current.shippingDistrict}</p>
                <p className="text-sm text-gray-600">{current.phone}</p>
                <p className="text-sm text-gray-600">{current.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm"><span className="font-medium">Order Date:</span> {formatDate(current.date)}</p>
                <p className="text-sm"><span className="font-medium">Status:</span> {current.status}</p>
                {current.paymentStatus && (
                  <p className="text-sm">
                    <span className="font-medium">Payment:</span> {current.paymentStatus}
                    {current.paymentMethod && ` (${current.paymentMethod})`}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-secondary/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    {isEditMode ? (
                      <input
                        type="text"
                        name="customer"
                        value={editedOrder.customer}
                        onChange={handleChange}
                        className="w-full mt-1 form-input"
                      />
                    ) : (
                      <p className="mt-1">{current.customer}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="mt-1">{current.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="mt-1">{current.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    {isEditMode ? (
                      <select
                        name="status"
                        value={editedOrder.status}
                        onChange={handleChange}
                        className="w-full mt-1 form-select"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    ) : (
                      <p className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          current.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                          current.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                          current.status === 'Shipped' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {current.status}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping Information */}
              <div className="bg-secondary/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Shipping Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="mt-1">{current.address || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">City</label>
                    <p className="mt-1">{current.shippingCity || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">District</label>
                    <p className="mt-1">{current.shippingDistrict || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-secondary/50 p-4 border-b">
                  <h3 className="font-semibold">Order Items</h3>
                </div>
                <div className="divide-y">
                  {current.items.map((item, index) => (
                    <div key={item.id} className="p-4 flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-secondary/50 rounded-md flex items-center justify-center text-muted-foreground">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{item.product}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} × {item.price} • {item.size}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{item.total}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-secondary/30 p-4 border-t">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">{current.subtotal}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">VAT (18%):</span>
                    <span className="font-medium">{current.vat}</span>
                  </div>
                  <div className="flex justify-between py-1 text-lg font-bold mt-2 pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-primary">{current.total}</span>
                  </div>
                </div>
              </div>

              {/* Order Notes */}
              {current.notes && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">Order Notes</h3>
                  <p className="text-blue-700">{current.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-border/50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              Close
            </button>
            {isEditMode && (
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const OrderModalPage: React.FC = () => {
  return (
    <OrderModal
      order={null}
      mode="view"
      onClose={() => {}}
      onSave={() => {}}
    />
  );
};

export default OrderModalPage;