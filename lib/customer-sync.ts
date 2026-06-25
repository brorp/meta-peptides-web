import { supabaseAdmin } from "@/lib/supabase-server";
import { isMissingCustomerUsernameColumn } from "@/lib/order-schema-compat";

export const CUSTOMER_JOURNEY_STAGES = [
    "new_leads",
    "intro",
    "pre_consultation",
    "why_meta",
    "trial_closing",
    "fu_h1",
    "fu_h3",
    "closing",
    "guidelines",
    "shipment_complete",
    "cs_h7",
    "cs_h14",
    "reorder_reminder",
] as const;

export type CustomerJourneyStage = (typeof CUSTOMER_JOURNEY_STAGES)[number];

export const JOURNEY_LABELS: Record<CustomerJourneyStage, string> = {
    new_leads: "New Leads",
    intro: "Intro",
    pre_consultation: "Pre-consultation",
    why_meta: "WhyMeta",
    trial_closing: "Trial Closing",
    fu_h1: "FU H+1",
    fu_h3: "FU H+3",
    closing: "Closing",
    guidelines: "Guidelines",
    shipment_complete: "Shipment Complete",
    cs_h7: "CS H+7",
    cs_h14: "CS H+14",
    reorder_reminder: "Reorder Reminder",
};

const CLOSING_BRANCH_STAGES = new Set<CustomerJourneyStage>([
    "closing",
    "guidelines",
    "shipment_complete",
    "cs_h7",
    "cs_h14",
    "reorder_reminder",
]);

const addDays = (value: string | Date, days: number) => {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setDate(date.getDate() + days);
    return date;
};
const CUSTOMER_SYNC_SELECT =
    "id, full_name, username, whatsapp_phone, email, domicile, lead_source, current_journey, first_order_id, last_order_id, closing_at, journey_updated_at, created_at, updated_at";
const CUSTOMER_TASK_SELECT =
    `${CUSTOMER_SYNC_SELECT}, last_order:orders!customers_last_order_id_fkey(id, created_at, order_items(quantity, products(name, label, usage_days)))`;

export const normalizeUsername = (value: unknown) => {
    const username = String(value || "")
        .trim()
        .replace(/^@+/, "")
        .toLowerCase();

    return username || null;
};

export const normalizePhone = (value: unknown) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) return null;
    if (digits.startsWith("0")) return `62${digits.slice(1)}`;
    return digits;
};

export const isCustomerJourneyStage = (
    value: unknown,
): value is CustomerJourneyStage =>
    CUSTOMER_JOURNEY_STAGES.includes(value as CustomerJourneyStage);

export async function syncCustomersFromOrders() {
    const initialOrdersQuery = await supabaseAdmin
        .from("orders")
        .select(
            "id, created_at, status, shipping_name, shipping_phone, shipping_email, shipping_regional, customer_username",
        )
        .order("created_at", { ascending: true });

    let orders: any[] | null = initialOrdersQuery.data;
    let error = initialOrdersQuery.error;

    if (error && isMissingCustomerUsernameColumn(error)) {
        const fallback = await supabaseAdmin
            .from("orders")
            .select(
                "id, created_at, status, shipping_name, shipping_phone, shipping_email, shipping_regional",
            )
            .order("created_at", { ascending: true });

        orders = fallback.data;
        error = fallback.error;
    }

    if (error) throw new Error(error.message);
    orders = (orders || []).filter((order) => order.status !== "cancelled");
    if (!orders.length) return;

    const { data: customers, error: customersError } = await supabaseAdmin
        .from("customers")
        .select(CUSTOMER_SYNC_SELECT);

    if (customersError) throw new Error(customersError.message);

    const byUsername = new Map<string, any>();
    const byPhone = new Map<string, any>();

    for (const customer of customers || []) {
        const username = normalizeUsername(customer.username);
        const phone = normalizePhone(customer.whatsapp_phone);
        if (username) byUsername.set(username, customer);
        if (phone) byPhone.set(phone, customer);
    }

    for (const order of orders) {
        const username = normalizeUsername((order as any).customer_username);
        const phone = normalizePhone((order as any).shipping_phone);
        const email = String((order as any).shipping_email || "").trim().toLowerCase();

        if (!username && !phone && !email) continue;

        const existing =
            (username ? byUsername.get(username) : null) ||
            (phone ? byPhone.get(phone) : null);

        const basePayload = {
            full_name: (order as any).shipping_name || "Customer",
            username,
            whatsapp_phone: phone,
            email: email || null,
            domicile: (order as any).shipping_regional || null,
            lead_source: "order",
            last_order_id: (order as any).id,
            updated_at: new Date().toISOString(),
        };

        if (!existing) {
            const { data: inserted, error: insertError } = await supabaseAdmin
                .from("customers")
                .insert({
                    ...basePayload,
                    first_order_id: (order as any).id,
                    current_journey: "closing",
                    closing_at: (order as any).created_at,
                    journey_updated_at: (order as any).created_at,
                })
                .select(CUSTOMER_SYNC_SELECT)
                .single();

            if (!insertError && inserted) {
                if (username) byUsername.set(username, inserted);
                if (phone) byPhone.set(phone, inserted);
            }
            continue;
        }

        const orderCreatedAt = new Date((order as any).created_at).getTime();
        const currentClosingAt = existing.closing_at
            ? new Date(existing.closing_at).getTime()
            : 0;
        const shouldRefreshClosing =
            !CLOSING_BRANCH_STAGES.has(existing.current_journey) ||
            orderCreatedAt > currentClosingAt;

        const updatePayload: Record<string, any> = {
            ...basePayload,
            first_order_id: existing.first_order_id || (order as any).id,
        };
        const conflictingUsername = username ? byUsername.get(username) : null;
        const conflictingPhone = phone ? byPhone.get(phone) : null;

        if (conflictingUsername && conflictingUsername.id !== existing.id) {
            updatePayload.username = existing.username || null;
        }
        if (conflictingPhone && conflictingPhone.id !== existing.id) {
            updatePayload.whatsapp_phone = existing.whatsapp_phone || null;
        }

        if (!existing.full_name || existing.full_name === "Customer") {
            updatePayload.full_name = (order as any).shipping_name || "Customer";
        }
        if (!existing.email && email) updatePayload.email = email;
        if (!existing.domicile && (order as any).shipping_regional) {
            updatePayload.domicile = (order as any).shipping_regional;
        }
        if (!existing.username && username) updatePayload.username = username;
        if (!existing.whatsapp_phone && phone) updatePayload.whatsapp_phone = phone;

        if (shouldRefreshClosing) {
            updatePayload.current_journey = "closing";
            updatePayload.closing_at = (order as any).created_at;
            updatePayload.journey_updated_at = (order as any).created_at;
        }

        const { data: updated } = await supabaseAdmin
            .from("customers")
            .update(updatePayload)
            .eq("id", existing.id)
            .select(CUSTOMER_SYNC_SELECT)
            .single();

        const nextCustomer = updated || { ...existing, ...updatePayload };
        if (username) byUsername.set(username, nextCustomer);
        if (phone) byPhone.set(phone, nextCustomer);
    }
}

export async function getPendingCustomerTasks() {
    await syncCustomersFromOrders();

    const { data: customers, error } = await supabaseAdmin
        .from("customers")
        .select(CUSTOMER_TASK_SELECT)
        .order("journey_updated_at", { ascending: true });

    if (error) throw new Error(error.message);

    const now = new Date();
    const tasks: any[] = [];

    for (const customer of customers || []) {
        const stage = customer.current_journey as CustomerJourneyStage;
        const journeyDate = customer.journey_updated_at || customer.created_at;
        const closingDate = customer.closing_at || customer.journey_updated_at;

        if (stage === "trial_closing") {
            const dueAt = addDays(journeyDate, 1);
            if (dueAt <= now) {
                tasks.push({
                    id: `${customer.id}:fu_h1`,
                    task_type: "fu_h1",
                    title: "FU H+1",
                    description:
                        "Send testimonial photo and invite the lead to join other customers buying together.",
                    due_at: dueAt.toISOString(),
                    customer,
                    allowed_next_stages: ["fu_h1", "closing"],
                });
            }
        }

        if (stage === "fu_h1") {
            const dueAt = addDays(journeyDate, 2);
            if (dueAt <= now) {
                tasks.push({
                    id: `${customer.id}:fu_h3`,
                    task_type: "fu_h3",
                    title: "FU H+3",
                    description:
                        "Final follow-up: remind their goals and that the voucher is valid only today.",
                    due_at: dueAt.toISOString(),
                    customer,
                    allowed_next_stages: ["fu_h3", "closing"],
                });
            }
        }

        if (["closing", "guidelines", "shipment_complete"].includes(stage)) {
            const dueAt = addDays(closingDate, 7);
            if (dueAt <= now) {
                tasks.push({
                    id: `${customer.id}:cs_h7`,
                    task_type: "cs_h7",
                    title: "CS H+7",
                    description:
                        "Check in 7 days after closing and update the customer support journey.",
                    due_at: dueAt.toISOString(),
                    customer,
                    allowed_next_stages: ["cs_h7"],
                });
            }
        }

        if (stage === "cs_h7") {
            const dueAt = addDays(journeyDate, 7);
            if (dueAt <= now) {
                tasks.push({
                    id: `${customer.id}:cs_h14`,
                    task_type: "cs_h14",
                    title: "CS H+14",
                    description:
                        "Second support check-in 14 days after closing window.",
                    due_at: dueAt.toISOString(),
                    customer,
                    allowed_next_stages: ["cs_h14"],
                });
            }
        }

        const lastOrder = (customer as any).last_order;
        const orderItems = lastOrder?.order_items || [];
        const maxUsageDays = orderItems.reduce((max: number, item: any) => {
            const usageDays = Number(item.products?.usage_days || 0);
            return Math.max(max, usageDays);
        }, 0);

        if (
            maxUsageDays > 0 &&
            CLOSING_BRANCH_STAGES.has(stage) &&
            stage !== "reorder_reminder"
        ) {
            const dueAt = addDays(closingDate, maxUsageDays);
            if (dueAt <= now) {
                tasks.push({
                    id: `${customer.id}:reorder_reminder`,
                    task_type: "reorder_reminder",
                    title: "Reorder Reminder",
                    description: `Product usage window reached after ${maxUsageDays} day(s).`,
                    due_at: dueAt.toISOString(),
                    customer,
                    allowed_next_stages: ["reorder_reminder", "closing"],
                });
            }
        }
    }

    return tasks.sort(
        (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime(),
    );
}
