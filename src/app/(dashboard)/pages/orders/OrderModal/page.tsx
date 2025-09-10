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
}

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
  status: string;
  paymentStatus?: 'Paid' | 'Pending' | 'Failed' | 'Refunded';
  paymentMethod?: 'Mobile Money' | 'Credit Card' | 'Bank Transfer' | 'Cash on Delivery';
  date: string;
  notes?: string;
}

interface OrderModalProps {
  order: Order | null;
  mode: 'view' | 'edit';
  onClose: () => void;
  onSave: (order: Order) => void;
}

const OrderModal: React.FC<OrderModalProps> = ({ order, mode, onClose, onSave }) => {
  const [editedOrder, setEditedOrder] = useState<Order | null>(order);
  const printRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Set isClient to true after component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setEditedOrder(order);
  }, [order]);

  // Receipt print function with compact layout
  const handlePrint = useCallback(() => {
    if (!order) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      };

      const formatDateShort = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric'
        };
        return new Date(dateString).toLocaleDateString('en-US', options);
      };

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt #${order.orderNumber || order.id}</title>
          <meta charset="UTF-8">
          <style>
            @page { 
              size: 80mm 297mm;  /* Standard receipt width with auto height */
              margin: 0;
              padding: 0;
            }
            body { 
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.2;
              color: #000;
              padding: 10px;
              margin: 0;
              width: 80mm;
              max-width: 80mm;
              word-wrap: break-word;
            }
            .header {
              text-align: center;
              margin-bottom: 5px;
              padding-bottom: 5px;
              border-bottom: 1px dashed #000;
            }
            .header h1 {
              font-size: 16px;
              margin: 5px 0;
              font-weight: bold;
              text-transform: uppercase;
            }
            .header p {
              margin: 2px 0;
              font-size: 10px;
            }
            .receipt-info {
              text-align: center;
              margin: 5px 0;
              font-size: 10px;
            }
            .customer-info {
              margin: 5px 0;
              padding: 5px 0;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              font-size: 10px;
            }
            .items {
              width: 100%;
              border-collapse: collapse;
              margin: 5px 0;
            }
            .items th {
              text-align: left;
              border-bottom: 1px dashed #000;
              padding: 3px 0;
              font-size: 10px;
            }
            .items td {
              padding: 3px 0;
              vertical-align: top;
              font-size: 10px;
            }
            .items .name {
              width: 60%;
            }
            .items .qty {
              width: 10%;
              text-align: center;
            }
            .items .price {
              width: 30%;
              text-align: right;
            }
            .total-section {
              margin-top: 5px;
              border-top: 1px dashed #000;
              padding-top: 5px;
              text-align: right;
              font-weight: bold;
            }
            .footer {
              margin-top: 10px;
              text-align: center;
              font-size: 9px;
              border-top: 1px dashed #000;
              padding-top: 5px;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 5px 0;
            }
            .text-center {
              text-align: center;
            }
            .text-right {
              text-align: right;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SHOPDASH</h1>
            <p>Kampala, Uganda | +256 700 000000</p>
            <p>shopdash.ug | support@shopdash.ug</p>
          </div>
          
          <div class="receipt-info">
            <div>ORDER #${order.orderNumber || order.id}</div>
            <div>${formatDateShort(order.date)} ${formatTime(order.date)}</div>
            <div>${order.status} • ${order.paymentStatus || 'Payment Pending'}</div>
            ${order.paymentMethod ? `<div>${order.paymentMethod}</div>` : ''}
          </div>
          
          <div class="customer-info">
            <div><strong>${order.customer}</strong></div>
            <div>${order.phone || ''}</div>
            <div>${order.address || ''}</div>
            <div>${order.shippingCity}${order.shippingDistrict ? ', ' + order.shippingDistrict : ''}</div>
          </div>
          
          <table class="items">
            <thead>
              <tr>
                <th class="name">ITEM</th>
                <th class="qty">QTY</th>
                <th class="price">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td class="name">${item.product}<br><small>${item.size}</small></td>
                  <td class="qty">${item.quantity}</td>
                  <td class="price">${item.total}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <div class="total-section">
            <div>Subtotal: ${order.subtotal}</div>
            <div>VAT (18%): ${order.vat}</div>
            <div style="font-size: 14px; margin-top: 3px;">TOTAL: ${order.total}</div>
          </div>
          
          ${order.notes ? `
            <div class="divider"></div>
            <div style="font-size: 10px; margin: 5px 0;">
              <strong>NOTES:</strong> ${order.notes}
            </div>
          ` : ''}
          
          <div class="footer">
            <div>Thank you for shopping with us!</div>
            <div>For inquiries: +256 700 000000</div>
            <div>This is a computer-generated receipt</div>
            <div style="margin-top: 5px;">${new Date().toLocaleString()}</div>
          </div>
          
          <script>
            // Auto-print when the print window loads
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              }, 300);
            };
          </script>
        </body>
        </html>
      `;
      
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  }, [order]);

  if (!editedOrder) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Handle nested fields (e.g., customer, shipping info)
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setEditedOrder(prev => {
        if (!prev) return null;
        return {
          ...prev,
          [parent]: {
            ...(prev[parent as keyof Order] as object || {}),
            [child]: value
          }
        };
      });
    } 
    // Handle array items (e.g., order items)
    else if (name.startsWith('items[')) {
      const match = name.match(/items\[(\d+)\]\.(\w+)/);
      if (match) {
        const [_, index, field] = match;
        setEditedOrder(prev => {
          if (!prev) return null;
          const updatedItems = [...prev.items];
          updatedItems[parseInt(index)] = {
            ...updatedItems[parseInt(index)],
            [field]: type === 'number' ? parseFloat(value) || 0 : value
          };
          return { ...prev, items: updatedItems };
        });
      }
    }
    // Handle direct fields
    else {
      setEditedOrder(prev => prev ? { 
        ...prev, 
        [name]: type === 'number' ? parseFloat(value) || 0 : value 
      } : null);
    }
  };

  const handleSave = () => {
    if (editedOrder) {
      // Ensure we're only sending the fields that the parent component expects
      const orderToSave: Order = {
        ...editedOrder,
        // Make sure all required fields are included
        email: editedOrder.email || '',
        phone: editedOrder.phone || '',
        address: editedOrder.address || '',
        shippingCity: editedOrder.shippingCity || '',
        shippingDistrict: editedOrder.shippingDistrict || '',
        items: editedOrder.items || [],
        subtotal: editedOrder.subtotal || '0',
        vat: editedOrder.vat || '0',
        total: editedOrder.total || '0',
        date: editedOrder.date || new Date().toISOString(),
        status: editedOrder.status || 'Pending'
      };
      onSave(orderToSave);
      onClose();
    }
  };

  const isEditMode = mode === 'edit';

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const current = editedOrder || order;
  if (!current) return null;

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
                        <option value="Completed">Completed</option>
                      </select>
                    ) : (
                      <p className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          current.status === 'Completed' ? 'bg-green-100 text-green-800' :
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

export default OrderModal;