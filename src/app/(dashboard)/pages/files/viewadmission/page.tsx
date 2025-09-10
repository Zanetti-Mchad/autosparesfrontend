'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { Phone, Mail, Globe, Facebook, Search, Download, Printer } from 'lucide-react';

interface FormSectionProps {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ title, isOpen, onToggle, children }) => {
    return (
        <div className="border rounded-lg overflow-hidden mb-4">
            <button 
                onClick={onToggle}
                className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 focus:outline-none flex justify-between items-center"
            >
                <span className="text-lg font-semibold">{title}</span>
                <span className="transform transition-transform duration-200 text-xl">
                    {isOpen ? '−' : '+'}
                </span>
            </button>
            {isOpen && (
                <div className="p-4 border-t">
                    {children}
                </div>
            )}
        </div>
    );
};

const ViewAdmission = () => {
    const [openSection, setOpenSection] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAdmission, setSelectedAdmission] = useState(null);

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? '' : section);
    };

    // Mock function for handling search
    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Implement search logic here
        console.log('Searching for:', searchQuery);
    };

    // Mock function for handling print
    const handlePrint = () => {
        window.print();
    };

    // Mock function for handling download
    const handleDownload = () => {
        // Implement download logic here
        console.log('Downloading admission form');
    };

    return (
        <div className="max-w-5xl mx-auto p-4 bg-white">
            {/* Search and Actions Bar */}
            <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                <form onSubmit={handleSearch} className="flex-1 w-full md:w-auto">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by name, admission number, or date..."
                            className="w-full px-4 py-2 border rounded-lg pr-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
                    </div>
                </form>
                
                <div className="flex gap-2">
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        <Printer size={20} />
                        Print
                    </button>
                    <button 
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                        <Download size={20} />
                        Download
                    </button>
                </div>
            </div>

            {/* Use the same FormSection components as in the admission form */}
            <div className="space-y-4">
                <FormSection 
                    title="ADMISSION DETAILS" 
                    isOpen={openSection === 'details'} 
                    onToggle={() => toggleSection('details')}
                >
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="font-semibold">Admission Number:</p>
                            <p>RDJS001</p>
                        </div>
                        <div>
                            <p className="font-semibold">School Pay Code:</p>
                            <p>12345</p>
                        </div>
                        <div>
                            <p className="font-semibold">Admission Date:</p>
                            <p>2024-02-15</p>
                        </div>
                        <div>
                            <p className="font-semibold">Term:</p>
                            <p>Term 1</p>
                        </div>
                        <div>
                            <p className="font-semibold">Academic Year:</p>
                            <p>2024</p>
                        </div>
                        <div>
                            <p className="font-semibold">Class:</p>
                            <p>Primary 3</p>
                        </div>
                        <div>
                            <p className="font-semibold">Stream:</p>
                            <p>Yellow</p>
                        </div>
                        <div>
                            <p className="font-semibold">Status:</p>
                            <p>Active</p>
                        </div>
                    </div>
                </FormSection>
                
                {/* Reuse other sections from admission form */}
                <FormSection 
                    title="STUDENT INFORMATION" 
                    isOpen={openSection === 'student'} 
                    onToggle={() => toggleSection('student')}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="font-semibold">First Name:</p>
                            <p>John</p>
                        </div>
                        <div>
                            <p className="font-semibold">Middle Name:</p>
                            <p>Peter</p>
                        </div>
                        <div>
                            <p className="font-semibold">Last Name:</p>
                            <p>Doe</p>
                        </div>
                        <div>
                            <p className="font-semibold">LIN Number:</p>
                            <p>LIN2024001</p>
                        </div>
                        <div>
                            <p className="font-semibold">Date of Birth:</p>
                            <p>2016-05-15</p>
                        </div>
                        <div>
                            <p className="font-semibold">Age:</p>
                            <p>7 years</p>
                        </div>
                        <div>
                            <p className="font-semibold">Previous School:</p>
                            <p>Sunshine Primary School</p>
                        </div>
                        <div>
                            <p className="font-semibold">Current Class:</p>
                            <p>Primary 3</p>
                        </div>
                        <div>
                            <p className="font-semibold">Birth Position:</p>
                            <p>Second</p>
                        </div>
                        <div>
                            <p className="font-semibold">Siblings:</p>
                            <p>Brothers: 2, Sisters: 1</p>
                        </div>
                        <div>
                            <p className="font-semibold">Religion:</p>
                            <p>Christianity / Catholic</p>
                        </div>
                        <div className="col-span-2">
                            <h4 className="font-semibold mb-2">Residential Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="font-semibold">Zone:</p>
                                    <p>Central Zone</p>
                                </div>
                                <div>
                                    <p className="font-semibold">Sub County:</p>
                                    <p>Wakiso</p>
                                </div>
                                <div>
                                    <p className="font-semibold">District:</p>
                                    <p>Kampala</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </FormSection>

                <FormSection 
                    title="HEALTH RECORDS" 
                    isOpen={openSection === 'health'} 
                    onToggle={() => toggleSection('health')}
                >
                    <div>
                        {/* Health records content will go here */}
                    </div>
                </FormSection>

                <FormSection 
                    title="ACADEMIC INFORMATION" 
                    isOpen={openSection === 'academic'} 
                    onToggle={() => toggleSection('academic')}
                >
                    <div>
                        {/* Academic information content will go here */}
                    </div>
                </FormSection>

                <FormSection 
                    title="DOCUMENTS" 
                    isOpen={openSection === 'documents'} 
                    onToggle={() => toggleSection('documents')}
                >
                    {/* Add documents content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border p-4 rounded">
                            <h4 className="font-medium mb-2">Parent/Guardian IDs</h4>
                            {/* Add document preview/download options */}
                        </div>
                        <div className="border p-4 rounded">
                            <h4 className="font-medium mb-2">Student Photos</h4>
                            {/* Add photo preview */}
                        </div>
                    </div>
                </FormSection>
            </div>
        </div>
    );
};

export default ViewAdmission;