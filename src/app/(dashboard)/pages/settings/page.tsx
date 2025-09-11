"use client";
import React, { useState, useEffect } from 'react';
import { Save, Camera, MapPin, User, Hash, Mail, Phone, Loader2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getSupabase } from '@/lib/supabaseClient';

// API base URL - using Next.js environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4210/api/v1';

// Safely join base URL and path
const buildApiUrl = (path: string) => {
  const base = API_BASE_URL.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
};

// Interfaces
interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
  status?: {
    returnCode: string;
    returnMessage: string;
  };
}

interface BusinessSettingsResponse {
  id: string;
  businessName: string;
  businessTagLine: string;
  photo: string;
  location: string;
  tin: string;
  email: string;
  telephone: string;
  currency: string;
}

interface BusinessSettings {
  id?: string;
  businessName: string;
  businessTagLine: string;
  photo: string;
  location: string;
  tin: string;
  email: string;
  telephone: string;
  currency: string;
}

interface FormErrors {
  businessName?: string;
  email?: string;
  telephone?: string;
  tin?: string;
  photo?: string;
}

const initialData: BusinessSettings = {
  businessName: '',
  businessTagLine: '',
  photo: '',
  location: '',
  tin: '',
  email: '',
  telephone: '',
  currency: 'UGX',
};

const currencies = [
  { code: 'UGX', name: 'UGX Shillings' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'TZS', name: 'Tanzanian Shilling' },
  { code: 'RWF', name: 'Rwandan Franc' },
];

const SettingsView: React.FC = () => {
  const router = useRouter();
  
  // Form state
  const [form, setForm] = useState<BusinessSettings>(initialData);
  const [errors, setErrors] = useState<FormErrors>({});
  
  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [apiError, setApiError] = useState<string>('');
  
  // Helper function to get image URL is defined later in the component

  // Validate form fields
  const validateField = (name: keyof BusinessSettings, value: string | undefined | null): string => {
    switch (name) {
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !value ? 'Email is required' : 
               !emailRegex.test(value) ? 'Invalid email format' : '';
      }
      
      case 'telephone': {
        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        return !value ? 'Phone number is required' :
               !phoneRegex.test(value) ? 'Invalid phone number format' : '';
      }
      
      case 'tin': {
        return !value ? 'TIN is required' :
               value.length < 10 ? 'TIN should be at least 10 characters' : '';
      }
      
      case 'businessName': {
        return !value ? 'Business name is required' :
               value.length < 3 ? 'Business name is too short' : '';
      }
      
      default: {
        return !value ? `${name} is required` : '';
      }
    }
  };

  // Handle input changes is defined later in the component

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, photo: 'Please upload an image file' }));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, photo: 'File size should be less than 5MB' }));
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    setPhotoFile(file);

    // Clear any previous errors
    if (errors.photo) {
      setErrors(prev => ({ ...prev, photo: undefined }));
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shopsettings-photos/photos/${path}`;
  };

  // Upload photo directly to Supabase storage
  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `business_${timestamp}.${fileExt}`;
      
      console.log('Uploading photo to Supabase:', fileName);
      
      // Upload directly to Supabase Storage
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }
      const { data, error } = await supabase.storage
        .from('shopsettings-photos')
        .upload(`photos/${fileName}`, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Supabase upload error: ${error.message}`);
      }
      
      if (!data?.path) {
        throw new Error('No file path returned from Supabase');
      }
      
      console.log('Photo uploaded successfully:', data.path);
      
      // Return just the filename to store in DB
      return fileName;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo. Please try again.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const newErrors: FormErrors = {};
    if (!form.businessName.trim()) newErrors.businessName = 'Business name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Email is invalid';
    if (!form.telephone.trim()) newErrors.telephone = 'Telephone is required';
    if (!form.tin.trim()) newErrors.tin = 'TIN is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);
      setApiError('');
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/signin');
        return;
      }

      // Upload photo if a new one was selected
      let photoUrl = form.photo;
      if (photoFile) {
        console.log('Uploading new photo...');
        const uploadedUrl = await uploadPhoto(photoFile);
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
          console.log('Photo uploaded successfully:', uploadedUrl);
          toast.success('Photo uploaded successfully!', {
            duration: 2000,
            position: 'bottom-right',
          });
        } else {
          throw new Error('Failed to upload photo');
        }
      }

      // Prepare data for API
      const dataToSave = {
        ...form,
        photo: photoUrl,
      };

      // Save settings using fetch
      const saveUrl = buildApiUrl('/settings/business');
      console.log('Saving settings to:', saveUrl);
      
      // Try PUT first (update existing), fallback to POST (create new)
      let response = await fetch(saveUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSave),
      });

      // If PUT fails with 404, try POST to create new settings
      if (!response.ok && response.status === 404) {
        console.log('Settings not found, creating new settings with POST');
        response = await fetch(saveUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(dataToSave),
        });
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP error! status: ${response.status} body: ${errorText}`);
      }

      const result: ApiResponse<BusinessSettingsResponse> = await response.json();

      if (result?.data) {
        setForm(prev => ({
          ...prev,
          ...result.data,
        }));

        // Show success toast notification
        toast.success('Settings saved successfully!', {
          duration: 4000,
          position: 'bottom-right',
          style: {
            background: '#10B981',
            color: 'white',
            fontWeight: '500',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
          },
          icon: '✅',
        });
      }

    } catch (error) {
      console.error('Error saving settings:', error);
      setApiError('Failed to save settings. Please try again.');
      
      // Show error toast notification
      toast.error('Failed to save settings. Please try again.', {
        duration: 4000,
        position: 'bottom-right',
        style: {
          background: '#EF4444',
          color: 'white',
          fontWeight: '500',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)',
        },
        icon: '❌',
      });
    } finally {
      setSaving(false);
    }
  };

  // Fetch existing settings on component mount
  useEffect(() => {
    // Fetch settings when component mounts
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        if (!token) {
          router.push('/signin');
          return;
        }

        const fetchUrl = buildApiUrl('/settings/business');
        console.log('Fetching settings from:', fetchUrl);
        const response = await fetch(fetchUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            // No settings found - this is normal for first-time users
            console.log('No business settings found - using default values');
            setForm(initialData);
            return;
          }
          const errorText = await response.text().catch(() => '');
          throw new Error(`HTTP error! status: ${response.status} body: ${errorText}`);
        }

        const result: ApiResponse<BusinessSettingsResponse> = await response.json();
        
        if (result?.data) {
          setForm({
            ...initialData,
            ...result.data,
          });
        } else {
          // No data in response - use defaults
          setForm(initialData);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        // Don't show error toast for 404 - it's normal for first-time users
        if (error instanceof Error && !error.message.includes('404')) {
          toast.error('Failed to load settings', {
            duration: 4000,
            position: 'bottom-right',
            style: {
              background: '#EF4444',
              color: 'white',
              fontWeight: '500',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)',
            },
            icon: '❌',
          });
        }
        // Use default values on any error
        setForm(initialData);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [router]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, files } = e.target as HTMLInputElement;
    
    if (name === 'photo' && files && files[0]) {
      const file = files[0];
      
      // Show preview
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Set file for upload
      setPhotoFile(file);
      
      // Clear any previous errors
      if (errors.photo) {
        setErrors(prev => ({
          ...prev,
          photo: ''
        }));
      }
    } else {
      setForm(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Clear error when user types
      if (errors[name as keyof FormErrors]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Business Settings</h1>
        <p className="text-muted-foreground">
          Configure your business information, logo, and preferences. This information will be used throughout the system.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Logo Upload Section */}
        <div className="glass p-6 rounded-2xl border border-border/50">
          <h2 className="text-lg font-semibold mb-4">Business Logo</h2>
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border/50 bg-background/50 relative group overflow-hidden">
                {uploading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-background/80">
                    <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
                    <span className="text-xs text-muted-foreground text-center">Uploading...</span>
                  </div>
                ) : photoPreview ? (
                  <Image src={photoPreview} alt="Preview" width={128} height={128} className="w-full h-full object-cover" />
                ) : form.photo ? (
                  <Image src={getImageUrl(form.photo)} alt="Business Logo" width={128} height={128} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <Camera className="w-6 h-6 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground text-center">Upload Logo</span>
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center cursor-pointer">
                  <input
                    type="file"
                    id="photo"
                    name="photo"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleChange}
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">Upload your business logo</p>
              <p className="text-xs mt-1">Recommended size: 500x500px, Max size: 2MB</p>
              <p className="text-xs">JPG, PNG, or SVG</p>
            </div>
          </div>
        </div>
        
        {/* Business Information Section */}
        <div className="glass p-6 rounded-2xl border border-border/50">
          <h2 className="text-lg font-semibold mb-6">Business Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label htmlFor="businessName" className="text-sm font-medium text-muted-foreground">Business Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  id="businessName"
                  name="businessName"
                  value={form.businessName}
                  onChange={handleChange}
                  className="pl-10 pr-4 py-2 w-full glass rounded-xl border border-border/20 focus:ring-2 focus:ring-primary/30 transition-all duration-300"
                  placeholder="Your business name"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="businessTagLine" className="text-sm font-medium text-muted-foreground">Business Tagline</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  id="businessTagLine"
                  name="businessTagLine"
                  value={form.businessTagLine}
                  onChange={handleChange}
                  className="pl-10 pr-4 py-2 w-full glass rounded-xl border border-border/20 focus:ring-2 focus:ring-primary/30 transition-all duration-300"
                  placeholder="Your business tagline"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" /> Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full glass rounded-xl border border-border/50 px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-sm placeholder:text-muted-foreground"
                placeholder="Enter email address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" /> Telephone
              </label>
              <input
                type="tel"
                name="telephone"
                value={form.telephone}
                onChange={handleChange}
                className="w-full glass rounded-xl border border-border/50 px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-sm placeholder:text-muted-foreground"
                placeholder="Enter telephone number"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" /> Location
              </label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                className="w-full glass rounded-xl border border-border/50 px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-sm placeholder:text-muted-foreground"
                placeholder="Enter location"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" /> TIN (Tax Identification Number)
              </label>
              <input
                type="text"
                name="tin"
                value={form.tin}
                onChange={handleChange}
                className="w-full glass rounded-xl border border-border/50 px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-sm placeholder:text-muted-foreground"
                placeholder="Enter TIN number"
                required
              />
            </div>
          </div>
          
        </div>
        {/* Currency Selection */}
        <div className="glass p-6 rounded-2xl border border-border/50">
          <h2 className="text-lg font-semibold mb-4">Currency Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="currency">
                Default Currency
              </label>
              <div className="relative">
                <select
                  id="currency"
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  className="w-full glass rounded-xl border border-border/50 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all duration-300"
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.name} ({currency.code})
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                This will be used for all monetary values in the system.
              </p>
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-glow hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-60"
          disabled={saving}
        >
          <Save className="w-5 h-5" /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default SettingsView;
