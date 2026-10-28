"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

interface SidebarProps {
  userRole?: "ADMIN" | "ACCOUNTANT" | "ACCOUNTS" | "VIEWER" | "SUPER_ADMIN";
}

export default function Sidebar({ userRole = "ADMIN" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Reports dropdown ko open/close rakhne ki state
  const [reportsOpen, setReportsOpen] = useState(
    pathname.startsWith("/dashboard/reports")
  );

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const menuItems = [
    {
      name: "Dashboard",
      href: "/dashboard/admin",
      roles: ["ADMIN"],
      icon: "📊",
    },
    
    {
      name: "Super Dashboard",
      href: "/dashboard/super-admin",
      roles: ["SUPER_ADMIN"],
      icon: "📊",
    },
     {
      name: "Categories",
      href: "/dashboard/categories",
      roles: ["SUPER_ADMIN"],
      icon: "🏷️",
    },
    {
      name: "Expense",
      href: "/dashboard/expenses",
      roles: ["SUPER_ADMIN","ACCOUNTS","ADMIN"],
      icon: "📊",
    },
     {
      name: "Hold Animal",
      href: "/dashboard/hold",
      roles: ["SUPER_ADMIN"],
      icon: "📊",
    },
    {
      name: "Booking",
      href: "/dashboard/orders",
      roles: ["SUPER_ADMIN","ADMIN"],
      icon: "📊",
    },
    {
      name: "New Booking",
      href: "/dashboard/new-booking",
      roles: [  "USER"],
      icon: "📊",
    },

    {
      name: "Chart of Accounts",
      href: "/dashboard/accounts",
      roles: ["SUPER_ADMIN","ACCOUNTS"],
      icon: "📁",
    },
    {
      name: "Journal Vouchers",
      href: "/dashboard/vouchers",
      roles: ["SUPER_ADMIN", "ACCOUNTS"],
      icon: "📝",
    },
   
    
  ];

  // Reports sub-menu items
  const reportItems = [
    { name: "General Ledger", href: "/dashboard/reports/ledger" },
    { name: "Trial Balance", href: "/dashboard/reports/trial-balance" },
    { name: "Income Statement", href: "/dashboard/reports/income-statement" },
    { name: "Balance Sheet", href: "/dashboard/reports/balance-sheet" },
  ];

  const adminItems = [
    {
      name: "User Management",
      href: "/dashboard/users",
      roles: ["SUPER_ADMIN"],
      icon: "👥",
    },
  ];

  const filteredMenu = menuItems.filter((item) => item.roles.includes(userRole));
  const filteredAdminMenu = adminItems.filter((item) => item.roles.includes(userRole));

  // Financial reports sirf SUPER_ADMIN aur ACCOUNTS/ACCOUNTANT ko dikhenge
  const showReports = userRole === "SUPER_ADMIN" || userRole === "ACCOUNTS" || userRole === "ACCOUNTANT";

  return (
    <aside className="w-64 bg-sky-900 border-r border-sky-300 flex flex-col h-screen sticky top-0 print:hidden">
      {/* App Branding / Logo */}
      <div className="p-6 border-b border-sky-800">
        <h1 className="ml-5 text-lg font-bold tracking-tight text-white">IJtimai Qurbani</h1>
        <p className="ml-5 text-xs text-white mt-0.5">Accounting & Inventory</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-2 space-y-1.5 overflow-y-auto">
       

        {/* Main Menu Links */}
        {filteredMenu.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sky-900 text-white border border-slate-700/60 shadow-sm"
                  : "text-white hover:bg-sky-800 hover:text-slate-200"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Reports Collapsible Section (Restricted) */}
        {showReports && (
          <div className="pt-2">
            <button
              onClick={() => setReportsOpen(!reportsOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-base">📈</span>
                <span>Financial Reports</span>
              </div>
              <span className={`text-xs transition-transform ${reportsOpen ? "rotate-90" : ""}`}>
                ▶
              </span>
            </button>

            {/* Sub-menu items for Reports */}
            {reportsOpen && (
              <div className="ml-4 pl-4 mt-1 space-y-1 border-l border-slate-800">
                {reportItems.map((rep) => {
                  const isRepActive = pathname === rep.href;
                  return (
                    <Link
                      key={rep.href}
                      href={rep.href}
                      className={`block px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                        isRepActive
                          ? "bg-slate-800/80 text-slate-100 font-semibold"
                          : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                      }`}
                    >
                      {rep.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Admin Menu Links */}
        {filteredAdminMenu.length > 0 && (
          <div className="pt-4">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
              Administration
            </div>
            {filteredAdminMenu.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-800 text-slate-100 border border-slate-700/60 shadow-sm"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}