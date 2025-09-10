import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  FileText,
  Settings,
  HelpCircle,
  LayoutDashboard,
  Boxes,
  Tag,
  Truck,
  CreditCard,
  MessageSquare,
  Bell,
  Calendar,
  ClipboardList,
  User,
  LogOut,
} from 'lucide-react';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const NavItem = ({ href, icon, label, isActive }: NavItemProps) => {
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-fuchsia-50 text-fuchsia-700'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <span className="mr-3">{icon}</span>
        {label}
      </Link>
    </li>
  );
};

export function Sidebar() {
  const pathname = usePathname();

  const mainNavItems = [
    { href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard' },
    { href: '/inventory', icon: <Package className="h-5 w-5" />, label: 'Inventory' },
    { href: '/orders', icon: <ShoppingCart className="h-5 w-5" />, label: 'Orders' },
    { href: '/customers', icon: <Users className="h-5 w-5" />, label: 'Customers' },
    { href: '/suppliers', icon: <Truck className="h-5 w-5" />, label: 'Suppliers' },
    { href: '/categories', icon: <Tag className="h-5 w-5" />, label: 'Categories' },
    { href: '/reports', icon: <BarChart3 className="h-5 w-5" />, label: 'Reports' },
  ];

  const secondaryNavItems = [
    { href: '/settings', icon: <Settings className="h-5 w-5" />, label: 'Settings' },
    { href: '/support', icon: <HelpCircle className="h-5 w-5" />, label: 'Help & Support' },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-y-auto border-r bg-white">
      <nav className="flex-1 space-y-1 p-4">
        <div className="space-y-4">
          <h3 className="px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Main
          </h3>
          <ul className="space-y-1">
            {mainNavItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={pathname ? (pathname === item.href || pathname.startsWith(`${item.href}/`)) : false}
              />
            ))}
          </ul>
        </div>

        <div className="space-y-4 pt-4">
          <h3 className="px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Preferences
          </h3>
          <ul className="space-y-1">
            {secondaryNavItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={pathname ? (pathname === item.href || pathname.startsWith(`${item.href}/`)) : false}
              />
            ))}
          </ul>
        </div>
      </nav>
      
      <div className="border-t p-4">
        <div className="flex items-center space-x-3 rounded-lg bg-gray-50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-100 text-fuchsia-600">
            <User className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">John Doe</p>
            <p className="truncate text-xs text-gray-500">Admin</p>
          </div>
          <button className="text-gray-400 hover:text-gray-500">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
