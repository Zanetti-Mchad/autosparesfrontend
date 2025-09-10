"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Trash2, Check, X, Plus } from 'lucide-react';
import DialogBox from '@/components/Dailogbox';
import { env } from '@/env';

// Define the base URL from environment variables
const baseUrl = env.BACKEND_API_URL;

// Define interfaces that match the API response structure
interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string; 
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById: string | null;
  subcategories: Subcategory[];
}

interface ApiResponse {
  status: {
    returnCode: string;
    returnMessage: string;
  };
  data: {
    expenseCategories: Category[];
  };
}

const ExpenseCategoryEditor = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedCode, setEditedCode] = useState('');
  const [editedSubcategories, setEditedSubcategories] = useState<Subcategory[]>([]);
  const [newSubcategories, setNewSubcategories] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // New category state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState<{ name: string; code: string; subcategories: string[] }>({
    name: '',
    code: '',
    subcategories: []
  });

  // Wrap fetchCategories in useCallback
  const fetchCategories = useCallback(async () => {
    // Only show loading indicator on initial load
    if (categories.length === 0) {
      setIsLoading(true);
    }
    setError('');
    
    try {
      const response = await fetch(`${baseUrl}/api/v1/finance/get-expense-categories`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`);
      }

      const responseData: ApiResponse = await response.json();
      console.log("API response data:", responseData);
      
      if (responseData.status?.returnCode === "00") {
        // If we have subcategories in the response, use them
        if (responseData.data?.expenseCategories?.length > 0) {
          setCategories(responseData.data.expenseCategories);
        } else {
          console.warn("No categories found in the API response");
        }
      } else {
        setError(responseData.status?.returnMessage || 'Failed to fetch categories');
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError('Network error while fetching categories');
      // Don't reset categories to empty array on error if we already have data
      if (categories.length === 0) {
        setCategories([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [categories.length]); // Add categories.length as a dependency

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]); // Use fetchCategories in the dependency array

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setEditedName(category.name);
    setEditedCode(category.code);
    setEditedSubcategories([...category.subcategories]);
    setNewSubcategories([]);
  };

  const handleSave = async () => {
    if (editedName.trim() && editedCode.trim()) {
      try {
        setError('');
        
        // Extract just the name strings from all subcategories
        const subcategoryNames = [
          ...editedSubcategories.map(sub => sub.name.trim()),
          ...newSubcategories.filter(name => name.trim() !== '').map(name => name.trim())
        ];

        console.log("Sending subcategory names:", subcategoryNames);

        const response = await fetch(`${baseUrl}/api/v1/finance/update-expense-category/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({
            name: editedName.trim(),
            code: editedCode.trim(),
            subcategories: subcategoryNames  // Just send the array of name strings
          }),
        });

        const responseText = await response.text();
        console.log("Raw API response:", responseText);
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
          console.log("Parsed API response:", responseData);
        } catch (e) {
          console.error("Could not parse response as JSON:", e);
        }

        if (!response.ok) {
          throw new Error(`Failed to update category: ${response.status}. Response: ${responseText}`);
        }

        // Show success message to user
        setError("Category updated successfully!");
        // Make the error message green instead of red
        document.querySelector('[class*="bg-red-50"]')?.classList.replace('bg-red-50', 'bg-green-50');
        document.querySelector('[class*="text-red-700"]')?.classList.replace('text-red-700', 'text-green-700');
        document.querySelector('[class*="border-red-200"]')?.classList.replace('border-red-200', 'border-green-200');
        // Update local state with the changes
        setCategories(prev => 
          prev.map(category => 
            category.id === editingId 
              ? { 
                  ...category, 
                  name: editedName.trim(), 
                  code: editedCode.trim(), 
                  subcategories: subcategoryNames.map((name, index) => ({
                    id: String(index), // Assuming id is a string for simplicity
                    name: name,
                    categoryId: category.id, // Assuming categoryId is required
                    isActive: true, // Assuming isActive is required and defaulting to true
                    createdAt: new Date().toISOString(), // Assuming createdAt is required and setting to current date
                    updatedAt: new Date().toISOString(), // Assuming updatedAt is required and setting to current date
                    createdById: category.createdById, // Assuming createdById is required and using existing value
                    updatedById: category.updatedById, // Assuming updatedById is required and using existing value
                  }))
                }
              : category
          )
        );

        // Reset editing state
        resetEditState();
        
        // Refresh data after a short delay to ensure UI is updated with server data
        setTimeout(() => {
          fetchCategories().catch(err => console.error("Error refreshing categories:", err));
        }, 1000);
      } catch (error) {
        console.error("Error saving category:", error);
        setError('Failed to update category: ' + (error instanceof Error ? error.message : String(error)));
      }
    } else {
      setError('Category name and code are required');
    }
  };

  const resetEditState = () => {
    setEditingId(null);
    setEditedName('');
    setEditedCode('');
    setEditedSubcategories([]);
    setNewSubcategories([]);
  };

  const handleCancel = () => {
    resetEditState();
  };

  const openDeleteDialog = (id: string) => {
    setCategoryToDelete(id);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (categoryToDelete !== null) {
      try {
        const response = await fetch(`${baseUrl}/api/v1/finance/delete-expense-category/${categoryToDelete}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to delete category: ${response.status}`);
        }

        // Update the local state
        setCategories(prev => prev.filter(category => category.id !== categoryToDelete));
        setCategoryToDelete(null);
      } catch (error) {
        console.error("Error deleting category:", error);
        setError('Failed to delete category');
      }
    }
    setIsDialogOpen(false);
  };

  const handleExistingSubcategoryChange = (index: number, value: string) => {
    const updatedSubcategories = [...editedSubcategories];
    updatedSubcategories[index] = {
      ...updatedSubcategories[index],
      name: value
    };
    setEditedSubcategories(updatedSubcategories);
  };

  const handleNewSubcategoryChange = (index: number, value: string) => {
    const updatedNewSubcategories = [...newSubcategories];
    updatedNewSubcategories[index] = value;
    setNewSubcategories(updatedNewSubcategories);
  };

  const addNewSubcategory = () => {
    setNewSubcategories([...newSubcategories, '']);
  };

  const removeExistingSubcategory = (index: number) => {
    const updatedSubcategories = [...editedSubcategories];
    updatedSubcategories.splice(index, 1);
    setEditedSubcategories(updatedSubcategories);
  };

  const removeNewSubcategory = (index: number) => {
    const updatedNewSubcategories = [...newSubcategories];
    updatedNewSubcategories.splice(index, 1);
    setNewSubcategories(updatedNewSubcategories);
  };

  // Handle adding a new category
  const handleAddCategory = async () => {
    if (newCategory.name.trim() && newCategory.code.trim()) {
      try {
        setError('');
        
        const subcategoriesToSend = newCategory.subcategories
          .filter(name => name.trim() !== '')
          .map(name => ({ name: name.trim() }));

        console.log("Creating new category:", {
          name: newCategory.name.trim(),
          code: newCategory.code.trim(),
          subcategories: subcategoriesToSend
        });

        const response = await fetch(`${baseUrl}/api/v1/finance/create-expense-category`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({
            name: newCategory.name.trim(),
            code: newCategory.code.trim(),
            subcategories: subcategoriesToSend
          }),
        });

        const responseText = await response.text();
        console.log("Raw API response:", responseText);
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
          console.log("Parsed API response:", responseData);
        } catch (e) {
          console.error("Could not parse response as JSON:", e);
        }

        if (!response.ok) {
          throw new Error(`Failed to create category: ${response.status}. Response: ${responseText}`);
        }

        // Show success message
        setError("Category created successfully!");
        // Make the error message green instead of red
        document.querySelector('[class*="bg-red-50"]')?.classList.replace('bg-red-50', 'bg-green-50');
        document.querySelector('[class*="text-red-700"]')?.classList.replace('text-red-700', 'text-green-700');
        document.querySelector('[class*="border-red-200"]')?.classList.replace('border-red-200', 'border-green-200');
        
        // Reset form and fetch updated categories
        setNewCategory({ name: '', code: '', subcategories: [] });
        setIsAddingCategory(false);
        
        // Refresh categories from the server
        await fetchCategories();
      } catch (error) {
        console.error("Error creating category:", error);
        setError('Failed to create category: ' + (error instanceof Error ? error.message : String(error)));
      }
    } else {
      setError('Category name and code are required');
    }
  };
  
  // Handle adding a new subcategory field to the new category form
  const addNewCategorySubcategory = () => {
    setNewCategory({
      ...newCategory,
      subcategories: [...newCategory.subcategories, '']
    });
  };
  
  // Handle change in a subcategory input for the new category
  const handleNewCategorySubcategoryChange = (index: number, value: string) => {
    const updatedSubcategories = [...newCategory.subcategories];
    updatedSubcategories[index] = value;
    setNewCategory({
      ...newCategory,
      subcategories: updatedSubcategories
    });
  };
  
  // Handle removing a subcategory from the new category form
  const removeNewCategorySubcategory = (index: number) => {
    const updatedSubcategories = [...newCategory.subcategories];
    updatedSubcategories.splice(index, 1);
    setNewCategory({
      ...newCategory,
      subcategories: updatedSubcategories
    });
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center pt-6 p-4">
      <Card className="w-full max-w-5xl">
        <CardContent className="p-6">
          <CardHeader className="px-0">
            <CardTitle className="text-2xl font-semibold text-center">
              Manage Expense Categories
            </CardTitle>
          </CardHeader>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 mb-4 rounded border border-red-200">
              {error}
            </div>
          )}

          {/* Loading indicator */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-2 text-gray-600">Loading categories...</p>
            </div>
          ) : (
            <>
              {/* Categories Table */}
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse mb-6">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border p-2">#</th>
                      <th className="border p-2">Category</th>
                      <th className="border p-2">Code</th>
                      <th className="border p-2">Subcategories</th>
                      <th className="border p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="border p-4 text-center text-gray-500">
                          No categories found. Add a new category to get started.
                        </td>
                      </tr>
                    ) : (
                      categories.map((category, index) => (
                        <tr key={category.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="border p-2 text-center">{index + 1}</td>
                          <td className="border p-2">
                            {editingId === category.id ? (
                              <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                className="border p-2 rounded-md w-full"
                                autoFocus
                              />
                            ) : (
                              category.name
                            )}
                          </td>
                          <td className="border p-2">
                            {editingId === category.id ? (
                              <input
                                type="text"
                                value={editedCode}
                                onChange={(e) => setEditedCode(e.target.value)}
                                className="border p-2 rounded-md w-full"
                              />
                            ) : (
                              category.code
                            )}
                          </td>
                          <td className="border p-2">
                            {editingId === category.id ? (
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm text-gray-700 mb-1">Existing Subcategories:</h4>
                                {editedSubcategories.length > 0 ? (
                                  editedSubcategories.map((subcategory, subIndex) => (
                                    <div key={`${subcategory.id || 'new'}-${subIndex}`} className="flex items-center space-x-2">
                                      <input
                                        type="text"
                                        value={subcategory.name}
                                        onChange={(e) => handleExistingSubcategoryChange(subIndex, e.target.value)}
                                        className="border p-2 rounded-md flex-grow"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeExistingSubcategory(subIndex)}
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        <X className="h-5 w-5" />
                                      </button>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-gray-500 italic text-sm">No subcategories yet</p>
                                )}
                                
                                {newSubcategories.length > 0 && (
                                  <h4 className="font-medium text-sm text-gray-700 mt-3 mb-1">New Subcategories:</h4>
                                )}
                                {newSubcategories.map((subcategory, subIndex) => (
                                  <div key={`new-${subIndex}`} className="flex items-center space-x-2">
                                    <input
                                      type="text"
                                      value={subcategory}
                                      onChange={(e) => handleNewSubcategoryChange(subIndex, e.target.value)}
                                      className="border p-2 rounded-md flex-grow"
                                      placeholder="Enter new subcategory name"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeNewSubcategory(subIndex)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <X className="h-5 w-5" />
                                    </button>
                                  </div>
                                ))}
                                
                                <button
                                  type="button"
                                  className="text-blue-500 hover:text-blue-700 flex items-center mt-2"
                                  onClick={addNewSubcategory}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add Subcategory
                                </button>
                              </div>
                            ) : (
                              <div>
                                {category.subcategories && category.subcategories.length > 0 ? (
                                  <ul className="list-disc list-inside">
                                    {category.subcategories.map((sub) => (
                                      <li key={sub.id}>{sub.name}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-gray-500 italic">No subcategories</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="border p-2">
                            {editingId === category.id ? (
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={handleSave}
                                  className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 flex items-center"
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Save
                                </button>
                                <button
                                  onClick={handleCancel}
                                  className="bg-gray-500 text-white px-3 py-1 rounded-md hover:bg-gray-600 flex items-center"
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleEdit(category)}
                                  className="bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600 flex items-center"
                                >
                                  <Pencil className="w-4 h-4 mr-1" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => openDeleteDialog(category.id)}
                                  className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 flex items-center"
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add Category Form */}
              <div className="mb-6 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Add New Expense Category</h3>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(!isAddingCategory)}
                    className={`${isAddingCategory ? 'bg-gray-500' : 'bg-blue-500'} text-white px-4 py-2 rounded-md flex items-center`}
                  >
                    {isAddingCategory ? (
                      <>
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Category
                      </>
                    )}
                  </button>
                </div>
                
                {isAddingCategory && (
                  <div className="bg-white p-4 rounded-md shadow border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category Name *
                        </label>
                        <input
                          type="text"
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          placeholder="e.g. Utilities"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category Code *
                        </label>
                        <input
                          type="text"
                          value={newCategory.code}
                          onChange={(e) => setNewCategory({...newCategory, code: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          placeholder="e.g. UTL"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subcategories
                      </label>
                      
                      {newCategory.subcategories.length > 0 ? (
                        <div className="space-y-2">
                          {newCategory.subcategories.map((subcategory, index) => (
                            <div key={`new-cat-sub-${index}`} className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={subcategory}
                                onChange={(e) => handleNewCategorySubcategoryChange(index, e.target.value)}
                                className="flex-grow p-2 border border-gray-300 rounded-md"
                                placeholder={`Enter subcategory ${index + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => removeNewCategorySubcategory(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic text-sm mb-2">No subcategories added yet</p>
                      )}
                      
                      <button
                        type="button"
                        onClick={addNewCategorySubcategory}
                        className="text-blue-500 hover:text-blue-700 flex items-center mt-2"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Subcategory
                      </button>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Create Category
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <DialogBox
        isOpen={isDialogOpen}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone and will remove all associated subcategories."
        onConfirm={handleDelete}
        onCancel={() => setIsDialogOpen(false)}
        confirmText="Delete"
        cancelText="Cancel"
        type="delete"
      />
    </div>
  );
};

export default ExpenseCategoryEditor;