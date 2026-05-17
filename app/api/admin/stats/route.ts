import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

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

        // Revenue (sum of total_price from paid/active order statuses)
        const { data: revenueData } = await supabaseAdmin
            .from("orders")
            .select("total_price")
            .in("status", ["completed", "processing"]);

        const totalRevenue = (revenueData || []).reduce(
            (sum, order) => sum + (order.total_price || 0),
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
                totalRevenue,
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
