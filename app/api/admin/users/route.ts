import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { paginateResponse, errorResponse } from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/admin-api";

const mergeAuthUserWithProfile = (authUser: any, profile?: any) => ({
    id: authUser.id,
    email: authUser.email || profile?.email || null,
    full_name:
        profile?.full_name ||
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        null,
    phone: profile?.phone || authUser.phone || null,
    role: profile?.role || authUser.app_metadata?.role || "customer",
    created_at: profile?.created_at || authUser.created_at || null,
    has_profile: !!profile,
});

export async function GET(req: NextRequest) {
    try {
        const auth = await requireAdminApiSession();
        if (auth.response) return auth.response;

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const keyword = (searchParams.get("keyword") || "").trim().toLowerCase();

        const from = (page - 1) * limit;
        const shouldFilterLocally = keyword.length > 0;

        const { data: authUsersData, error: authUsersError } =
            await supabaseAdmin.auth.admin.listUsers({
                page: shouldFilterLocally ? 1 : page,
                perPage: shouldFilterLocally ? 1000 : limit,
            });

        if (authUsersError) return errorResponse(authUsersError.message, 400);

        const authUsers = authUsersData?.users || [];
        const userIds = authUsers.map((user) => user.id);

        let profileMap = new Map<string, any>();
        if (userIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabaseAdmin
                .from("profiles")
                .select("id, email, full_name, phone, role, created_at")
                .in("id", userIds);

            if (profilesError) return errorResponse("Failed to load user profiles", 400);

            profileMap = new Map(
                (profiles || []).map((profile: any) => [profile.id, profile]),
            );
        }

        let mergedUsers = authUsers.map((authUser) =>
            mergeAuthUserWithProfile(authUser, profileMap.get(authUser.id)),
        );

        if (shouldFilterLocally) {
            mergedUsers = mergedUsers
                .filter((user) =>
                    [user.email, user.full_name, user.phone]
                        .filter(Boolean)
                        .some((value) =>
                            String(value).toLowerCase().includes(keyword),
                        ),
                )
                .sort((a, b) => {
                    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return bTime - aTime;
                });
        }

        const totalItems = shouldFilterLocally
            ? mergedUsers.length
            : authUsersData?.total || mergedUsers.length;
        const paginatedUsers = shouldFilterLocally
            ? mergedUsers.slice(from, from + limit)
            : mergedUsers;

        return paginateResponse(
            paginatedUsers,
            page,
            limit,
            totalItems,
            "Users retrieved",
        );
    } catch (err: any) {
        return errorResponse("Failed to load users", 500);
    }
}
