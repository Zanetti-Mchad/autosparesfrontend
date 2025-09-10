'use client';
import { useState, useEffect } from 'react';
import DialogBox from '@/components/Dailogbox';
import { env } from '@/env';

// Base URL for API
const API_BASE_URL = env.BACKEND_API_URL;
// const API_PATH = `${API_BASE_URL}/api/v1/uniforms`; // Not directly used, but good to have defined

declare global {
  interface Window {
    XLSX: any;
    originalCheckoutItems?: UniformEntryItem[]; // For storing items during edit
  }
}

// Represents an item within a checkout (UniformCheckoutItem)
interface UniformEntryItem {
  id: string; // UniformCheckoutItem ID
  checkoutId: string;
  inventoryId: string; // UniformInventory ID
  quantity: number;
  isTaken: boolean;
  createdAt: string;
  updatedAt?: string; // Optional
  inventory?: { // Nested data from backend include
    id: string; // UniformInventory ID (same as inventoryId above)
    uniformItemId: string;
    sizeId: string;
    codeId?: string;
    uniformItem: {
      id: string;
      name: string; // e.g., "Shirt (SH01)"
      categoryId: string;
      category: { // Nested category info
        id: string;
        name: string; // e.g., "Shirt"
      };
    };
    size: {
      id: string;
      size: string; // e.g., "M"
    };
    code?: {
      id: string;
      code: string;
    };
  };
}

// Represents a main checkout record (UniformCheckout)
interface UniformEntry {
  id: string;
  personName: string;
  studentClass: string;
  takenBy: string;
  dateIssued: string; // Should be ISO string or Date object
  totalItems: number; // The target total number of items this checkout is for
  itemsNotTaken: number; // Aggregate count of items marked as not taken
  receiptPath: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  studentId: string | null;
  items?: UniformEntryItem[]; // Array of items associated with this checkout
}

// Represents an item from the /uniforms/inventory endpoint
interface InventoryItem {
  id: string; // UniformInventory ID
  uniformItemId: string;
  sizeId: string;
  codeId?: string;
  totalQuantity: number;
  availableQuantity: number;
  uniformItem: {
    id: string;
    name: string;
    categoryId: string;
    category: {
      id: string;
      name: string;
    };
  };
  size: {
    id: string;
    size: string; // e.g., "M"
  };
  code?: {
    id: string;
    code: string;
  };
}

// Represents a Category as fetched from /uniforms/categories
interface ApiCategory {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  uniformSizes: Array<{ id: string; size: string; /* ... */ }>;
  // Add uniformCodes, uniformItems if they are directly under category in API response
}


const ViewItemsTakenBy: React.FC = () => {
  // Dialog state for errors and confirmations
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => setDialog((d) => ({ ...d, isOpen: false })),
    confirmText: '',
    cancelText: '',
    type: 'info' as 'delete' | 'warning' | 'info',
  });
  // Helper to show dialog
  const showDialog = (options: Partial<typeof dialog>) => {
    setDialog({
      ...dialog,
      isOpen: true,
      ...options,
      onCancel: options.onCancel || (() => setDialog((d) => ({ ...d, isOpen: false }))),
    });
  };
  const [allInventoryItems, setAllInventoryItems] = useState<InventoryItem[]>([]);
  const [entries, setEntries] = useState<UniformEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<UniformEntry | null>(null);

  // For the modal's item grid
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]); // Stores full category objects
  const [displaySizes, setDisplaySizes] = useState<string[]>([]); // Unique size names like ["S", "M", "L"]
  const [categorySizeOptions, setCategorySizeOptions] = useState<{ [categoryName: string]: string[] }>({}); // { "Shirt": ["S", "M"], "Trouser": ["M", "L"] }
  
  // Keyed by inventoryId for items being edited in the modal
  const [modalCheckedItems, setModalCheckedItems] = useState<{ [inventoryId: string]: string }>({});
  const [modalItemsNotTaken, setModalItemsNotTaken] = useState<{ [inventoryId: string]: string }>({});
  
  // Lookup: "categoryName-sizeName" -> inventoryId
  const [inventoryLookup, setInventoryLookup] = useState<{ [key: string]: string }>({});

  // Fetch all inventory items and prepare lookup
  useEffect(() => {
    const fetchAndPrepareInventory = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.error('No access token for inventory');
          setError('Authentication token not found');
          return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/v1/uniforms/inventory`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`Failed to fetch inventory: ${response.statusText}`);
        const data = await response.json();
        const inventory: InventoryItem[] = data.data?.inventory || data.inventory || [];
        setAllInventoryItems(inventory);

        const newLookup: { [key: string]: string } = {};
        inventory.forEach((invItem) => {
          const categoryName = invItem.uniformItem?.category?.name;
          const sizeName = invItem.size?.size;
          if (categoryName && sizeName) {
            newLookup[`${categoryName}-${sizeName}`] = invItem.id;
          }
        });
        setInventoryLookup(newLookup);
        console.log('Inventory lookup built:', newLookup);

      } catch (err) {
        console.error('Error fetching/preparing inventory items:', err);
        setError(err instanceof Error ? err.message : 'Failed to load inventory data');
      }
    };
    fetchAndPrepareInventory();
  }, []);

  // Fetch categories and sizes for the modal grid
  useEffect(() => {
    const fetchCategoriesAndSizesForModal = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('Authentication token not found for categories/sizes');
          return;
        }
        const response = await fetch(`${API_BASE_URL}/api/v1/uniforms/categories`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch API categories');
        const data = await response.json();
        const fetchedApiCategories: ApiCategory[] = data.data?.categories || [];
        setApiCategories(fetchedApiCategories);

        const uniqueSizeNames = new Set<string>();
        const catSizeOpts: { [categoryName: string]: string[] } = {};

        fetchedApiCategories.forEach((category) => {
          catSizeOpts[category.name] = [];
          category.uniformSizes?.forEach((size) => {
            uniqueSizeNames.add(size.size);
            catSizeOpts[category.name].push(size.size);
          });
        });
        setDisplaySizes(Array.from(uniqueSizeNames).sort()); // Sort sizes for consistent display
        setCategorySizeOptions(catSizeOpts);

      } catch (err) {
        console.error('Error fetching categories/sizes for modal:', err);
        // setError(err instanceof Error ? err.message : 'Failed to load category/size data');
      }
    };
    fetchCategoriesAndSizesForModal();
  }, []);


  // Fetch checkout entries
  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('Authentication token not found');

        const response = await fetch(`${API_BASE_URL}/api/v1/uniforms/checkouts`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch entries: ${errorText || response.statusText}`);
        }
        const data = await response.json();
        if (data.status?.returnCode !== '00') {
          throw new Error(data.status?.returnMessage || 'Failed to fetch entries');
        }
        
        const checkouts: UniformEntry[] = data.data?.checkouts || [];
        setEntries(checkouts);
      } catch (err) {
        console.error('Error fetching entries:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch entries');
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, []);

  const refreshEntries = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('Authentication token not found for refresh');
        const response = await fetch(`${API_BASE_URL}/api/v1/uniforms/checkouts`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to refresh entries');
        const data = await response.json();
        if (data.status.returnCode === '00') {
          setEntries(data.data?.checkouts || []);
        } else {
            console.warn("Refresh failed with code: ", data.status.returnMessage);
        }
      } catch (err) {
        console.error('Error refreshing entries:', err);
        // setError(err instanceof Error ? err.message : 'Failed to refresh entries');
      } finally {
        setLoading(false);
      }
    };


  const filteredEntries = entries.filter(entry => {
    const entryDate = entry.dateIssued.split('T')[0];
    const matchesName = entry.personName.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesDate = dateFilter ? entryDate === dateFilter : true;
    return matchesName && matchesDate;
  });

  const handleEdit = async (entryToEdit: UniformEntry) => {
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Authentication token not found');

      // Fetch the single checkout entry to ensure we have the latest item details
      // especially the `inventory` nested object for each item.
      const response = await fetch(`${API_BASE_URL}/api/v1/uniforms/checkouts/${entryToEdit.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`Failed to fetch details for entry ID ${entryToEdit.id}`);
      const data = await response.json();

      if (data.status.returnCode === '00') {
        const detailedCheckout: UniformEntry = data.data?.checkout || data.data?.result?.checkout || data.data;
        
        if (!detailedCheckout || !detailedCheckout.items) {
            console.warn("Fetched detailed checkout is missing or has no items:", detailedCheckout);
            // Use entryToEdit as a fallback, but items might lack full inventory details
            detailedCheckout.items = entryToEdit.items || [];
        }
        
        console.log("Detailed checkout for edit:", detailedCheckout);

        const newModalCheckedItems: { [inventoryId: string]: string } = {};
        const newModalItemsNotTaken: { [inventoryId: string]: string } = {};
        
        (detailedCheckout.items || []).forEach((item) => {
          if (item.inventoryId) {
            if (item.isTaken) {
              newModalCheckedItems[item.inventoryId] = String(item.quantity);
            } else {
              newModalItemsNotTaken[item.inventoryId] = String(item.quantity);
            }
          } else {
            console.warn("Checkout item during edit prep is missing inventoryId:", item);
          }
        });
        
        setModalCheckedItems(newModalCheckedItems);
        setModalItemsNotTaken(newModalItemsNotTaken);
        
        window.originalCheckoutItems = [...(detailedCheckout.items || [])]; // Store a deep copy
        
        setEditingEntry(detailedCheckout); // Use the fully detailed checkout for editing
        setShowEditModal(true);
      } else {
        throw new Error(data.status.returnMessage || 'Failed to fetch entry details for editing');
      }
    } catch (err) {
      console.error('Error in handleEdit:', err);
      setError(err instanceof Error ? err.message : 'Failed to prepare entry for editing');
    }
  };

  const handleDelete = async (entry: UniformEntry) => {
    showDialog({
      title: 'Delete Entry',
      message: 'Are you sure you want to delete this entry?',
      type: 'delete',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setDialog((d) => ({ ...d, isOpen: false }));
        setError(null);
        try {
          const token = localStorage.getItem('accessToken');
          if (!token) throw new Error('Authentication token not found');
          const response = await fetch(`${API_BASE_URL}/api/v1/uniforms/checkouts/${entry.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) throw new Error('Failed to delete entry');
          const data = await response.json();
          if (data.status.returnCode === '00') {
            setEntries(prevEntries => prevEntries.filter(e => e.id !== entry.id));
          } else {
            throw new Error(data.status.returnMessage || 'Failed to delete entry');
          }
        } catch (err) {
          console.error('Error deleting entry:', err);
          showDialog({
            title: 'Delete Failed',
            message: err instanceof Error ? err.message : 'Failed to delete entry',
            type: 'warning',
            confirmText: 'OK',
            cancelText: '',
            onConfirm: () => setDialog((d) => ({ ...d, isOpen: false })),
          });
        }
      },
      onCancel: () => setDialog((d) => ({ ...d, isOpen: false })),
    });
  };

  const handleSaveEdit = async (currentEditingEntryState: UniformEntry | null) => {
    if (!currentEditingEntryState) return;
    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Authentication token not found for save');
      
      console.log('State of currentEditingEntry before building payload:', currentEditingEntryState);
      console.log('State of modalCheckedItems:', modalCheckedItems);
      console.log('State of modalItemsNotTaken:', modalItemsNotTaken);

      const itemsForBackendPayload: Array<{ inventoryId: string; quantity: number; isTaken: boolean; id?: string }> = [];

      Object.entries(modalCheckedItems).forEach(([inventoryId, quantityStr]) => {
        const quantity = Number(quantityStr);
        if (quantity > 0) {
          const originalItem = window.originalCheckoutItems?.find(
            (item) => item.inventoryId === inventoryId && item.isTaken
          );
          itemsForBackendPayload.push({
            id: originalItem?.id,
            inventoryId,
            quantity,
            isTaken: true,
          });
        }
      });

      Object.entries(modalItemsNotTaken).forEach(([inventoryId, quantityStr]) => {
        const quantity = Number(quantityStr);
        if (quantity > 0) {
          const originalItem = window.originalCheckoutItems?.find(
            (item) => item.inventoryId === inventoryId && !item.isTaken
          );
          itemsForBackendPayload.push({
            id: originalItem?.id,
            inventoryId,
            quantity,
            isTaken: false,
          });
        }
      });
      
      console.log('[Frontend] Constructed itemsForBackendPayload:', JSON.stringify(itemsForBackendPayload, null, 2));

      const countOfItemsNotTakenForCheckoutRecord = itemsForBackendPayload
                                  .filter(item => !item.isTaken)
                                  .reduce((sum, item) => sum + item.quantity, 0);
      const payload = {
        id: currentEditingEntryState.id,
        personName: currentEditingEntryState.personName,
        studentClass: currentEditingEntryState.studentClass,
        takenBy: currentEditingEntryState.takenBy,
        dateIssued: new Date(currentEditingEntryState.dateIssued).toISOString(), // Ensure ISO format
        totalItems: Number(currentEditingEntryState.totalItems),
        itemsNotTaken: countOfItemsNotTakenForCheckoutRecord,
        studentId: currentEditingEntryState.studentId,
        items: itemsForBackendPayload
      };
      
      console.log('Saving with payload (to backend):', JSON.stringify(payload, null, 2));
      
      const response = await fetch(`${API_BASE_URL}/api/v1/uniforms/checkouts/${currentEditingEntryState.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Update failed: ${response.statusText}`}));
        throw new Error(errorData.message || `Failed to update entry: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Update response from backend:", data);

      if (data.status?.returnCode === '00') {
        // The backend response for an update might just contain the updated checkout,
        // and the items array within it would be the new items.
        const backendCheckoutDataWithNewItems: UniformEntry = data.data?.result?.checkout || data.data?.checkout;
        
        console.log('Checkout data returned from backend (with new items):', backendCheckoutDataWithNewItems);
        
        setEntries(prevEntries =>
          prevEntries.map(entry =>
            entry.id === currentEditingEntryState.id ? backendCheckoutDataWithNewItems : entry
          )
        );
        
        setShowEditModal(false);
        setEditingEntry(null);
        setModalCheckedItems({});
        setModalItemsNotTaken({});
        window.originalCheckoutItems = undefined; // Clear stored items

        // Optionally, call refreshEntries() if you want to be absolutely sure the whole list is synced
        // await refreshEntries(); 

      } else {
        throw new Error(data.status?.returnMessage || 'Failed to update entry (backend error code)');
      }
    } catch (err) {
      console.error('Error in handleSaveEdit:', err);
      setError(err instanceof Error ? err.message : 'Failed to update entry');
    } finally {
        setLoading(false);
    }
  };

  const handleUpdateEditingEntry = (field: keyof UniformEntry, value: any) => {
    if (editingEntry) {
      setEditingEntry(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  // Item change handlers for the modal UI
  const handleModalCheckedItemChange = (sizeName: string, categoryName: string, value: string) => {
    const lookupKey = `${categoryName}-${sizeName}`;
    const inventoryId = inventoryLookup[lookupKey];
    if (!inventoryId) {
      console.warn(`No inventoryId for ${categoryName}-${sizeName}`); return;
    }
    setModalCheckedItems(prev => {
      const updated = { ...prev };
      if (value === '' || Number(value) <= 0) delete updated[inventoryId];
      else updated[inventoryId] = value;
      return updated;
    });
  };

  const handleModalItemNotTakenChange = (sizeName: string, categoryName: string, value: string) => {
    const lookupKey = `${categoryName}-${sizeName}`;
    const inventoryId = inventoryLookup[lookupKey];
    if (!inventoryId) {
      console.warn(`No inventoryId for ${categoryName}-${sizeName}`); return;
    }
    setModalItemsNotTaken(prev => {
      const updated = { ...prev };
      if (value === '' || Number(value) <= 0) delete updated[inventoryId];
      else updated[inventoryId] = value;
      return updated;
    });
  };

  const getModalCheckedItemValue = (sizeName: string, categoryName: string) => {
    const lookupKey = `${categoryName}-${sizeName}`;
    const inventoryId = inventoryLookup[lookupKey];
    return inventoryId ? (modalCheckedItems[inventoryId] || '') : '';
  };

  const getModalItemNotTakenValue = (sizeName: string, categoryName: string) => {
    const lookupKey = `${categoryName}-${sizeName}`;
    const inventoryId = inventoryLookup[lookupKey];
    return inventoryId ? (modalItemsNotTaken[inventoryId] || '') : '';
  };

  const calculateModalBalance = () => {
    if (!editingEntry) return { checkedTotal: 0, notTakenTotal: 0, balance: 0 };
    const checkedTotal = Object.values(modalCheckedItems).reduce((sum, val) => sum + Number(val || 0), 0);
    const notTakenTotal = Object.values(modalItemsNotTaken).reduce((sum, val) => sum + Number(val || 0), 0);
    const targetTotal = Number(editingEntry.totalItems || 0);
    const balance = targetTotal - (checkedTotal + notTakenTotal);
    return { checkedTotal, notTakenTotal, balance };
  };

  const handlePrint = () => { /* ... your print logic ... */ };
  const handleExportToExcel = () => { /* ... your export logic ... */ };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center py-4">
      {/* Loading Indicator */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-center">Loading...</h3>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        </div>
      )}

      {/* Error DialogBox */}
      <DialogBox
        isOpen={dialog.isOpen}
        title={dialog.title || (dialog.type === 'warning' ? 'Error' : '')}
        message={dialog.message}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        type={dialog.type}
      />
      {/* Optionally, if you want to show legacy error modal for setError, you can remove this if all error handling is via DialogBox */}

      {/* Main Container */}
      <div className="container mx-auto bg-white shadow-lg rounded-lg p-6 w-full max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-700">View Items Taken</h2>
          <div>
            <button onClick={handlePrint} className="bg-blue-500 text-white px-4 py-2 rounded-md mr-2 hover:bg-blue-600 transition-colors">
              Print
            </button>
            <button onClick={handleExportToExcel} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">
              Export to Excel
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Filter by Name..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div id="printableArea" className="overflow-x-auto">
          {/* Responsive Cards - Tablet (md:grid md:grid-cols-2 lg:hidden) */}
          <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6 lg:hidden">
            {filteredEntries.length > 0 ? filteredEntries.map((entry, index) => (
              <div key={entry.id || index} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
                <div className="mb-2 font-semibold text-gray-900">{entry.personName}</div>
                <div className="mb-2 text-xs text-gray-700">Class: <span className="font-medium">{entry.studentClass}</span></div>
                <div className="mb-2 text-xs text-gray-700">Taken By: <span className="font-medium">{entry.takenBy}</span></div>
                <div className="mb-2 text-xs text-gray-700">Date Issued: <span className="font-medium">{new Date(entry.dateIssued).toLocaleDateString()}</span></div>
                <div className="mb-2 text-xs text-gray-700">Items Taken:
                  {(entry.items || []).filter(item => item.isTaken).map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center text-xs">
                      <span className="font-medium mr-1">{item.quantity}x</span>
                      <span className="text-gray-700">
                        {item.inventory?.uniformItem?.name?.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Unknown Item'}
                        {item.inventory?.size?.size && ` (${item.inventory.size.size})`}
                      </span>
                    </div>
                  ))}
                  {(entry.items || []).filter(item => item.isTaken).length === 0 && <span className="text-gray-400 text-xs">None</span>}
                </div>
                <div className="mb-2 text-xs text-gray-700">Items Not Taken:
                  {(entry.items || []).filter(item => !item.isTaken).map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center text-xs">
                      <span className="font-medium mr-1">{item.quantity}x</span>
                      <span className="text-gray-700">
                        {item.inventory?.uniformItem?.name?.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Unknown Item'}
                        {item.inventory?.size?.size && ` (${item.inventory.size.size})`}
                      </span>
                    </div>
                  ))}
                  {(entry.items || []).filter(item => !item.isTaken).length === 0 && <span className="text-gray-400 text-xs">None</span>}
                </div>
                <div className="mb-2 text-xs text-gray-700">Receipt: {entry.receiptPath ? (
                  <a href={entry.receiptPath} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 underline text-xs flex items-center">View Receipt</a>
                ) : (
                  <span className="text-gray-400 text-xs">No receipt</span>
                )}
                </div>
                <div className="flex gap-2 justify-center mt-2">
                  <button 
                    onClick={() => handleEdit(entry)}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(entry)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )) : (
              <div className="col-span-2 text-center py-4 text-gray-500">No entries found.</div>
            )}
          </div>

          {/* Responsive Stacked Cards - Mobile (md:hidden) */}
          <div className="md:hidden space-y-4 mb-6">
            {filteredEntries.length > 0 ? filteredEntries.map((entry, index) => (
              <div key={entry.id || index} className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col justify-between">
                <div className="mb-2 font-bold text-base text-gray-800">{entry.personName}</div>
                <div className="mb-2 text-xs text-gray-700">Class: <span className="font-medium">{entry.studentClass}</span></div>
                <div className="mb-2 text-xs text-gray-700">Taken By: <span className="font-medium">{entry.takenBy}</span></div>
                <div className="mb-2 text-xs text-gray-700">Date Issued: <span className="font-medium">{new Date(entry.dateIssued).toLocaleDateString()}</span></div>
                <div className="mb-2 text-xs text-gray-700">Items Taken:
                  {(entry.items || []).filter(item => item.isTaken).map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center text-xs">
                      <span className="font-medium mr-1">{item.quantity}x</span>
                      <span className="text-gray-700">
                        {item.inventory?.uniformItem?.name?.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Unknown Item'}
                        {item.inventory?.size?.size && ` (${item.inventory.size.size})`}
                      </span>
                    </div>
                  ))}
                  {(entry.items || []).filter(item => item.isTaken).length === 0 && <span className="text-gray-400 text-xs">None</span>}
                </div>
                <div className="mb-2 text-xs text-gray-700">Items Not Taken:
                  {(entry.items || []).filter(item => !item.isTaken).map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center text-xs">
                      <span className="font-medium mr-1">{item.quantity}x</span>
                      <span className="text-gray-700">
                        {item.inventory?.uniformItem?.name?.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Unknown Item'}
                        {item.inventory?.size?.size && ` (${item.inventory.size.size})`}
                      </span>
                    </div>
                  ))}
                  {(entry.items || []).filter(item => !item.isTaken).length === 0 && <span className="text-gray-400 text-xs">None</span>}
                </div>
                <div className="mb-2 text-xs text-gray-700">Receipt: {entry.receiptPath ? (
                  <a href={entry.receiptPath} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 underline text-xs flex items-center">View Receipt</a>
                ) : (
                  <span className="text-gray-400 text-xs">No receipt</span>
                )}
                </div>
                <div className="flex gap-2 justify-center mt-2">
                  <button 
                    onClick={() => handleEdit(entry)}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(entry)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-4 text-gray-500">No entries found.</div>
            )}
          </div>

          {/* Table - Desktop Only */}
          <div className="hidden lg:block">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 p-2 text-left">#</th>
                  <th className="border border-gray-300 p-2 text-left">Name</th>
                  <th className="border border-gray-300 p-2 text-left">Class</th>
                  <th className="border border-gray-300 p-2 text-left">Taken By</th>
                  <th className="border border-gray-300 p-2 text-left">Date Issued</th>
                  <th className="border border-gray-300 p-2 text-left">Items Taken</th>
                  <th className="border border-gray-300 p-2 text-left">Items Not Taken</th>
                  <th className="border border-gray-300 p-2 text-left">Receipt</th>
                  <th className="border border-gray-300 p-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length > 0 ? filteredEntries.map((entry, index) => (
                  <tr key={entry.id || index} className="hover:bg-gray-50 transition-colors">
                    <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                    <td className="border border-gray-300 p-2">{entry.personName}</td>
                    <td className="border border-gray-300 p-2">{entry.studentClass}</td>
                    <td className="border border-gray-300 p-2">{entry.takenBy}</td>
                    <td className="border border-gray-300 p-2">
                      {new Date(entry.dateIssued).toLocaleDateString()}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {(entry.items || []).filter(item => item.isTaken).map((item, idx) => (
                        <div key={item.id || idx} className="flex items-center text-xs">
                          <span className="font-medium mr-1">{item.quantity}x</span>
                          <span className="text-gray-700">
                            {item.inventory?.uniformItem?.name?.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Unknown Item'}
                            {item.inventory?.size?.size && ` (${item.inventory.size.size})`}
                          </span>
                        </div>
                      ))}
                      {(entry.items || []).filter(item => item.isTaken).length === 0 && <span className="text-gray-400 text-xs">None</span>}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {(entry.items || []).filter(item => !item.isTaken).map((item, idx) => (
                       <div key={item.id || idx} className="flex items-center text-xs">
                          <span className="font-medium mr-1">{item.quantity}x</span>
                          <span className="text-gray-700">
                            {item.inventory?.uniformItem?.name?.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Unknown Item'}
                            {item.inventory?.size?.size && ` (${item.inventory.size.size})`}
                          </span>
                        </div>
                      ))}
                       {(entry.items || []).filter(item => !item.isTaken).length === 0 && <span className="text-gray-400 text-xs">None</span>}
                    </td>
                    <td className="border border-gray-300 p-2">
                      {entry.receiptPath ? (
                        <a 
                          href={entry.receiptPath} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 underline text-xs flex items-center"
                        >
                          View Receipt
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">No receipt</span>
                      )}
                    </td>
                    <td className="border border-gray-300 p-2">
                      <div className="flex gap-2 justify-center">
                        <button 
                          onClick={() => handleEdit(entry)}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition-colors"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(entry)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                      <td colSpan={8} className="text-center py-4 text-gray-500">No entries found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {showEditModal && editingEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-40 p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-700">Edit Entry: {editingEntry.personName}</h3>
                <button onClick={() => { setShowEditModal(false); setEditingEntry(null); setModalCheckedItems({}); setModalItemsNotTaken({}); window.originalCheckoutItems = undefined;}} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-600">Name</label>
                  <input type="text" value={editingEntry.personName} onChange={(e) => handleUpdateEditingEntry('personName', e.target.value)} className="w-full border rounded-md p-2 border-gray-300 focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-600">Class</label>
                  <input type="text" value={editingEntry.studentClass} onChange={(e) => handleUpdateEditingEntry('studentClass', e.target.value)} className="w-full border rounded-md p-2 border-gray-300 focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-600">Taken By</label>
                  <input type="text" value={editingEntry.takenBy} onChange={(e) => handleUpdateEditingEntry('takenBy', e.target.value)} className="w-full border rounded-md p-2 border-gray-300 focus:ring-blue-500 focus:border-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-600">Date Issued</label>
                  <input type="date" value={editingEntry.dateIssued.split('T')[0]} onChange={(e) => handleUpdateEditingEntry('dateIssued', e.target.value)} className="w-full border rounded-md p-2 border-gray-300 focus:ring-blue-500 focus:border-blue-500"/>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4 mb-4">
                <label htmlFor="modalItemsToBeTaken" className="block text-gray-700 font-medium mb-1">Target Total Items</label>
                <input type="number" id="modalItemsToBeTaken" value={editingEntry.totalItems || 0} onChange={(e) => handleUpdateEditingEntry('totalItems', Number(e.target.value))} className="border border-gray-300 rounded-md p-2 w-full focus:ring-blue-500 focus:border-blue-500" min="0"/>

                {apiCategories.length > 0 && displaySizes.length > 0 ? (
                  <>
                    <div className="mt-4">
                        <h4 className="font-medium text-gray-700 mb-2">Items Taken:</h4>
                        <div className="overflow-x-auto border border-gray-300 rounded-md">
                        <table className="w-full min-w-[600px] text-sm">
                            <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 text-left border-b border-r border-gray-300">Size</th>
                                {apiCategories.map((cat) => (
                                <th key={cat.id} className="p-2 text-center border-b border-r border-gray-300 last:border-r-0">{cat.name}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {displaySizes.map((sizeName) => (
                                <tr key={sizeName}>
                                <td className="p-2 font-medium border-b border-r border-gray-300">{sizeName}</td>
                                {apiCategories.map((cat) => (
                                    <td key={`${cat.id}-${sizeName}`} className="p-1 border-b border-r border-gray-300 last:border-r-0">
                                    <input
                                        type="number" min="0"
                                        className="w-full p-1 text-center border border-gray-200 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                        placeholder="0"
                                        value={getModalCheckedItemValue(sizeName, cat.name)}
                                        onChange={(e) => handleModalCheckedItemChange(sizeName, cat.name, e.target.value)}
                                        disabled={!inventoryLookup[`${cat.name}-${sizeName}`] || !categorySizeOptions[cat.name]?.includes(sizeName)}
                                    />
                                    </td>
                                ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                    <div className="mt-4">
                        <h4 className="font-medium text-gray-700 mb-2">Items NOT Taken:</h4>
                         <div className="overflow-x-auto border border-gray-300 rounded-md">
                        <table className="w-full min-w-[600px] text-sm">
                            <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 text-left border-b border-r border-gray-300">Size</th>
                                {apiCategories.map((cat) => (
                                <th key={cat.id} className="p-2 text-center border-b border-r border-gray-300 last:border-r-0">{cat.name}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {displaySizes.map((sizeName) => (
                                <tr key={sizeName}>
                                <td className="p-2 font-medium border-b border-r border-gray-300">{sizeName}</td>
                                {apiCategories.map((cat) => (
                                    <td key={`${cat.id}-${sizeName}`} className="p-1 border-b border-r border-gray-300 last:border-r-0">
                                    <input
                                        type="number" min="0"
                                        className="w-full p-1 text-center border border-gray-200 rounded focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                        placeholder="0"
                                        value={getModalItemNotTakenValue(sizeName, cat.name)}
                                        onChange={(e) => handleModalItemNotTakenChange(sizeName, cat.name, e.target.value)}
                                        disabled={!inventoryLookup[`${cat.name}-${sizeName}`] || !categorySizeOptions[cat.name]?.includes(sizeName)}
                                    />
                                    </td>
                                ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center text-gray-500">Loading item grid options...</div>
                )}

                <div className="mt-4 p-3 bg-blue-50 rounded-lg grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-gray-600">Taken Total:</p>
                    <p className="font-medium">{calculateModalBalance().checkedTotal}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Not Taken Total:</p>
                    <p className="font-medium">{calculateModalBalance().notTakenTotal}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Balance:</p>
                    <p className={`font-semibold ${calculateModalBalance().balance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {calculateModalBalance().balance}
                    </p>
                  </div>
                </div>
                 {calculateModalBalance().balance !== 0 && (
                    <p className="text-xs text-red-500 text-center mt-1">
                        Balance must be zero to save. Adjust quantities or the &quot;Target Total Items&quot;.
                    </p>
                )}
              </div>


              <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-200">
                <button onClick={() => { setShowEditModal(false); setEditingEntry(null); setModalCheckedItems({}); setModalItemsNotTaken({}); window.originalCheckoutItems = undefined; }} className="px-4 py-2 border rounded hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => editingEntry && handleSaveEdit(editingEntry)}
                  disabled={loading || calculateModalBalance().balance !== 0}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewItemsTakenBy;