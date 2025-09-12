"use client";
import { useState, useEffect } from "react";
import { getRole } from "@/lib/data";
import { env } from "@/env";
import Image from "next/image";
import Link from "next/link";
import { 
  Home, ShoppingCart, Users, Package, User, 
  FileText, Settings, LogOut, Bell, Search, Quote
} from 'lucide-react';

// TypeScript interfaces
interface MenuItem {
  label: string;
  href?: string;
  icon?: React.ElementType;
  visible?: string[];
  subItems?: MenuItem[];
  isDirectLink?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

// AutoSpares Menu data structure
export const menuItems: MenuSection[] = [
  {
    title: "Welcome To the New Era of Technology",
    items: [
      {
        icon: Home,
        label: "Dashboard",
        visible: ["admin", "user", "manager"],
        href: "/admin",
        isDirectLink: true
      },
        {
        icon: ShoppingCart,
        label: "Orders",
        visible: ["admin", "user", "manager"],
        subItems: [
          { label: "Create Order", visible: ["admin", "user", "manager"], href: "/pages/orders/createOrder" },
          { label: "Orders View", visible: ["admin", "user", "manager"], href: "/pages/orders/OrdersView" },
          { label: "Delete Order", visible: ["admin", "manager"], href: "/pages/orders/DeleteOrder" },
          { label: "Payments", visible: ["admin", "user", "manager"], href: "/pages/orders/payments" },
        ],
      },
      {
        icon: Quote,
        label: "Quotations",
        visible: ["admin", "user", "manager"],
        subItems: [
          { label: "Create Quote", visible: ["admin", "user", "manager"], href: "/pages/quotation/addquote/view" },
          { label: "View Quotes", visible: ["admin", "user", "manager"], href: "/pages/quotation/viewquote" },
          { label: "Delete Quote", visible: ["admin", "manager"], href: "/pages/quotation/deletequote" },
        ],
      },
      {
        icon: Users,
        label: "Customers",
        visible: ["admin", "user", "manager"],
        subItems: [
          { label: "View Customers", visible: ["admin", "user", "manager"], href: "/pages/customer/ViewCustomer" },
          { label: "Add Customer", visible: ["admin", "user", "manager"], href: "/pages/customer/CreateCustomerView" },
          { label: "Edit Customer", visible: ["admin", "manager"], href: "/pages/customer/EditCustomerView" },
          { label: "Delete Customer", visible: ["admin", "manager"], href: "/pages/customer/DeleteCustomer" },
        ],
      },
      {
        icon: Package,
        label: "Inventory",
        visible: ["admin", "user", "manager"],
        subItems: [
          { label: "Add Inventory", visible: ["admin", "user", "manager"], href: "/pages/inventory/CreateInventory" },
          { label: "Restock", visible: ["admin", "user", "manager"], href: "/pages/inventory/RestockInventory" },
          { label: "View/Edit", visible: ["admin", "user", "manager"], href: "/pages/inventory/ViewEditInventory" },
          { label: "Delete", visible: ["admin", "manager"], href: "/pages/inventory/DeleteInventory" },
          {
            label: "Categories",
            visible: ["admin", "user", "manager"],
            subItems: [
              { label: "Create Category", visible: ["admin", "user", "manager"], href: "/pages/inventory/categories/CreateCategory" },
              { label: "View/Edit Category", visible: ["admin", "user", "manager"], href: "/pages/inventory/categories/ViewEditCategory" },
              { label: "Delete Category", visible: ["admin", "manager"], href: "/pages/inventory/categories/DeleteCategory" },
            ],
          },
        ],
      },
      {
        icon: User,
        label: "Users",
        visible: ["admin"],
        subItems: [
          { label: "Add User", visible: ["admin"], href: "/pages/adduser/adduser" },
          { label: "View/Edit Users", visible: ["admin"], href: "/pages/adduser/viewedituser" },
          { label: "Delete User", visible: ["admin"], href: "/pages/adduser/deleteuser" },
        ],
      },
      {
        icon: FileText,
        label: "Reports",
        visible: ["admin", "user", "manager"],
        href: "/pages/reports",
        isDirectLink: true
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        icon: User,
        label: "Profile",
        href: "/pages/profile",
        visible: ["admin", "user", "manager"],
        isDirectLink: true
      },
      {
        icon: Settings,
        label: "Settings",
        href: "/pages/settings",
        visible: ["admin"],
        isDirectLink: true
      },
      {
        icon: LogOut,
        label: "Logout",
        href: "/logout",
        visible: ["admin", "user", "manager"],
        isDirectLink: true
      }
    ]
  }
];

const Menu = () => {
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const userRole = getRole(); // Fetch role from localStorage
    setRole(userRole);
    setIsLoading(false);
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      console.log('Logout initiated');
      
      // Get the user information from localStorage
      let userId;
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          userId = user.id;
        } else {
          userId = localStorage.getItem('userId');
        }
        console.log('Retrieved userId:', userId);
      } catch (error) {
        console.error('Error getting userId:', error);
      }
      
      const accessToken = localStorage.getItem('accessToken');
      
      // Try to call the logout API with the correct payload structure
      if (userId) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          console.log('Sending logout request with payload:', {
            userId,
            action: "LOGOUT",
            status: "SUCCESS"
          });
          
          const backendUrl = env.BACKEND_API_URL; // Use consistent environment variable
          const response = await fetch(`${backendUrl}/api/v1/logout/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              userId,
              action: "LOGOUT",
              status: "SUCCESS"
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          const data = await response.json();
          console.log('Logout API response status:', response.status);
          console.log('Logout API response data:', data);
          
          if (!response.ok) {
            console.error('Logout API error:', data);
          }
        } catch (error) {
          console.warn('API logout failed, but continuing with local logout:', error);
        }
      } else {
        console.warn('No userId found, skipping API logout');
      }

      // Clear all local storage
      console.log('Clearing local storage');
      localStorage.clear();
      sessionStorage.clear();

      // Redirect to sign-in page
      console.log('Redirecting to sign-in page');
      window.location.href = '/sign-in';
    } catch (error: any) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
      setShowLogoutDialog(false);
      alert('Failed to logout. Please try again. Error: ' + (error.message || 'Unknown error'));
    }
  };

  const toggleItem = (newPath: string) => {
    setExpandedPath((prevPath) => {
      if (prevPath === newPath) return null;
      if (prevPath && newPath.startsWith(prevPath + '.')) return newPath;
      return newPath;
    });
  };

  const isExpanded = (path: string): boolean => {
    if (!expandedPath) return false;
    return expandedPath === path || expandedPath.startsWith(path + '.');
  };

  const getHref = (item: MenuItem) => {
    // For the Dashboard menu item, return a different href based on the user's role
    if (item.label === "Dashboard") {
      switch (role) {
        case "admin":
          return "/admin";
        case "user":
          return "/user";
        case "manager":
          return "/manager";
        default:
          return "/admin";
      }
    }
    
    // For other menu items, you can either keep their original href or customize them similarly
    return item.href || "#";
  };

  const isItemVisible = (item: MenuItem) => {
    if (!item.visible) return true;
    return role ? item.visible.includes(role) : false;
  };

  const renderMenuItem = (item: MenuItem, path: string = "") => {
    const currentPath = path ? `${path}.${item.label}` : item.label;

    // First check if the item should be visible to the current role
    if (!isItemVisible(item)) {
      return null;
    }

    if (item.href && (!item.subItems || item.isDirectLink)) {
      return (
        <Link
          href={getHref(item)}
          className="flex items-center gap-3 text-gray-700 md:text-gray-500 py-3 px-2 rounded-md hover:bg-primary/10 md:hover:bg-lamaSkyLight w-full text-sm md:text-base"
        >
          {item.icon && <item.icon className="w-5 h-5 flex-shrink-0 text-gray-600 md:text-gray-500" />}
          <span className="block truncate">{item.label}</span>
        </Link>
      );
    }

    return (
      <>
        <div
          onClick={(e) => {
            e.stopPropagation();
            toggleItem(currentPath);
          }}
          className="cursor-pointer text-gray-600 md:text-gray-400 hover:text-gray-800 md:hover:text-gray-600 py-3 px-2 rounded-md hover:bg-primary/10 md:hover:bg-lamaSkyLight flex items-center gap-3"
        >
          {item.icon && <item.icon className="w-5 h-5 flex-shrink-0 text-gray-600 md:text-gray-400" />}
          <span className="block text-sm md:text-base">{item.label}</span>
        </div>

        {item.subItems && isExpanded(currentPath) && (
          <ul className="pl-6 mt-2 border-l border-gray-300 md:border-gray-200 space-y-1">
            {item.subItems.map((subItem: MenuItem, index: number) => {
              if (!isItemVisible(subItem)) {
                return null;
              }
              return (
                <li key={`${currentPath}-${subItem.label}-${index}`}>
                  {renderMenuItem(subItem, currentPath)}
                </li>
              );
            })}
          </ul>
        )}
      </>
    );
  };

  if (isLoading) {
    return (
      <div className="menu bg-gray-900 text-white p-4">
        <div className="item mb-4">
          <span className="title text-xs font-bold text-gray-400 uppercase">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 text-sm flex flex-col h-full overflow-y-auto">
      <div className="flex-grow">
        {(menuItems as MenuSection[]).map((section) => (
          <div className="flex flex-col gap-2" key={section.title}>
            <span className="block text-gray-400 font-light my-4">
              {section.title}
            </span>

            {section.items.map((item) => {
              if (!isItemVisible(item)) {
                return null;
              }

              if (item.href && (!item.subItems || item.isDirectLink)) {
                // Special handling for logout button
                if (item.label === "Logout") {
                  return (
                    <button
                      key={item.label}
                      onClick={() => setShowLogoutDialog(true)}
                      className="flex items-center justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lamaSkyLight w-full"
                    >
                      {item.icon && (
                        <item.icon className="w-5 h-5" />
                      )}
                      <span className="block">{item.label}</span>
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={getHref(item)}
                    className="flex items-center justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lamaSkyLight"
                  >
                    {item.icon && (
                      <item.icon className="w-5 h-5" />
                    )}
                    <span className="block">{item.label}</span>
                  </Link>
                );
              }

              return (
                <div key={item.label} className="relative">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItem(item.label);
                    }}
                    className="cursor-pointer flex items-center justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lamaSkyLight"
                  >
                    {item.icon && (
                      <item.icon className="w-5 h-5" />
                    )}
                    <span className="block">{item.label}</span>
                  </div>

                  {item.subItems && isExpanded(item.label) && (
                    <div className="mt-2 pl-6">
                      {item.subItems.map((subItem: MenuItem, index: number) => {
                        if (!isItemVisible(subItem)) {
                          return null;
                        }
                        return (
                          <div key={`${item.label}-${subItem.label}-${index}`}>
                            {renderMenuItem(subItem, item.label)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex-1" />
      {/* AutoSpares Image and Documentation Section */}
      <div className="hidden lg:flex pt-8 flex-col items-center">
        <div className="relative w-full h-40 mb-4">
          <Image
            src="/autospare-image.webp"
            alt="AutoSpares Management"
            fill
            className="object-cover rounded-lg"
            priority
          />
        </div>
        <Link 
          href="/autospares-docs.pdf"
          className="bg-blue-400 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors w-full text-center"
        >
          Download Documentation.
        </Link>
      </div>

      {/* Logout Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Sign Out</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to sign out?</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowLogoutDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {isLoggingOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;