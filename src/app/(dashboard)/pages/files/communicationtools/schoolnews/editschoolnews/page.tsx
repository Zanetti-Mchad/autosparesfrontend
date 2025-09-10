'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { env } from '@/env';

interface New {
  id: number;
  title: string;
  content: string;
  image: string;
  isEditing: boolean;
}

const EditNew = () => {
  const [News, setNews] = useState<New[]>([
    {
      id: 1,
      title: "Welcome Back to School!",
      content: "As we embark on another exciting academic year, let's embrace the opportunities that lie ahead...",
      image: "/school-images.webp",
      isEditing: false
    }
  ]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, id: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        setNews(News.map(New =>
          New.id === id ? { ...New, image: (event.target?.result as string) || New.image } : New
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleEdit = (id: number) => {
    setNews(News.map(New => {
      if (New.id === id) {
        if (New.isEditing) {
          alert('Changes saved!');
        }
        return { ...New, isEditing: !New.isEditing };
      }
      return New;
    }));
  };

  const deleteNew = (id: number) => {
    if (window.confirm('Are you sure you want to delete this New?')) {
      setNews(News.filter(New => New.id !== id));
      alert('New deleted!');
    }
  };

  const updateField = (id: number, field: keyof New, value: string) => {
    setNews(News.map(New =>
      New.id === id ? { ...New, [field]: value } : New
    ));
  };

  return (
    <div className="bg-gray-100 p-8">
      <div className="container mx-auto max-w-full">
        <Image
          src="/richdadjrschool-logo.png"
          alt="Logo"
          width={112}
          height={112}
          className="object-cover"
          priority
        />

        <h1 className="text-3xl font-bold mb-8 text-center">Edit School New</h1>
        <div className="bg-white shadow-lg rounded-lg p-6 space-y-4">
          {News.map(New => (
            <div key={New.id} id={`row-${New.id}`} 
                 className="p-4 bg-gray-50 rounded-md shadow flex justify-between items-start border border-gray-300">
              <div className="flex items-center space-x-4 w-full">
                <div className="relative border border-gray-300 p-1 rounded-md">
                  <Image
          src="/richdadjrschool-logo.png"
          alt="Logo"
          width={112}
          height={112}
          className="object-cover"
          priority
        />
                  {New.isEditing && (
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute top-0 left-0 opacity-0 h-full w-full cursor-pointer"
                      onChange={(e) => handleImageChange(e, New.id)}
                    />
                  )}
                </div>

                <div className="flex-grow space-y-2">
                  <input
                    type="text"
                    className={`font-semibold text-lg p-2 bg-transparent focus:ring-0 w-full 
                              ${New.isEditing ? 'border border-blue-400 rounded-md' : 'border-none'}`}
                    value={New.title}
                    disabled={!New.isEditing}
                    onChange={(e) => updateField(New.id, 'title', e.target.value)}
                  />
                  <textarea
                    className={`text-sm text-gray-700 p-2 bg-transparent focus:ring-0 resize-none w-full
                              ${New.isEditing ? 'border border-blue-400 rounded-md' : 'border-none'}`}
                    value={New.content}
                    disabled={!New.isEditing}
                    onChange={(e) => updateField(New.id, 'content', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 mt-12 ml-2">
                <button
                  onClick={() => toggleEdit(New.id)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md"
                >
                  {New.isEditing ? 'Save' : 'Edit'}
                </button>
                {!New.isEditing && (
                  <button
                    onClick={() => deleteNew(New.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EditNew;