'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { env } from '@/env'

interface CategoryFormProps {
  onSubmit: (category: string) => void
}

const CategoryForm = ({ onSubmit }: CategoryFormProps) => {
  const [category, setCategory] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (category.trim()) {
      onSubmit(category.trim())
      setCategory('')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Category Name
        </label>
        <input
          type="text"
          id="category"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter category name"
          required
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Add Category
        </button>
      </div>
    </form>
  )
}

interface CategoryCardProps {
  category: string
  onEdit: () => void
  onDelete: () => void
}

const CategoryCard = ({ category, onEdit, onDelete }: CategoryCardProps) => (
  <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md hover:bg-gray-50 transition duration-300 border border-gray-200">
    <span className="text-lg font-semibold text-gray-800">{category}</span>
    <div>
      <button
        onClick={onEdit}
        className="text-blue-500 hover:text-blue-700 ml-4 focus:outline-none"
      >
        Edit
      </button>
      <button
        onClick={onDelete}
        className="text-red-500 hover:text-red-700 ml-4 focus:outline-none"
      >
        Delete
      </button>
    </div>
  </div>
)

export default function ManageCategories() {
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    const storedCategories = localStorage.getItem('categories')
    if (storedCategories) {
      setCategories(JSON.parse(storedCategories))
    }
  }, [])

  const saveCategories = (newCategories: string[]) => {
    localStorage.setItem('categories', JSON.stringify(newCategories))
    setCategories(newCategories)
  }

  const handleAddCategory = (newCategory: string) => {
    saveCategories([...categories, newCategory])
  }

  const handleEditCategory = (index: number) => {
    const newCategoryName = prompt('Edit category name:', categories[index])
    if (newCategoryName?.trim()) {
      const newCategories = [...categories]
      newCategories[index] = newCategoryName.trim()
      saveCategories(newCategories)
    }
  }

  const handleDeleteCategory = (index: number) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      const newCategories = categories.filter((_, i) => i !== index)
      saveCategories(newCategories)
    }
  }

  return (
    <div 
      className="bg-gray-100 min-h-screen flex items-center justify-center p-6" 
      style={{ backgroundImage: "url('/login-bg.png')" }}
    >
      <div className="container mx-auto max-w-lg bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-center mb-4">
          <Image
            src="/richdadjrschool-logo.png"
            alt="School Logo"
            width={80}
            height={80}
            priority
          />
        </div>

        <h2 className="text-2xl font-bold mb-4 text-center">
          Add New Category For School News
        </h2>

        <CategoryForm onSubmit={handleAddCategory} />

        <h3 className="text-xl font-bold mt-6 mb-4">Categories</h3>
        <div className="space-y-4">
          {categories.map((category, index) => (
            <CategoryCard
              key={`${category}-${index}`}
              category={category}
              onEdit={() => handleEditCategory(index)}
              onDelete={() => handleDeleteCategory(index)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}