"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserRound as User,
  Building2 as Building,
  MailCheck as Mail,
  PhoneCall as Phone,
  MapPinned as MapPin,
  ArrowLeftCircle as ArrowLeft,
  UserPlus2 as UserPlus,
  FileSignature as FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchApi } from '@/lib/apiConfig';

interface CreateCustomerViewProps {
  onSave: (data: any) => void;
  onCancel: () => void;
}

const CreateCustomerView = ({ onSave, onCancel }: CreateCustomerViewProps) => {
  const [customerType, setCustomerType] = useState('client');
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeChange = (type: string) => {
    setCustomerType(type);
    setFormData({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const url = `/customers`;

      // Build payload according to selected type
      const payload = {
        customerType,
        ...(customerType === 'company'
          ? {
              companyName: formData.companyName || '',
              contactPerson: formData.contactPerson || '',
              workEmail: formData.workEmail || '',
              address: formData.address || '',
              tin: formData.tin || '',
              notes: formData.notes || '',
            }
          : {
              name: formData.name || '',
              email: formData.email || '',
              phone: formData.phone || '',
              location: formData.location || '',
              notes: formData.notes || '',
            }),
      };

      const data = await fetchApi(url, {
        method: 'POST',
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        } as any,
        body: JSON.stringify(payload),
      });

      toast.success('Customer created successfully');
      // Optional: pass created data up
      try { onSave?.(data?.data || payload); } catch {}

      // Reset form
      setFormData({});
      setCustomerType('client');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  };

  const renderFormFields = (isCompany = false) => {
    const companyFields = [
      { name: 'companyName', label: 'Company Name', icon: Building, placeholder: 'e.g., Innovate Inc.' },
      { name: 'contactPerson', label: 'Contact Person', icon: User, placeholder: 'e.g., John Doe' },
      { name: 'workEmail', label: 'Work Email', icon: Mail, type: 'email', placeholder: 'e.g., contact@innovate.com' },
      { name: 'address', label: 'Company Address', icon: MapPin, placeholder: 'e.g., 123 Innovation Drive' },
      { name: 'tin', label: 'TIN Number', icon: FileText, placeholder: 'e.g., 123-456-789-000' },
    ];

    const clientFields = [
      { name: 'name', label: 'Full Name', icon: User, placeholder: 'e.g., Sarah Johnson' },
      { name: 'email', label: 'Email Address', icon: Mail, type: 'email', placeholder: 'e.g., sarah@email.com' },
      { name: 'phone', label: 'Phone Number', icon: Phone, type: 'tel', placeholder: '+256 700 000000' },
      { name: 'location', label: 'Location', icon: MapPin, placeholder: 'e.g., Kampala, UG' },
    ];

    const fields = isCompany ? companyFields : clientFields;

    return (
      <motion.div
        key={isCompany ? 'company' : 'client'}
        variants={formVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="space-y-6"
      >
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            {isCompany ? 'Company Details' : 'Contact Details'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {fields.map(({ name, label, icon: Icon, type = 'text', placeholder }) => (
              <div key={name} className="space-y-2">
                <label htmlFor={name} className="text-sm font-medium text-muted-foreground">{label}</label>
                <div className="relative flex items-center">
                  <Icon className="absolute left-3 text-muted-foreground w-4 h-4" />
                  <input
                    type={type}
                    id={name}
                    name={name}
                    value={formData[name] || ''}
                    onChange={handleChange}
                    className="pl-10 pr-4 py-2 w-full glass rounded-xl border border-border/20 focus:ring-2 focus:ring-primary/30 transition-all duration-300"
                    placeholder={placeholder}
                    required={name.includes('Name') || name.includes('Email')}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {!isCompany && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Additional Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium text-muted-foreground">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
                  className="w-full glass rounded-xl border border-border/20 px-4 py-2 focus:ring-2 focus:ring-primary/30 transition-all duration-300"
                  placeholder="Any special notes about this customer"
                />
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Create New Customer
          </h1>
          <p className="text-muted-foreground mt-1">Add a new client or company to your database.</p>
        </div>
        <motion.button
          onClick={onCancel}
          whileHover={{ scale: 1.05 }}
          className="bg-secondary text-white px-5 py-2.5 rounded-xl transition-all duration-300 flex items-center space-x-2 text-sm shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </motion.button>
      </div>

      <div className="glass rounded-2xl border-2 border-border/50 shadow-lg p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl bg-secondary/20 p-1 max-w-sm">
            <div className="grid grid-cols-2 rounded-lg bg-white/40">
              <button
                type="button"
                onClick={() => handleTypeChange('client')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  customerType === 'client' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'text-foreground'
                }`}
              >
                Client
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('company')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  customerType === 'company' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'text-foreground'
                }`}
              >
                Company
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {renderFormFields(customerType === 'company')}
          </AnimatePresence>

          <div className="flex justify-end pt-4">
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl transition-all duration-300 flex items-center space-x-2 font-bold shadow disabled:opacity-60"
            >
              <UserPlus className="w-5 h-5" />
              <span>{isSubmitting ? 'Creating…' : 'Create Customer'}</span>
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

// Page component that wraps the CreateCustomerView
export default function CreateCustomerPage() {
  const handleSave = (data: any) => {
    console.log('Customer data saved:', data);
    // Handle save logic here
  };

  const handleCancel = () => {
    console.log('Create customer cancelled');
    // Handle cancel logic here
  };

  return <CreateCustomerView onSave={handleSave} onCancel={handleCancel} />;
}
