"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Bell, Search, Menu, User, Settings, LogOut, Home, ShoppingCart, Users, Package, FileText, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// API base URL - using Next.js environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4210/api/v1';

// Safely join base URL and path
const buildApiUrl = (path: string) => {
  const base = API_BASE_URL.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
};

// API Response interfaces
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

// Helper function to get image URL from Supabase
const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shopsettings-photos/photos/${path}`;
};

interface NavbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function Navbar({ onToggleSidebar, isSidebarOpen }: NavbarProps) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState<string>('');
  const [businessTagLine, setBusinessTagLine] = useState<string>('');
  const [businessPhoto, setBusinessPhoto] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<{
    firstName: string;
    lastName?: string;
    name?: string;
    email: string;
    role?: string | { name: string };
    photo?: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{name: string, path: string, icon: React.ElementType}>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [stockAlertsCount, setStockAlertsCount] = useState(0);

  // Menu items for search
  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: Home },
    { name: 'Orders', path: '/orders', icon: ShoppingCart },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Profile', path: '/pages/profile', icon: User },
    { name: 'Settings', path: '/pages/settings', icon: Settings },
  ];

  // Function to fetch user data from database
  const fetchUserData = async (userId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return null;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/integration/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        return result.data || result;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    return null;
  };

  // Function to fetch stock alerts count
  const fetchStockAlertsCount = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      console.log('🔄 Fetching stock alerts count...');
      const response = await fetch(buildApiUrl('/inventory/stock-alerts'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📊 Stock alerts response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📊 Stock alerts API response:', result);
        
        if (result.status?.returnCode === 200 && result.data?.totalAlerts !== undefined) {
          console.log('✅ Using totalAlerts:', result.data.totalAlerts);
          setStockAlertsCount(result.data.totalAlerts);
        } else if (result.data?.alerts) {
          console.log('✅ Using alerts array length:', result.data.alerts.length);
          setStockAlertsCount(result.data.alerts.length);
        } else {
          console.log('⚠️ No stock alerts data found, setting count to 0');
          setStockAlertsCount(0);
        }
      } else {
        console.log('❌ Stock alerts API failed:', response.status);
        setStockAlertsCount(0);
      }
    } catch (error) {
      console.error('❌ Error fetching stock alerts count:', error);
      setStockAlertsCount(0);
    }
  };

  // Get user data from localStorage and database
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDataStr = localStorage.getItem('user');
        if (!userDataStr) return;
        
        const userData = JSON.parse(userDataStr);
        
        // Try to fetch fresh data from database to get photo
        const dbUserData = await fetchUserData(userData.id);
        
        // Use database data if available, otherwise fall back to localStorage
        const finalUserData = dbUserData || userData;
        
        setUserData(finalUserData);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  // Fetch business settings from database
  useEffect(() => {
    const fetchBusinessSettings = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('accessToken');
        if (!token) {
          // If no token, use default values
          setIsLoading(false);
          return;
        }

        const fetchUrl = buildApiUrl('/settings/business');
        console.log('Fetching business settings from:', fetchUrl);
        
        const response = await fetch(fetchUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            console.log('No business settings found - using default values');
          } else {
            console.warn('Failed to fetch business settings, using defaults');
          }
          setIsLoading(false);
          return;
        }

        const result: ApiResponse<BusinessSettingsResponse> = await response.json();
        
        console.log('Business settings API response:', result);
        
        if (result?.data) {
          // Use the actual saved data from database
          console.log('Setting business data:', {
            name: result.data.businessName,
            tagline: result.data.businessTagLine,
            photo: result.data.photo
          });
          setBusinessName(result.data.businessName || '');
          setBusinessTagLine(result.data.businessTagLine || '');
          setBusinessPhoto(result.data.photo || '');
        } else {
          // If no data returned, set empty strings
          console.log('No business data found in API response');
          setBusinessName('');
          setBusinessTagLine('');
          setBusinessPhoto('');
        }
      } catch (error) {
        console.error('Error fetching business settings:', error);
        // Use default values on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessSettings();
  }, []);

  // Fetch stock alerts count on component mount
  useEffect(() => {
    fetchStockAlertsCount();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    router.push('/sign-in');
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (term.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    // Filter menu items based on search term
    const filtered = menuItems.filter(item => 
      item.name.toLowerCase().includes(term.toLowerCase())
    );
    
    setSearchResults(filtered);
    setShowSearchResults(true);
  };
  
  const handleSearchResultClick = (path: string) => {
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
    router.push(path);
  };

  return (
    <header className="sticky top-0 z-10 border-b bg-white shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <button
            onClick={onToggleSidebar}
            type="button"
            className={cn("md:hidden mr-2 inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-fuchsia-500")}
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle sidebar</span>
          </button>
          
          {/* Company Branding - Desktop Only */}
          {!isLoading && businessName && (
            <div className="hidden md:flex items-center space-x-3 mr-6">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                {businessPhoto ? (
                  <Image 
                    src={getImageUrl(businessPhoto)} 
                    alt="Logo" 
                    width={62} 
                    height={62} 
                    className="w-full h-full object-cover rounded-lg" 
                  />
                ) : (
                  <span className="text-white font-bold text-lg">{businessName.charAt(0)}</span>
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">{businessName}</h1>
                {businessTagLine && (
                  <p className="text-xs text-gray-600 font-medium">{businessTagLine}</p>
                )}
              </div>
            </div>
          )}
          
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search menu..."
              value={searchTerm}
              onChange={handleSearch}
              onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              className="w-full rounded-lg bg-gray-100 pl-10 focus-visible:ring-1 focus-visible:ring-fuchsia-500"
            />
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg max-h-80 overflow-y-auto z-50">
                <div className="p-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                    Search Results
                  </h3>
                  <div className="mt-1 space-y-1">
                    {searchResults.map((item, index) => (
                      <button
                        key={`${item.name}-${index}`}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center space-x-3 transition-colors duration-200"
                        onClick={() => handleSearchResultClick(item.path)}
                      >
                        <div className="w-6 h-6 rounded-md flex items-center justify-center bg-blue-100">
                          <item.icon className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-gray-800">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            type="button"
            className={cn("relative rounded-full p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500")}
            onClick={() => router.push('/admin')}
            title={`${stockAlertsCount} stock alerts`}
          >
            <Bell className="h-5 w-5" />
            {stockAlertsCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-fuchsia-600 text-xs text-white">
                {stockAlertsCount}
              </span>
            )}
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn("h-10 w-10 rounded-full p-0 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 overflow-hidden")}
                type="button"
              >
                {userData?.photo ? (
                  <Image 
                    src={getImageUrl(userData.photo)} 
                    alt={`${userData.firstName} ${userData.lastName || ''}`}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="mx-auto h-5 w-5" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/pages/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/pages/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
