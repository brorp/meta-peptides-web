import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

const FINANCIAL_ORDER_STATUSES = ["completed", "processing"];

export async function GET() {
    try {
        // Total users
        const { data: authUsersData, error: authUsersError } =
            await supabaseAdmin.auth.admin.listUsers({
                page: 1,
                perPage: 1,
            });

        if (authUsersError) {
            throw new Error(authUsersError.message);
        }

        const totalUsers = authUsersData?.total || 0;

        // Total products
        const { count: totalProducts } = await supabaseAdmin
            .from("products")
            .select("*", { count: "exact", head: true });

        // Total orders
        const { count: totalOrders } = await supabaseAdmin
            .from("orders")
            .select("*", { count: "exact", head: true });

        // Financial report uses active/paid order statuses only.
        const { data: revenueData, error: revenueError } = await supabaseAdmin
            .from("orders")
            .select(
                "subtotal, total_price, voucher_discount_amount, marketplace_fee, order_items(product_id, quantity, price_at_purchase, cogs_at_purchase, products(id, name, label))",
            )
            .in("status", FINANCIAL_ORDER_STATUSES);

        if (revenueError) {
            throw new Error(revenueError.message);
        }

        const totalGrossSales = (revenueData || []).reduce(
            (sum, order) => sum + (Number(order.subtotal) || 0),
            0,
        );

        const totalNetRevenue = (revenueData || []).reduce(
            (sum, order) => sum + (Number(order.total_price) || 0),
            0,
        );

        const totalDiscount = (revenueData || []).reduce(
            (sum, order) => sum + (Number(order.voucher_discount_amount) || 0),
            0,
        );

        const totalCogs = (revenueData || []).reduce((sum, order: any) => {
            const orderCogs = (order.order_items || []).reduce(
                (itemSum: number, item: any) =>
                    itemSum +
                    (Number(item.cogs_at_purchase) || 0) *
                        (Number(item.quantity) || 0),
                0,
            );

            return sum + orderCogs;
        }, 0);

        const productProfitMap = new Map<
            string,
            {
                productId: string;
                name: string;
                label: string | null;
                unitsSold: number;
                revenue: number;
                cogs: number;
                grossProfit: number;
            }
        >();

        for (const order of revenueData || []) {
            for (const item of (order as any).order_items || []) {
                const product = item.products || {};
                const productId = product.id || item.product_id || "unknown";
                const quantity = Number(item.quantity) || 0;
                const revenue =
                    (Number(item.price_at_purchase) || 0) * quantity;
                const cogs =
                    (Number(item.cogs_at_purchase) || 0) * quantity;
                const current = productProfitMap.get(productId) || {
                    productId,
                    name: product.name || "Product",
                    label: product.label || null,
                    unitsSold: 0,
                    revenue: 0,
                    cogs: 0,
                    grossProfit: 0,
                };

                current.unitsSold += quantity;
                current.revenue += revenue;
                current.cogs += cogs;
                current.grossProfit += revenue - cogs;
                productProfitMap.set(productId, current);
            }
        }

        const productProfit = Array.from(productProfitMap.values())
            .sort((a, b) => b.grossProfit - a.grossProfit)
            .slice(0, 8);

        const { data: expensesData, error: expensesError } = await supabaseAdmin
            .from("expenses")
            .select("amount, category");

        if (expensesError) {
            throw new Error(expensesError.message);
        }

        const totalExpenses = (expensesData || []).reduce(
            (sum, expense) => sum + (Number(expense.amount) || 0),
            0,
        );

        const expenseBreakdownMap = new Map<string, number>();
        for (const expense of expensesData || []) {
            const category = expense.category || "General";
            expenseBreakdownMap.set(
                category,
                (expenseBreakdownMap.get(category) || 0) +
                    (Number(expense.amount) || 0),
            );
        }

        const expenseBreakdown = Array.from(expenseBreakdownMap.entries())
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);

        const grossProfit = totalNetRevenue - totalCogs;
        const netProfit = grossProfit - totalExpenses;
        const grossMargin =
            totalNetRevenue > 0 ? (grossProfit / totalNetRevenue) * 100 : 0;
        const netMargin =
            totalNetRevenue > 0 ? (netProfit / totalNetRevenue) * 100 : 0;

        const totalMarketplaceFee = (revenueData || []).reduce(
            (sum, order) => sum + (Number(order.marketplace_fee) || 0),
            0,
        );

        // Pending orders
        const { count: pendingOrders } = await supabaseAdmin
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending_review");

        // Recent orders
        const { data: recentOrders } = await supabaseAdmin
            .from("orders")
            .select("*, order_items(*, products(name, image_url))")
            .order("created_at", { ascending: false })
            .limit(5);

        return NextResponse.json({
            success: true,
            data: {
                totalUsers: totalUsers || 0,
                totalProducts: totalProducts || 0,
                totalOrders: totalOrders || 0,
                totalRevenue: totalNetRevenue,
                totalGrossSales,
                totalNetRevenue,
                totalDiscount,
                totalMarketplaceFee,
                totalCogs,
                totalExpenses,
                grossProfit,
                netProfit,
                grossMargin,
                netMargin,
                expenseBreakdown,
                productProfit,
                pendingOrders: pendingOrders || 0,
                recentOrders: recentOrders || [],
            },
        });
    } catch (err: any) {
        return NextResponse.json(
            { success: false, message: err.message || "Internal Server Error" },
            { status: 500 },
        );
    }
}
