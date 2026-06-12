"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
    LayoutDashboard,
    Users,
    Package,
    ShoppingCart,
    Ticket,
    BadgePercent,
    FileText,
    LogOut,
    Menu,
    X,
    ChevronRight,
    ReceiptText,
    ClipboardList,
    Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import { api as axios } from "@/lib/axios";

type AdminRole = "root" | "admin";

const ROOT_NAV_ITEMS = [
    { label: "Dashboard", href: "/panel-xyz123", icon: LayoutDashboard },
    { label: "Users", href: "/panel-xyz123/users", icon: Users },
    { label: "Customers", href: "/panel-xyz123/customers", icon: Users },
    { label: "Products", href: "/panel-xyz123/products", icon: Package },
    { label: "Inventory", href: "/panel-xyz123/inventory", icon: Warehouse },
    { label: "Orders", href: "/panel-xyz123/orders", icon: ShoppingCart },
    { label: "Vouchers", href: "/panel-xyz123/vouchers", icon: BadgePercent },
    { label: "Expenses", href: "/panel-xyz123/expenses", icon: ReceiptText },
    { label: "Preorders", href: "/panel-xyz123/preorders", icon: Ticket },
    { label: "COAs", href: "/panel-xyz123/coas", icon: FileText },
];

const ADMIN_NAV_ITEMS = [
    { label: "Daily Tasks", href: "/panel-xyz123/daily-tasks", icon: ClipboardList },
    { label: "Users", href: "/panel-xyz123/users", icon: Users },
    { label: "Orders", href: "/panel-xyz123/orders", icon: ShoppingCart },
    { label: "Vouchers", href: "/panel-xyz123/vouchers", icon: BadgePercent },
    { label: "Customers", href: "/panel-xyz123/customers", icon: Users },
];

function AdminSidebar({
    collapsed,
    onToggle,
    role,
    dailyTaskCount,
}: {
    collapsed: boolean;
    onToggle: () => void;
    role: AdminRole | null;
    dailyTaskCount: number;
}) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await axios.post("/admin/auth/logout");
            toast.success("Logged out");
            router.push("/login-panel");
            router.refresh();
        } catch {
            toast.error("Logout failed");
        }
    };

    return (
        <aside
            className={`fixed lg:relative z-40 h-screen bg-card border-r border-border flex flex-col transition-all duration-300 ${collapsed ? "w-0 lg:w-16 overflow-hidden" : "w-64"
                }`}
        >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
                {!collapsed && (
                    <span className="font-semibold text-sm text-foreground tracking-tight">
                        MetaPeptides
                    </span>
                )}
                <button
                    onClick={onToggle}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                    {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                {(role === "admin" ? ADMIN_NAV_ITEMS : ROOT_NAV_ITEMS).map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== "/panel-xyz123" &&
                            pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${isActive
                                    ? "bg-accent/10 text-accent"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                } ${collapsed ? "justify-center" : ""}`}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-accent" : ""}`} />
                            {!collapsed && <span>{item.label}</span>}
                            {!collapsed &&
                                item.href === "/panel-xyz123/daily-tasks" &&
                                dailyTaskCount > 0 && (
                                    <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                                        {dailyTaskCount}
                                    </span>
                                )}
                            {!collapsed && isActive && (
                                <ChevronRight className="w-3 h-3 ml-auto text-accent" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="p-2 border-t border-border shrink-0">
                <button
                    onClick={handleLogout}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full ${collapsed ? "justify-center" : ""
                        }`}
                    title={collapsed ? "Logout" : undefined}
                >
                    <LogOut className="w-4 h-4 shrink-0" />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
}

function AdminHeader({
    onToggleSidebar,
}: {
    onToggleSidebar: () => void;
}) {
    const pathname = usePathname();

    const getPageTitle = () => {
        if (pathname === "/panel-xyz123") return "Dashboard";
        if (pathname.includes("/daily-tasks")) return "Daily Tasks";
        if (pathname.includes("/users")) return "Users";
        if (pathname.includes("/customers")) return "Customers";
        if (pathname.includes("/products")) return "Products";
        if (pathname.includes("/inventory")) return "Inventory";
        if (pathname.includes("/orders")) return "Orders";
        if (pathname.includes("/vouchers")) return "Vouchers";
        if (pathname.includes("/expenses")) return "Expenses";
        if (pathname.includes("/preorders")) return "Preorders";
        if (pathname.includes("/coas")) return "COAs";
        return "Dashboard";
    };

    const getBreadcrumbs = () => {
        const segments = pathname
            .replace("/panel-xyz123", "")
            .split("/")
            .filter(Boolean);

        return segments.map((seg, i) => ({
            label: seg.charAt(0).toUpperCase() + seg.slice(1),
            href: "/panel-xyz123/" + segments.slice(0, i + 1).join("/"),
        }));
    };

    const breadcrumbs = getBreadcrumbs();

    return (
        <header className="h-16 bg-card border-b border-border flex items-center px-4 lg:px-6 gap-4 shrink-0">
            <button
                onClick={onToggleSidebar}
                className="lg:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
                <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm">
                <Link
                    href="/panel-xyz123"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    Dashboard
                </Link>
                {breadcrumbs.map((crumb) => (
                    <div key={crumb.href} className="flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                        <Link
                            href={crumb.href}
                            className="text-foreground font-medium capitalize"
                        >
                            {crumb.label}
                        </Link>
                    </div>
                ))}
                {breadcrumbs.length === 0 && (
                    <span className="text-foreground font-medium">
                        {getPageTitle()}
                    </span>
                )}
            </div>
        </header>
    );
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [role, setRole] = useState<AdminRole | null>(null);
    const [dailyTaskCount, setDailyTaskCount] = useState(0);

    useEffect(() => {
        const fetchAdminContext = async () => {
            try {
                const { data } = await axios.get("/admin/auth/me");
                const nextRole = data.data?.role || null;
                setRole(nextRole);

                if (nextRole === "admin") {
                    const taskResponse = await axios.get("/admin/daily-tasks");
                    setDailyTaskCount(Number(taskResponse.data?.data?.count || 0));
                }
            } catch {
                setRole(null);
            }
        };

        fetchAdminContext();
    }, []);

    return (
        <div className="dark">
            <div className="flex h-screen bg-background text-foreground overflow-hidden">
                {/* Mobile overlay */}
                {!sidebarCollapsed && (
                    <div
                        className="lg:hidden fixed inset-0 bg-black/50 z-30"
                        onClick={() => setSidebarCollapsed(true)}
                    />
                )}

                <AdminSidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                    role={role}
                    dailyTaskCount={dailyTaskCount}
                />

                <div className="flex-1 flex flex-col min-w-0">
                    <AdminHeader
                        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                    />
                    <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
                </div>
            </div>
        </div>
    );
}
