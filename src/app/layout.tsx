"use client";
import { Inter } from "next/font/google";
import "./globals.css";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Search, User, Settings, LogOut, Package, 
  Users, FileText, Bell, ShoppingCart,
  Home, Zap, ChevronRight, ChevronDown, ArrowUp,
  Phone, ExternalLink, Mail, AlertTriangle
} from 'lucide-react';
import Menu from '@/components/Menu';
import { Toaster } from "react-hot-toast";
import dynamic from "next/dynamic";
import { buildApiUrl } from "@/lib/apiConfig";

const ApiDebuggerInitializer = dynamic(
  () => import("../components/ApiDebuggerInitializer"),
  { ssr: false }
);

const inter = Inter({ subsets: ["latin"] });

// Using shared buildApiUrl from apiConfig ensures Railway backend is used by default

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

// Business logo / settings photos
const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shopsettings-photos/photos/${path}`;
};

// Staff profile photos (same bucket as Users table)
const getStaffPhotoUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/shopstaff-photos/${path}`;
};

const LogoutDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const router = useRouter();
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Log Out</h3>
          <p className="text-muted-foreground mb-6">Are you sure you want to log out?</p>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 rounded-xl text-foreground hover:bg-gray-200 transition-colors"
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
  const [navAlerts, setNavAlerts] = useState<Array<{
    type: string;
    severity: string;
    message: string;
    refId?: string;
    meta?: { name?: string; quantity?: number; minStock?: number; sku?: string };
  }>>([]);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const alertsPanelRef = useRef<HTMLDivElement>(null);

  // Close mobile drawer after navigation on small screens
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowAlertsPanel(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Function to fetch user data from database
  const fetchUserData = async (userId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return null;

      const response = await fetch(buildApiUrl(`/integration/users/${userId}`), {
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

  // Live stock alerts — stay until quantity is raised above minStock (restock)
  const fetchNavAlerts = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      setAlertsLoading(true);

      const response = await fetch(buildApiUrl('/reports/alerts'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Fallback to inventory stock-alerts only
        const stockRes = await fetch(buildApiUrl('/inventory/stock-alerts'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (stockRes.ok) {
          const stockJson = await stockRes.json();
          const list = (stockJson.data?.alerts || []).map((a: any) => ({
            type: 'low_stock',
            severity: a.quantity <= 0 ? 'high' : 'medium',
            message: `${a.name} is low (${a.quantity} left${a.minQuantity != null ? `, min ${a.minQuantity}` : ''})`,
            refId: a.id,
            meta: { name: a.name, quantity: a.quantity, minStock: a.minQuantity },
          }));
          setNavAlerts(list);
        } else {
          setNavAlerts([]);
        }
        return;
      }

      const result = await response.json();
      const all = Array.isArray(result.data?.alerts) ? result.data.alerts : [];
      // Navbar focuses on stock/expiry — these only clear when stock is restocked / product renewed
      const stockAlerts = all.filter((a: { type: string }) =>
        ['low_stock', 'expired', 'expiring'].includes(a.type)
      );
      setNavAlerts(stockAlerts);
    } catch (error) {
      console.error('Error fetching nav alerts:', error);
      setNavAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  // Show local user immediately, refresh photo in background
  useEffect(() => {
    const loadUserData = async () => {
      setIsLoaded(true);

      try {
        const userDataStr = localStorage.getItem('user');
        if (!userDataStr) {
          router.push('/sign-in');
          return;
        }

        const cachedUser = JSON.parse(userDataStr);
        setUserData(cachedUser);

        const dbUserData = await fetchUserData(cachedUser.id);
        if (dbUserData) {
          setUserData(dbUserData);
          try {
            localStorage.setItem('user', JSON.stringify({ ...cachedUser, ...dbUserData }));
          } catch {
            /* ignore quota */
          }
        }
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

        const fetchUrl = buildApiUrl('/settings/view');
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

  // Refresh stock alerts on load, route change, and every 60s (clears only after restock)
  useEffect(() => {
    fetchNavAlerts();
    const id = window.setInterval(fetchNavAlerts, 60000);
    return () => window.clearInterval(id);
  }, [fetchNavAlerts, pathname]);

  // Close alerts panel when clicking outside
  useEffect(() => {
    if (!showAlertsPanel) return;
    const onDocClick = (e: MouseEvent) => {
      if (alertsPanelRef.current && !alertsPanelRef.current.contains(e.target as Node)) {
        setShowAlertsPanel(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showAlertsPanel]);

  const stockAlertsCount = navAlerts.length;

  const alertTypeLabel = (type: string) => {
    switch (type) {
      case 'low_stock': return 'Low stock';
      case 'expired': return 'Expired';
      case 'expiring': return 'Expiring soon';
      default: return type.replace(/_/g, ' ');
    }
  };

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
          
          <header className="bg-white border-b border-gray-200 z-50 shadow-sm">
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
                <div className="relative" ref={alertsPanelRef}>
                  <button 
                    type="button"
                    className="relative p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                    onClick={() => {
                      const next = !showAlertsPanel;
                      setShowAlertsPanel(next);
                      if (next) fetchNavAlerts();
                    }}
                    title={stockAlertsCount > 0 ? `${stockAlertsCount} stock alert(s)` : 'No stock alerts'}
                    aria-label="Stock alerts"
                  >
                    <Bell className="w-5 h-5" />
                    {stockAlertsCount > 0 && (
                      <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                        {stockAlertsCount > 99 ? '99+' : stockAlertsCount}
                      </div>
                    )}
                  </button>

                  {showAlertsPanel && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">Stock alerts</p>
                          <p className="text-[11px] text-gray-500">Clears only after you restock</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => fetchNavAlerts()}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Refresh
                        </button>
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {alertsLoading && !navAlerts.length ? (
                          <p className="p-4 text-sm text-gray-500">Loading alerts…</p>
                        ) : !navAlerts.length ? (
                          <div className="p-6 text-center text-sm text-gray-500">
                            <Package className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                            No low-stock alerts. Inventory looks fine.
                          </div>
                        ) : (
                          <ul className="divide-y divide-gray-100">
                            {navAlerts.map((alert, idx) => (
                              <li key={`${alert.refId || alert.message}-${idx}`}>
                                <button
                                  type="button"
                                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                                  onClick={() => {
                                    setShowAlertsPanel(false);
                                    router.push(
                                      alert.refId
                                        ? `/pages/inventory/RestockInventory`
                                        : '/pages/alerts'
                                    );
                                  }}
                                >
                                  <div className="flex gap-3">
                                    <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      alert.severity === 'high'
                                        ? 'bg-red-100 text-red-600'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      <AlertTriangle className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500">
                                        {alertTypeLabel(alert.type)}
                                      </p>
                                      <p className="text-sm text-gray-800 font-medium leading-snug">
                                        {alert.message}
                                      </p>
                                      {alert.meta?.minStock != null && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                          Min stock: {alert.meta.minStock}
                                          {alert.meta.sku ? ` · SKU ${alert.meta.sku}` : ''}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                        <Link
                          href="/pages/alerts"
                          className="text-xs text-blue-600 hover:underline"
                          onClick={() => setShowAlertsPanel(false)}
                        >
                          View all alerts →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="relative group">
                  <button className="flex items-center space-x-3 bg-gray-50 border border-gray-200 rounded-2xl p-2 pr-3 hover:bg-gray-100 hover:shadow-md transition-all duration-300 outline-none focus:outline-none">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center overflow-hidden">
                      {userData?.photo ? (
                        <Image 
                          src={getStaffPhotoUrl(userData.photo)} 
                          alt={`${userData.firstName} ${userData.lastName || ''}`}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
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
                <Menu onNavigate={() => setIsMobileMenuOpen(false)} />
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

          {showScrollTop && (
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center justify-center"
              aria-label="Scroll to top"
              title="Scroll to top"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          )}
        </div>
      </body>
    </html>
  );
}
