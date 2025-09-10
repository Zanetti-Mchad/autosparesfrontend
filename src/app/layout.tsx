"use client";
import { Inter } from "next/font/google";
import "./globals.css";
import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Search, User, Settings, LogOut, Package, 
  Users, FileText, Bell, ShoppingCart,
  Home, Zap, ChevronRight, ChevronDown,
  Phone, ExternalLink, Mail
} from 'lucide-react';
import Menu from '@/components/Menu';
import { Toaster } from "react-hot-toast";
import dynamic from "next/dynamic";

const ApiDebuggerInitializer = dynamic(
  () => import("../components/ApiDebuggerInitializer"),
  { ssr: false }
);

const inter = Inter({ subsets: ["latin"] });

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

const LogoutDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const router = useRouter();
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="glass rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Log Out</h3>
          <p className="text-muted-foreground mb-6">Are you sure you want to log out?</p>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 glass rounded-xl text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('user');
                localStorage.removeItem('accessToken');
                router.push('/sign-in');
              }}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:shadow-glow transition-all"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(pathname || '/');
  const [userData, setUserData] = useState<{
    firstName: string;
    lastName?: string;
    name?: string;
    email: string;
    role?: {
      name: string;
    };
    photo?: string;
  } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [businessName, setBusinessName] = useState<string>('');
  const [businessTagLine, setBusinessTagLine] = useState<string>('');
  const [businessLogo, setBusinessLogo] = useState<string>('');
  const [isBusinessLoading, setIsBusinessLoading] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{name: string, path: string, icon: React.ElementType}>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [stockAlertsCount, setStockAlertsCount] = useState(0);

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

      console.log('🔄 Layout: Fetching stock alerts count...');
      const response = await fetch(buildApiUrl('/inventory/stock-alerts'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📊 Layout: Stock alerts response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📊 Layout: Stock alerts API response:', result);
        
        if (result.status?.returnCode === 200 && result.data?.totalAlerts !== undefined) {
          console.log('✅ Layout: Using totalAlerts:', result.data.totalAlerts);
          setStockAlertsCount(result.data.totalAlerts);
        } else if (result.data?.alerts) {
          console.log('✅ Layout: Using alerts array length:', result.data.alerts.length);
          setStockAlertsCount(result.data.alerts.length);
        } else {
          console.log('⚠️ Layout: No stock alerts data found, setting count to 0');
          setStockAlertsCount(0);
        }
      } else {
        console.log('❌ Layout: Stock alerts API failed:', response.status);
        setStockAlertsCount(0);
      }
    } catch (error) {
      console.error('❌ Layout: Error fetching stock alerts count:', error);
      setStockAlertsCount(0);
    }
  };

  // Get user data from localStorage and database
  useEffect(() => {
    const loadUserData = async () => {
      setIsLoaded(true);
      
      try {
        const userDataStr = localStorage.getItem('user');
        if (!userDataStr) {
          router.push('/sign-in');
          return;
        }
        
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
  }, [router]);

  // Fetch business settings from database
  useEffect(() => {
    const fetchBusinessSettings = async () => {
      try {
        setIsBusinessLoading(true);
        const token = localStorage.getItem('accessToken');
        if (!token) {
          // If no token, use empty values
          setIsBusinessLoading(false);
          return;
        }

        const fetchUrl = buildApiUrl('/settings/business');
        console.log('Layout: Fetching business settings from:', fetchUrl);
        
        const response = await fetch(fetchUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            console.log('Layout: No business settings found - using empty values');
          } else {
            console.warn('Layout: Failed to fetch business settings, using empty values');
          }
          setIsBusinessLoading(false);
          return;
        }

        const result: ApiResponse<BusinessSettingsResponse> = await response.json();
        
        console.log('Layout: Business settings API response:', result);
        
        if (result?.data) {
          // Use the actual saved data from database
          console.log('Layout: Setting business data:', {
            name: result.data.businessName,
            tagline: result.data.businessTagLine,
            photo: result.data.photo
          });
          setBusinessName(result.data.businessName || '');
          setBusinessTagLine(result.data.businessTagLine || '');
          setBusinessLogo(result.data.photo || '');
        } else {
          // If no data returned, set empty strings
          console.log('Layout: No business data found in API response');
          setBusinessName('');
          setBusinessTagLine('');
          setBusinessLogo('');
        }
      } catch (error) {
        console.error('Layout: Error fetching business settings:', error);
        // Use empty values on error
      } finally {
        setIsBusinessLoading(false);
      }
    };

    fetchBusinessSettings();
  }, []);

  // Fetch stock alerts count on component mount
  useEffect(() => {
    fetchStockAlertsCount();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (term.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
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
    setActiveTab(path);
  };

  const isAuthPage = pathname ? ['/sign-in', '/register', '/forgot-password', '/reset-password'].includes(pathname) : false;

  if (isAuthPage) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </head>
      <body className={`${inter.className} bg-gray-50`}>
        <ApiDebuggerInitializer />
        <Toaster position="top-right" />
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-fuchsia-50 to-pink-50 p-4">
            {children}
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className={`${inter.className} bg-background text-foreground`}>
        <ApiDebuggerInitializer />
        <Toaster position="top-right" />
        
        <div className="min-h-screen bg-background text-foreground flex flex-col">
          <LogoutDialog isOpen={showLogoutDialog} onClose={() => setShowLogoutDialog(false)} />
          
          <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
            <div className="flex items-center justify-between px-4 md:px-8 py-4">
              <div className="flex items-center space-x-4 md:space-x-6">
                {/* Mobile menu button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className={`md:hidden p-3 rounded-xl transition-all duration-200 border ${
                    isMobileMenuOpen 
                      ? 'bg-primary/20 border-primary/40' 
                      : 'bg-primary/10 hover:bg-primary/20 border-primary/20'
                  }`}
                  aria-label="Toggle menu"
                >
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                {!isBusinessLoading && businessName && (
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow floating overflow-hidden">
                      {businessLogo ? (
                        <Image src={getImageUrl(businessLogo)} alt="Logo" width={48} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-xl">{businessName.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-800">
                        {businessName}
                      </h1>
                      {businessTagLine && (
                        <p className="text-xs text-gray-600 font-medium">{businessTagLine}</p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="relative group hidden md:block">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search menu..."
                    value={searchTerm}
                    onChange={handleSearch}
                    onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                    onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                    className="pl-12 pr-6 py-3 w-96 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 focus:bg-white transition-all duration-300 text-sm placeholder:text-gray-400"
                  />
                  
                  {showSearchResults && (
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
              
              <div className="flex items-center space-x-4">
                <button 
                  className="relative p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group"
                  onClick={() => router.push('/admin')}
                  title={`${stockAlertsCount} stock alerts`}
                >
                  <Bell className="w-5 h-5" />
                  {stockAlertsCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {stockAlertsCount}
                    </div>
                  )}
                </button>
                
                <div className="relative group">
                  <button className="flex items-center space-x-3 bg-gray-50 border border-gray-200 rounded-2xl p-2 pr-3 hover:bg-gray-100 hover:shadow-md transition-all duration-300 outline-none focus:outline-none">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center overflow-hidden">
                      {userData?.photo ? (
                        <Image 
                          src={getImageUrl(userData.photo)} 
                          alt={`${userData.firstName} ${userData.lastName || ''}`}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-800">
                        {userData ? (userData.name || `${userData.firstName} ${userData.lastName || ''}`).trim() : 'Loading...'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {typeof userData?.role === 'string' 
                          ? userData.role 
                          : userData?.role?.name || 'User'}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500 transition-transform duration-200 group-hover:rotate-180" />
                  </button>
                  <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg py-1 z-50 hidden group-hover:block">
                    <Link href="/pages/profile" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </div>
                    </Link>
                    <button 
                      onClick={() => setShowLogoutDialog(true)}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="flex relative">
            {/* Mobile overlay */}
            {isMobileMenuOpen && (
              <div 
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
            )}
            
            {/* Sidebar */}
            <aside className={`fixed md:relative top-0 left-0 z-50 md:z-auto w-72 sm:w-80 md:w-80 bg-white md:glass border-r border-border/50 min-h-screen transition-all duration-300 transform shadow-xl md:shadow-none ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}>
              {/* Mobile close button and company branding */}
              <div className="md:hidden flex items-center justify-between p-4 border-b border-border/50">
                {!isBusinessLoading && businessName && (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow floating overflow-hidden">
                      {businessLogo ? (
                        <Image src={getImageUrl(businessLogo)} alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
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
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              
              <nav className="p-4 sm:p-6">
                <Menu />
              </nav>
            </aside>

            <main className="flex-1 p-4 md:p-8">
            {children}
            </main>
          </div>
          
          <footer className="w-full flex justify-center items-center py-5 px-2 bg-transparent">
            <div className="bg-white rounded-full shadow-lg border border-gray-200 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 py-4 px-6 md:px-10">
                <Link href="tel:0782651854" className="flex items-center gap-2 text-sm md:text-base text-gray-700 hover:text-blue-600 transition-colors">
                  <Phone className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                  0782651854
                </Link>
              <span className="hidden md:inline text-gray-300">|</span>
              <Link href="https://www.digentechnology.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm md:text-base text-gray-700 hover:text-blue-600 transition-colors">
                <ExternalLink className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                www.digentechnology.com
              </Link>
              <span className="hidden md:inline text-gray-300">|</span>
              <Link href="mailto:info@digentechnology.com" className="flex items-center gap-2 text-sm md:text-base text-gray-700 hover:text-blue-600 transition-colors">
                <Mail className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                info@digentechnology.com
              </Link>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
