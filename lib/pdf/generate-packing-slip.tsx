import React from "react";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
    page: {
        padding: 12,
        fontSize: 11,
        fontFamily: "Helvetica",
        color: "#000",
    },
    header: {
        textAlign: "center" as const,
        marginBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: "#000",
        paddingBottom: 6,
    },
    title: {
        fontSize: 18,
        fontFamily: "Helvetica-Bold",
        color: "#000",
        textTransform: "uppercase" as const,
    },
    subtitle: {
        fontSize: 10,
        color: "#000",
        marginTop: 2,
    },
    addressRow: {
        marginBottom: 8,
        gap: 6,
    },
    addressBox: {
        borderWidth: 1,
        borderColor: "#000",
        padding: 7,
    },
    addressLabel: {
        fontFamily: "Helvetica-Bold",
        fontSize: 10,
        color: "#000",
        textTransform: "uppercase" as const,
        marginBottom: 3,
    },
    addressText: {
        fontSize: 13,
        lineHeight: 1.25,
        color: "#000",
        fontFamily: "Helvetica-Bold",
    },
    addressSmall: {
        fontSize: 11,
        color: "#000",
        marginTop: 3,
        lineHeight: 1.25,
    },
    metaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#000",
        padding: 6,
    },
    metaItem: {
        flex: 1,
    },
    metaLabel: {
        fontSize: 8,
        color: "#000",
        textTransform: "uppercase" as const,
    },
    metaValue: {
        fontSize: 11,
        fontFamily: "Helvetica-Bold",
        color: "#000",
        marginTop: 2,
    },
    section: {
        marginBottom: 8,
    },
    sectionTitle: {
        fontFamily: "Helvetica-Bold",
        fontSize: 11,
        color: "#000",
        marginBottom: 4,
        textTransform: "uppercase" as const,
    },
    tableHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 5,
        borderBottomWidth: 2,
        borderBottomColor: "#000",
    },
    headerText: {
        fontFamily: "Helvetica-Bold",
        fontSize: 10,
        color: "#000",
        textTransform: "uppercase" as const,
    },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: "#000",
    },
    itemName: {
        fontSize: 12,
        color: "#000",
        flex: 5,
        lineHeight: 1.2,
    },
    itemQty: {
        fontSize: 13,
        color: "#000",
        flex: 1,
        textAlign: "right" as const,
        fontFamily: "Helvetica-Bold",
    },
    trackingBox: {
        marginTop: 8,
        borderWidth: 2,
        borderColor: "#000",
        borderStyle: "dashed",
        padding: 8,
        textAlign: "center" as const,
    },
    trackingLabel: {
        fontSize: 10,
        color: "#000",
        textTransform: "uppercase" as const,
    },
    trackingNumber: {
        minHeight: 28,
        fontSize: 18,
        fontFamily: "Helvetica-Bold",
        color: "#000",
        marginTop: 10,
    },
    footer: {
        textAlign: "center" as const,
        fontSize: 9,
        color: "#000",
        borderTopWidth: 1,
        borderTopColor: "#000",
        paddingTop: 5,
        marginTop: 6,
    },
});

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function getOrderItems(order: any) {
    return (order.order_items || []).map((item: any) => ({
        ...item,
        isComplimentary: Number(item.price_at_purchase) === 0,
    }));
}

function getProductDisplayName(product: any) {
    const parts = [product?.name, product?.label, product?.volume]
        .map((value) => String(value || "").trim())
        .filter(Boolean);

    return Array.from(new Set(parts)).join(" - ") || "Product";
}

export function PackingSlipDocument({ order }: { order: any }) {
    const orderItems = getOrderItems(order);
    const complimentaryItems = orderItems.filter((item: any) => item.isComplimentary);
    const totalQuantity = orderItems.reduce(
        (sum: number, item: any) => sum + Number(item.quantity || 0),
        0,
    );

    return (
        <Document>
            <Page size={[288, 432]} style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>Packing Slip</Text>
                    <Text style={styles.subtitle}>Meta Peptides</Text>
                </View>

                <View style={styles.addressRow}>
                    <View style={styles.addressBox}>
                        <Text style={styles.addressLabel}>From</Text>
                        <Text style={styles.addressText}>Meta Wellness</Text>
                        <Text style={styles.addressSmall}>
                            +6285191378506{"\n"}
                            support@meta-peptides.com
                        </Text>
                    </View>
                    <View style={styles.addressBox}>
                        <Text style={styles.addressLabel}>To</Text>
                        <Text style={styles.addressText}>
                            {order.shipping_name || "Customer"}
                        </Text>
                        <Text style={styles.addressSmall}>
                            {order.shipping_phone || ""}{"\n"}
                            {order.shipping_address || ""}
                            {order.shipping_regional
                                ? `\n${order.shipping_regional}`
                                : ""}
                            {order.shipping_zip ? ` ${order.shipping_zip}` : ""}
                        </Text>
                    </View>
                </View>

                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Order</Text>
                        <Text style={styles.metaValue}>
                            {order.id.slice(0, 8).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Date</Text>
                        <Text style={styles.metaValue}>
                            {formatDate(order.created_at)}
                        </Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Qty</Text>
                        <Text style={styles.metaValue}>{totalQuantity}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Package Contents</Text>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.headerText, { flex: 5 }]}>Item</Text>
                        <Text style={[styles.headerText, { flex: 1, textAlign: "right" }]}>
                            Qty
                        </Text>
                    </View>
                    {orderItems.map((item: any, i: number) => (
                        <View key={i} style={styles.itemRow}>
                            <Text style={styles.itemName}>
                                {getProductDisplayName(item.products)}
                                {item.isComplimentary ? " (FREE)" : ""}
                            </Text>
                            <Text style={styles.itemQty}>{item.quantity}</Text>
                        </View>
                    ))}
                </View>

                {complimentaryItems.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Packing Note</Text>
                        <Text style={styles.addressSmall}>
                            Free items are included at no charge and must be packed
                            with the paid products.
                        </Text>
                    </View>
                )}

                <View style={styles.trackingBox}>
                    <Text style={styles.trackingLabel}>Tracking Number / Resi</Text>
                    <Text style={styles.trackingNumber}> </Text>
                </View>

                <Text style={styles.footer}>
                    meta-peptides.com | Handle with care
                </Text>
            </Page>
        </Document>
    );
}
