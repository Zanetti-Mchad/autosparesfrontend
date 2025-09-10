"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import Image from 'next/image';
import DialogBox from '@/components/Dailogbox';
import { env } from '@/env';

// Define the structure of a category
interface Category {
  id: string;
  name: string;
  code: string;
}

const CategoryManager = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState<string>('');
  const [editedCode, setEditedCode] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Fetch income categories from the API
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${env.BACKEND_API_URL}/api/v1/finance/get-income-categories`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const result = await response.json();
      if (result.status.returnCode === "00") {
        setCategories(result.data.incomeCategories);
      } else {
        console.error(result.status.returnMessage);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories(); // Fetch categories on component mount
  }, []);

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setEditedName(category.name);
    setEditedCode(category.code);
  };

  const handleSave = async () => {
    if (editedName.trim() && editedCode.trim()) {
      try {
        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/finance/update-income-category/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({ name: editedName.trim(), code: editedCode.trim() }),
        });
        const result = await response.json();
        if (response.ok) {
          fetchCategories(); // Refresh categories after update
          setEditingId(null);
          setEditedName('');
          setEditedCode('');
        } else {
          console.error(result.message);
        }
      } catch (error) {
        console.error('Error updating category:', error);
      }
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedName('');
    setEditedCode('');
  };

  const openDialog = (id: string) => {
    setCategoryToDelete(id);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (categoryToDelete) {
      try {
        const response = await fetch(`${env.BACKEND_API_URL}/api/v1/finance/delete-income-category/${categoryToDelete}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        if (response.ok) {
          fetchCategories(); // Refresh categories after deletion
        } else {
          console.error('Error deleting category');
        }
      } catch (error) {
        console.error('Error deleting category:', error);
      } finally {
        setIsDialogOpen(false);
        setCategoryToDelete(null);
      }
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col items-center pt-20">
      <Card className="w-128">
        <CardContent className="p-6">

          <CardHeader className="px-0">
            <CardTitle className="text-2xl font-semibold text-center">
              Manage Income Categories
            </CardTitle>
          </CardHeader>

          {/* Categories Table */}
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse mb-6">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">#</th>
                  <th className="border p-2">Category</th>
                  <th className="border p-2">Code</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category, index) => (
                  <tr key={category.id} className="text-center">
                    <td className="border p-2">{index + 1}</td>
                    <td className="border p-2">
                      {editingId === category.id ? (
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="border p-1 rounded-md w-full"
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
                          className="border p-1 rounded-md w-full"
                        />
                      ) : (
                        category.code
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
                            onClick={() => openDialog(category.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 flex items-center"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <DialogBox
        isOpen={isDialogOpen}
        title="Confirm Deletion"
        message="Are you sure you want to delete this category? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setIsDialogOpen(false)}
      />
    </div>
  );
};

export default CategoryManager;