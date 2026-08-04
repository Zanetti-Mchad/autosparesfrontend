"use client";
import { useState, useEffect } from "react";
import { getRole } from "@/lib/data";
import { env } from "@/env";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home, ShoppingCart, Users, Package, User,
  FileText, Settings, LogOut, Quote, Store,
  Truck, Wallet, Landmark, Factory, MapPinned, Bell, ChevronRight,
  ClipboardList, BarChart3, TrendingUp,
  UserCheck, CreditCard, RotateCcw, LineChart, Workflow,
  PlusCircle, Boxes, ArrowLeftRight, Scale, AlertTriangle,
  Building2, Tags, Ruler, BadgeDollarSign, RefreshCw,
  Wrench, FolderTree, PiggyBank, MessageSquare, CalendarDays,
  Receipt, Percent, ArrowDownCircle, ArrowUpCircle,
  History, Shield, KeyRound, Trash2, Database,
  Loader2, CheckCircle, XCircle,
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

const ICON_STYLES: Record<string, { wrap: string; icon: string }> = {
  Dashboard: { wrap: "bg-blue-100", icon: "text-blue-600" },
  Pos: { wrap: "bg-emerald-100", icon: "text-emerald-600" },
  POS: { wrap: "bg-emerald-100", icon: "text-emerald-600" },
  Quotations: { wrap: "bg-indigo-100", icon: "text-indigo-600" },
  "Create Quote": { wrap: "bg-blue-100", icon: "text-blue-600" },
  "View Quotes": { wrap: "bg-indigo-100", icon: "text-indigo-600" },
  "Delete Quote": { wrap: "bg-red-100", icon: "text-red-600" },
  Invoices: { wrap: "bg-sky-100", icon: "text-sky-600" },
  "Sales Drafts": { wrap: "bg-slate-100", icon: "text-slate-600" },
  "Sales report": { wrap: "bg-lime-100", icon: "text-lime-700" },
  "Top selling products report": { wrap: "bg-amber-100", icon: "text-amber-600" },
  "Profit Analysis Report": { wrap: "bg-green-100", icon: "text-green-700" },
  "Staff Performance Report": { wrap: "bg-violet-100", icon: "text-violet-600" },
  "Sales Payments": { wrap: "bg-teal-100", icon: "text-teal-600" },
  "Sales Returns": { wrap: "bg-rose-100", icon: "text-rose-600" },
  "Credit Sales Report": { wrap: "bg-yellow-100", icon: "text-yellow-700" },
  "Net Income Report": { wrap: "bg-emerald-100", icon: "text-emerald-700" },
  "Order Pipeline": { wrap: "bg-orange-100", icon: "text-orange-600" },
  "Create Order": { wrap: "bg-blue-100", icon: "text-blue-600" },
  "Orders View": { wrap: "bg-cyan-100", icon: "text-cyan-600" },
  Production: { wrap: "bg-violet-100", icon: "text-violet-600" },
  Deliveries: { wrap: "bg-cyan-100", icon: "text-cyan-600" },
  "Stock levels": { wrap: "bg-amber-100", icon: "text-amber-600" },
  "Low Stock Report": { wrap: "bg-red-100", icon: "text-red-600" },
  "Stock Movements": { wrap: "bg-sky-100", icon: "text-sky-600" },
  "Add Stock": { wrap: "bg-emerald-100", icon: "text-emerald-600" },
  Purchases: { wrap: "bg-sky-100", icon: "text-sky-600" },
  "Stock Transfers": { wrap: "bg-indigo-100", icon: "text-indigo-600" },
  "Stock Reconciliations": { wrap: "bg-purple-100", icon: "text-purple-600" },
  "Products Reconciliations": { wrap: "bg-fuchsia-100", icon: "text-fuchsia-600" },
  "Spoilt Stock": { wrap: "bg-red-100", icon: "text-red-600" },
  Stores: { wrap: "bg-teal-100", icon: "text-teal-600" },
  Suppliers: { wrap: "bg-teal-100", icon: "text-teal-600" },
  Products: { wrap: "bg-amber-100", icon: "text-amber-600" },
  "Create Product": { wrap: "bg-blue-100", icon: "text-blue-600" },
  "Product Categories": { wrap: "bg-orange-100", icon: "text-orange-600" },
  "Product Units": { wrap: "bg-slate-100", icon: "text-slate-600" },
  Brands: { wrap: "bg-pink-100", icon: "text-pink-600" },
  "Price Changes": { wrap: "bg-yellow-100", icon: "text-yellow-700" },
  Restock: { wrap: "bg-green-100", icon: "text-green-600" },
  Services: { wrap: "bg-cyan-100", icon: "text-cyan-600" },
  "Service Categories": { wrap: "bg-sky-100", icon: "text-sky-600" },
  Customers: { wrap: "bg-pink-100", icon: "text-pink-600" },
  "Customer Deposits": { wrap: "bg-emerald-100", icon: "text-emerald-600" },
  "Customer Refunds": { wrap: "bg-rose-100", icon: "text-rose-600" },
  "Message Center": { wrap: "bg-indigo-100", icon: "text-indigo-600" },
  "Add Customer": { wrap: "bg-blue-100", icon: "text-blue-600" },
  Expenses: { wrap: "bg-rose-100", icon: "text-rose-600" },
  "Monthly Report": { wrap: "bg-lime-100", icon: "text-lime-700" },
  "Expense Categories": { wrap: "bg-orange-100", icon: "text-orange-600" },
  Taxes: { wrap: "bg-amber-100", icon: "text-amber-700" },
  "Tax Report": { wrap: "bg-yellow-100", icon: "text-yellow-700" },
  "Payment Methods": { wrap: "bg-teal-100", icon: "text-teal-600" },
  "Money Transfers": { wrap: "bg-sky-100", icon: "text-sky-600" },
  "Cash In": { wrap: "bg-green-100", icon: "text-green-600" },
  "Cash Out": { wrap: "bg-red-100", icon: "text-red-600" },
  "Transaction History": { wrap: "bg-slate-100", icon: "text-slate-600" },
  "Daily Report": { wrap: "bg-lime-100", icon: "text-lime-700" },
  Users: { wrap: "bg-fuchsia-100", icon: "text-fuchsia-600" },
  "Roles & Permissions": { wrap: "bg-violet-100", icon: "text-violet-600" },
  Permissions: { wrap: "bg-purple-100", icon: "text-purple-600" },
  "Add User": { wrap: "bg-blue-100", icon: "text-blue-600" },
  Profile: { wrap: "bg-slate-100", icon: "text-slate-600" },
  Settings: { wrap: "bg-gray-100", icon: "text-gray-700" },
  "Database Backup": { wrap: "bg-cyan-100", icon: "text-cyan-700" },
  Logout: { wrap: "bg-red-100", icon: "text-red-500" },
  Alerts: { wrap: "bg-red-100", icon: "text-red-600" },
  Inventory: { wrap: "bg-amber-100", icon: "text-amber-600" },
  Sales: { wrap: "bg-emerald-100", icon: "text-emerald-600" },
  Stock: { wrap: "bg-amber-100", icon: "text-amber-600" },
  "Payment Options": { wrap: "bg-teal-100", icon: "text-teal-600" },
  "User Management": { wrap: "bg-fuchsia-100", icon: "text-fuchsia-600" },
  Reports: { wrap: "bg-lime-100", icon: "text-lime-700" },
  Orders: { wrap: "bg-orange-100", icon: "text-orange-600" },
};

const menuBtnClass =
  "group flex items-center gap-3 w-full text-left text-gray-700 py-3 px-3 my-0.5 rounded-xl " +
  "transition-all duration-200 ease-out " +
  "hover:bg-blue-50 hover:shadow-sm hover:translate-x-0.5 " +
  "active:scale-[0.97] active:bg-blue-100/80 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40";

const ColoredIcon = ({
  icon: Icon,
  label,
}: {
  icon?: React.ElementType;
  label: string;
}) => {
  if (!Icon) return null;
  const style = ICON_STYLES[label] || { wrap: "bg-blue-50", icon: "text-blue-500" };
  return (
    <span
      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-active:scale-95 ${style.wrap}`}
    >
      <Icon className={`w-5 h-5 ${style.icon}`} strokeWidth={2.25} />
    </span>
  );
};

const ALL_ROLES = ["admin", "user", "manager"];
const ADMIN_MANAGER = ["admin", "manager"];
const ADMIN_ONLY = ["admin"];

export const menuItems: MenuSection[] = [
  {
    title: "Menu",
    items: [
      {
        icon: Home,
        label: "Dashboard",
        visible: ALL_ROLES,
        href: "/admin",
        isDirectLink: true,
      },
      {
        icon: ShoppingCart,
        label: "Sales",
        visible: ALL_ROLES,
        subItems: [
          { icon: Store, label: "Pos", href: "/pages/pos", visible: ALL_ROLES, isDirectLink: true },
          {
            icon: Quote,
            label: "Quotations",
            visible: ALL_ROLES,
            subItems: [
              { icon: PlusCircle, label: "Create Quote", href: "/pages/quotation/addquote", visible: ALL_ROLES, isDirectLink: true },
              { icon: FileText, label: "View Quotes", href: "/pages/quotation/viewquote", visible: ALL_ROLES, isDirectLink: true },
              { icon: Trash2, label: "Delete Quote", href: "/pages/quotation/deletequote", visible: ADMIN_MANAGER, isDirectLink: true },
            ],
          },
          { icon: ClipboardList, label: "Invoices", href: "/pages/sales/invoices", visible: ALL_ROLES, isDirectLink: true },
          {
            icon: BarChart3,
            label: "Reports",
            visible: ALL_ROLES,
            subItems: [
              { icon: BarChart3, label: "Sales report", href: "/pages/reports/sales", visible: ALL_ROLES, isDirectLink: true },
              { icon: TrendingUp, label: "Top selling products report", href: "/pages/reports/top-selling", visible: ALL_ROLES, isDirectLink: true },
              { icon: LineChart, label: "Profit Analysis Report", href: "/pages/reports/profit-analysis", visible: ADMIN_MANAGER, isDirectLink: true },
              { icon: UserCheck, label: "Staff Performance Report", href: "/pages/reports/staff-performance", visible: ADMIN_MANAGER, isDirectLink: true },
              { icon: FileText, label: "Credit Sales Report", href: "/pages/reports/credit-sales", visible: ADMIN_MANAGER, isDirectLink: true },
              { icon: Wallet, label: "Net Income Report", href: "/pages/reports/net-income", visible: ADMIN_MANAGER, isDirectLink: true },
            ],
          },
          { icon: CreditCard, label: "Sales Payments", href: "/pages/orders/payments", visible: ALL_ROLES, isDirectLink: true },
          { icon: RotateCcw, label: "Sales Returns", href: "/pages/sales/returns", visible: ALL_ROLES, isDirectLink: true },
          {
            icon: ShoppingCart,
            label: "Orders",
            visible: ALL_ROLES,
            subItems: [
              { icon: Workflow, label: "Order Pipeline", href: "/pages/orders/pipeline", visible: ALL_ROLES, isDirectLink: true },
              { icon: PlusCircle, label: "Create Order", href: "/pages/orders/createOrder", visible: ALL_ROLES, isDirectLink: true },
              { icon: ShoppingCart, label: "Orders View", href: "/pages/orders/OrdersView", visible: ALL_ROLES, isDirectLink: true },
            ],
          },
          { icon: Factory, label: "Production", href: "/pages/production", visible: ALL_ROLES, isDirectLink: true },
          { icon: MapPinned, label: "Deliveries", href: "/pages/deliveries", visible: ALL_ROLES, isDirectLink: true },
        ],
      },
      {
        icon: Boxes,
        label: "Stock",
        visible: ALL_ROLES,
        subItems: [
          { icon: Boxes, label: "Stock levels", href: "/pages/stock/levels", visible: ALL_ROLES, isDirectLink: true },
          { icon: Bell, label: "Low Stock Report", href: "/pages/alerts", visible: ALL_ROLES, isDirectLink: true },
          { icon: ArrowLeftRight, label: "Stock Movements", href: "/pages/stock/movements", visible: ALL_ROLES, isDirectLink: true },
          { icon: PlusCircle, label: "Add Stock", href: "/pages/stock/add", visible: ALL_ROLES, isDirectLink: true },
          { icon: Landmark, label: "Purchases", href: "/pages/purchases", visible: ADMIN_MANAGER, isDirectLink: true },
          { icon: Truck, label: "Stock Transfers", href: "/pages/stock/transfers", visible: ADMIN_MANAGER, isDirectLink: true },
          { icon: Scale, label: "Stock Reconciliations", href: "/pages/stock/reconciliations", visible: ADMIN_MANAGER, isDirectLink: true },
          { icon: ClipboardList, label: "Products Reconciliations", href: "/pages/stock/product-reconciliations", visible: ADMIN_MANAGER, isDirectLink: true },
          { icon: AlertTriangle, label: "Spoilt Stock", href: "/pages/stock/spoilt", visible: ADMIN_MANAGER, isDirectLink: true },
          { icon: Building2, label: "Stores", href: "/pages/stock/stores", visible: ADMIN_MANAGER, isDirectLink: true },
          { icon: Truck, label: "Suppliers", href: "/pages/suppliers", visible: ADMIN_MANAGER, isDirectLink: true },
        ],
      },
      {
        icon: Package,
        label: "Inventory",
        visible: ALL_ROLES,
        subItems: [
          { icon: Package, label: "Products", href: "/pages/inventory/ViewEditInventory", visible: ALL_ROLES, isDirectLink: true },
          { icon: PlusCircle, label: "Create Product", href: "/pages/inventory/CreateInventory", visible: ALL_ROLES, isDirectLink: true },
          { icon: Tags, label: "Product Categories", href: "/pages/inventory/categories/ViewEditCategory", visible: ALL_ROLES, isDirectLink: true },
          { icon: Ruler, label: "Product Units", href: "/pages/inventory/units", visible: ALL_ROLES, isDirectLink: true },
          { icon: BadgeDollarSign, label: "Brands", href: "/pages/inventory/brands", visible: ALL_ROLES, isDirectLink: true },
          { icon: RefreshCw, label: "Price Changes", href: "/pages/inventory/price-changes", visible: ADMIN_MANAGER, isDirectLink: true },
          { icon: Boxes, label: "Restock", href: "/pages/inventory/RestockInventory", visible: ALL_ROLES, isDirectLink: true },
        ],
      },
      {
        icon: Wrench,
        label: "Services",
        visible: ALL_ROLES,
        subItems: [
          { icon: Wrench, label: "Services", href: "/pages/services", visible: ALL_ROLES, isDirectLink: true },
          { icon: FolderTree, label: "Service Categories", href: "/pages/services/categories", visible: ALL_ROLES, isDirectLink: true },
        ],
      },
      {
        icon: Users,
        label: "Customers",
        visible: ALL_ROLES,
        subItems: [
          { icon: Users, label: "Customers", href: "/pages/customer/ViewCustomer", visible: ALL_ROLES, isDirectLink: true },
          { icon: PiggyBank, label: "Customer Deposits", href: "/pages/customers/deposits", visible: ALL_ROLES, isDirectLink: true },
          { icon: RotateCcw, label: "Customer Refunds", href: "/pages/customers/refunds", visible: ALL_ROLES, isDirectLink: true },
          { icon: MessageSquare, label: "Message Center", href: "/pages/customers/messages", visible: ALL_ROLES, isDirectLink: true },
          { icon: PlusCircle, label: "Add Customer", href: "/pages/customer/CreateCustomerView", visible: ALL_ROLES, isDirectLink: true },
        ],
      },
      {
        icon: Wallet,
        label: "Expenses",
        visible: ADMIN_MANAGER,
        subItems: [
          { icon: Wallet, label: "Expenses", href: "/pages/expenses", visible: ADMIN_MANAGER, isDirectLink: true },
          { icon: CalendarDays, label: "Monthly Report", href: "/pages/reports/monthly-expenses", visible: ADMIN_MANAGER, isDirectLink: true },
          { icon: Tags, label: "Expense Categories", href: "/pages/expenses/categories", visible: ADMIN_MANAGER, isDirectLink: true },
          { icon: Percent, label: "Taxes", href: "/pages/expenses/taxes", visible: ADMIN_MANAGER, isDirectLink: true },
          { icon: Receipt, label: "Tax Report", href: "/pages/reports/tax", visible: ADMIN_MANAGER, isDirectLink: true },
        ],
      },
      {
        icon: CreditCard,
        label: "Payment Options",
        visible: ADMIN_MANAGER,
        subItems: [
          { icon: CreditCard, label: "Payment Methods", href: "/pages/payments/methods", visible: ADMIN_MANAGER, isDirectLink: true },
          { icon: ArrowLeftRight, label: "Money Transfers", href: "/pages/payments/transfers", visible: ADMIN_MANAGER, isDirectLink: true },
          { icon: ArrowDownCircle, label: "Cash In", href: "/pages/payments/cash-in", visible: ADMIN_MANAGER, isDirectLink: true },
          { icon: ArrowUpCircle, label: "Cash Out", href: "/pages/payments/cash-out", visible: ADMIN_MANAGER, isDirectLink: true },
          { icon: History, label: "Transaction History", href: "/pages/payments/history", visible: ADMIN_MANAGER, isDirectLink: true },
          { icon: BarChart3, label: "Daily Report", href: "/pages/payments/daily-report", visible: ADMIN_MANAGER, isDirectLink: true },
        ],
      },
      {
        icon: Shield,
        label: "User Management",
        visible: ADMIN_ONLY,
        subItems: [
          { icon: User, label: "Users", href: "/pages/adduser/viewedituser", visible: ADMIN_ONLY, isDirectLink: true },
          { icon: Shield, label: "Roles & Permissions", href: "/pages/users/roles", visible: ADMIN_ONLY, isDirectLink: true },
          { icon: KeyRound, label: "Permissions", href: "/pages/users/permissions", visible: ADMIN_ONLY, isDirectLink: true },
          { icon: PlusCircle, label: "Add User", href: "/pages/adduser/adduser", visible: ADMIN_ONLY, isDirectLink: true },
        ],
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
        visible: ALL_ROLES,
        isDirectLink: true,
      },
      {
        icon: Settings,
        label: "Settings",
        href: "/pages/settings",
        visible: ADMIN_ONLY,
        isDirectLink: true,
      },
      {
        icon: Database,
        label: "Database Backup",
        href: "/backup",
        visible: ADMIN_ONLY,
        isDirectLink: true,
      },
      {
        icon: LogOut,
        label: "Logout",
        href: "/logout",
        visible: ALL_ROLES,
        isDirectLink: true,
      },
    ],
  },
];

const Menu = ({ onNavigate }: { onNavigate?: () => void }) => {
  const router = useRouter();
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [backupStatus, setBackupStatus] = useState<"idle" | "running" | "success" | "error">("idle");

  useEffect(() => {
    const userRole = getRole();
    setRole(userRole);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const hrefs = new Set<string>();
    const walk = (items: MenuItem[]) => {
      for (const item of items) {
        if (item.href) hrefs.add(item.href);
        if (item.subItems) walk(item.subItems);
      }
    };
    menuItems.forEach((section) => walk(section.items));
    const id = window.setTimeout(() => {
      hrefs.forEach((href) => {
        try {
          router.prefetch(href);
        } catch {
          /* ignore */
        }
      });
    }, 800);
    return () => window.clearTimeout(id);
  }, [router]);

  const handleNavigate = () => {
    // Keep the expanded parent open; only close the mobile drawer
    onNavigate?.();
  };

  const prefetchHref = (href?: string) => {
    if (!href || href === "#") return;
    try {
      router.prefetch(href);
    } catch {
      /* ignore */
    }
  };

  const handleDatabaseBackup = async () => {
    setBackupStatus("running");
    console.log("Running database backup...");

    try {
      const response = await fetch("/api/backup", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        setBackupStatus("success");
        console.log("Backup completed:", data.backupFile);
      } else {
        setBackupStatus("error");
        console.error("Backup failed:", data.error);
      }
    } catch (error) {
      setBackupStatus("error");
      console.error("Backup request failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      console.log('Logout initiated');
      
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
      
      if (userId) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          console.log('Sending logout request with payload:', {
            userId,
            action: "LOGOUT",
            status: "SUCCESS"
          });
          
          const backendUrl = env.BACKEND_API_URL;
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

      console.log('Clearing local storage');
      localStorage.clear();
      sessionStorage.clear();

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
    return item.href || "#";
  };

  const isItemVisible = (item: MenuItem) => {
    if (!item.visible) return true;
    return role ? item.visible.includes(role) : false;
  };

  const renderMenuItem = (item: MenuItem, path: string = "") => {
    const currentPath = path ? `${path}.${item.label}` : item.label;

    if (!isItemVisible(item)) {
      return null;
    }

    if (item.href && (!item.subItems || item.isDirectLink)) {
      const href = getHref(item);
      return (
        <Link
          href={href}
          prefetch
          onMouseEnter={() => prefetchHref(href)}
          onFocus={() => prefetchHref(href)}
          onClick={handleNavigate}
          className={menuBtnClass}
        >
          <ColoredIcon icon={item.icon} label={item.label} />
          <span className="block truncate font-medium text-sm">{item.label}</span>
        </Link>
      );
    }

    return (
      <>
        <div
          onClick={(e) => {
            e.stopPropagation();
            toggleItem(currentPath);
            item.subItems?.forEach((sub) => prefetchHref(sub.href));
          }}
          className={`${menuBtnClass} cursor-pointer`}
        >
          <ColoredIcon icon={item.icon} label={item.label} />
          <span className="block font-medium text-sm flex-1">{item.label}</span>
          <ChevronRight
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isExpanded(currentPath) ? "rotate-90" : ""
            }`}
          />
        </div>

        {item.subItems && isExpanded(currentPath) && (
          <ul className="ml-4 pl-3 mt-1 mb-2 border-l-2 border-blue-100 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
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
    <div className="mt-2 text-sm flex flex-col px-1 pb-4">
      <div className="space-y-1">
        {(menuItems as MenuSection[]).map((section) => (
          <div className="flex flex-col gap-1" key={section.title}>
            {section.title !== "Menu" && (
              <span className="block text-gray-400 font-medium text-[11px] uppercase tracking-wider my-3 px-3">
                {section.title}
              </span>
            )}

            {section.items.map((item) => {
              if (!isItemVisible(item)) {
                return null;
              }

              if (item.href && (!item.subItems || item.isDirectLink)) {
                if (item.label === "Logout") {
                  return (
                    <button
                      key={item.label}
                      onClick={() => setShowLogoutDialog(true)}
                      className={menuBtnClass}
                    >
                      <ColoredIcon icon={item.icon} label={item.label} />
                      <span className="block font-medium text-sm">{item.label}</span>
                    </button>
                  );
                }

                if (item.label === "Database Backup") {
                  return (
                    <button
                      key={item.label}
                      onClick={handleDatabaseBackup}
                      disabled={backupStatus === "running"}
                      className={`${menuBtnClass} disabled:opacity-70`}
                    >
                      {backupStatus === "running" && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100">
                          <Loader2 className="h-4 w-4 animate-spin text-cyan-700" />
                        </span>
                      )}
                      {backupStatus === "success" && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </span>
                      )}
                      {backupStatus === "error" && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                          <XCircle className="h-4 w-4 text-red-500" />
                        </span>
                      )}
                      {backupStatus === "idle" && (
                        <ColoredIcon icon={item.icon} label={item.label} />
                      )}
                      <span className="block font-medium text-sm">{item.label}</span>
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={getHref(item)}
                    prefetch
                    onMouseEnter={() => prefetchHref(getHref(item))}
                    onFocus={() => prefetchHref(getHref(item))}
                    onClick={handleNavigate}
                    className={menuBtnClass}
                  >
                    <ColoredIcon icon={item.icon} label={item.label} />
                    <span className="block font-medium text-sm">{item.label}</span>
                  </Link>
                );
              }

              return (
                <div key={item.label} className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItem(item.label);
                      item.subItems?.forEach((sub) => prefetchHref(sub.href));
                    }}
                    onMouseEnter={() => item.subItems?.forEach((sub) => prefetchHref(sub.href))}
                    className={`${menuBtnClass} cursor-pointer ${
                      isExpanded(item.label) ? "bg-blue-50 shadow-sm" : ""
                    }`}
                  >
                    <ColoredIcon icon={item.icon} label={item.label} />
                    <span className="block font-medium text-sm flex-1">{item.label}</span>
                    <ChevronRight
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                        isExpanded(item.label) ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {item.subItems && isExpanded(item.label) && (
                    <div className="ml-4 pl-3 mt-1 mb-2 border-l-2 border-blue-100 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
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
      <div className="hidden lg:flex pt-8 flex-col items-center">
        <div className="relative w-full h-40 mb-4">
          <Image
            src="/mwima-logo.png"
            alt="Mwima Eliken Poultry Farm"
            fill
            className="object-contain rounded-lg bg-white p-2"
            priority
          />
        </div>
        <p className="text-xs text-center text-gray-500 px-2">
          Fresh Chicken every day · Jinja City
        </p>
      </div>

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
