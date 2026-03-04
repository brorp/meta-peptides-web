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
        padding: 30,
        fontSize: 10,
        fontFamily: "Helvetica",
        color: "#1a1a1a",
    },
    header: {
        textAlign: "center" as const,
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: "#414042",
        paddingBottom: 15,
    },
    title: {
        fontSize: 16,
        fontFamily: "Helvetica-Bold",
        color: "#414042",
        textTransform: "uppercase" as const,
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 8,
        color: "#888",
        marginTop: 3,
    },
    addressRow: {
        flexDirection: "row",
        marginBottom: 20,
        gap: 20,
    },
    addressBox: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 4,
        padding: 12,
    },
    addressLabel: {
        fontFamily: "Helvetica-Bold",
        fontSize: 8,
        color: "#414042",
        textTransform: "uppercase" as const,
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    addressText: {
        fontSize: 10,
        lineHeight: 1.5,
        color: "#333",
    },
    addressSmall: {
        fontSize: 8,
        color: "#666",
        marginTop: 2,
        lineHeight: 1.4,
    },
    metaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 15,
        backgroundColor: "#f5f5f5",
        padding: 10,
        borderRadius: 4,
    },
    metaItem: {
        alignItems: "center" as const,
    },
    metaLabel: {
        fontSize: 7,
        color: "#888",
        textTransform: "uppercase" as const,
    },
    metaValue: {
        fontSize: 10,
        fontFamily: "Helvetica-Bold",
        color: "#414042",
        marginTop: 2,
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontFamily: "Helvetica-Bold",
        fontSize: 9,
        color: "#414042",
        marginBottom: 8,
        textTransform: "uppercase" as const,
        letterSpacing: 0.5,
    },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    itemName: {
        fontSize: 10,
        color: "#333",
        flex: 3,
    },
    itemQty: {
        fontSize: 10,
        color: "#333",
        flex: 1,
        textAlign: "center" as const,
    },
    trackingBox: {
        marginTop: 20,
        borderWidth: 2,
        borderColor: "#414042",
        borderStyle: "dashed",
        borderRadius: 4,
        padding: 15,
        textAlign: "center" as const,
    },
    trackingLabel: {
        fontSize: 8,
        color: "#888",
        textTransform: "uppercase" as const,
        letterSpacing: 1,
    },
    trackingNumber: {
        fontSize: 16,
        fontFamily: "Helvetica-Bold",
        color: "#414042",
        marginTop: 6,
        letterSpacing: 2,
    },
    footer: {
        position: "absolute" as const,
        bottom: 20,
        left: 30,
        right: 30,
        textAlign: "center" as const,
        fontSize: 7,
        color: "#bbb",
        borderTopWidth: 1,
        borderTopColor: "#eee",
        paddingTop: 8,
    },
});

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

export function PackingSlipDocument({ order }: { order: any }) {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Packing Slip</Text>
                    <Text style={styles.subtitle}>
                        Resi Pengiriman — MetaPeptides
                    </Text>
                </View>

                {/* Sender / Recipient */}
                <View style={styles.addressRow}>
                    <View style={styles.addressBox}>
                        <Text style={styles.addressLabel}>From (Pengirim)</Text>
                        <Text style={styles.addressText}>MetaPeptides</Text>
                        <Text style={styles.addressSmall}>
                            Research Peptide Supplier{"\n"}
                            Jakarta, Indonesia{"\n"}
                            support@meta-peptides.com
                        </Text>
                    </View>
                    <View style={styles.addressBox}>
                        <Text style={styles.addressLabel}>To (Penerima)</Text>
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

                {/* Order Meta */}
                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Order ID</Text>
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
                        <Text style={styles.metaLabel}>Items</Text>
                        <Text style={styles.metaValue}>
                            {order.order_items?.length || 0}
                        </Text>
                    </View>
                </View>

                {/* Items List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Package Contents</Text>
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            paddingVertical: 6,
                            borderBottomWidth: 2,
                            borderBottomColor: "#414042",
                        }}
                    >
                        <Text
                            style={{
                                fontFamily: "Helvetica-Bold",
                                fontSize: 8,
                                flex: 3,
                                textTransform: "uppercase" as const,
                            }}
                        >
                            Item
                        </Text>
                        <Text
                            style={{
                                fontFamily: "Helvetica-Bold",
                                fontSize: 8,
                                flex: 1,
                                textAlign: "center" as const,
                                textTransform: "uppercase" as const,
                            }}
                        >
                            Qty
                        </Text>
                    </View>
                    {(order.order_items || []).map((item: any, i: number) => (
                        <View key={i} style={styles.itemRow}>
                            <Text style={styles.itemName}>
                                {item.products?.name || "Product"}
                            </Text>
                            <Text style={styles.itemQty}>{item.quantity}</Text>
                        </View>
                    ))}
                </View>

                {/* Tracking Number */}
                <View style={styles.trackingBox}>
                    <Text style={styles.trackingLabel}>Tracking Number / No. Resi</Text>
                    <Text style={styles.trackingNumber}>
                        {order.tracking_number || "— TBD —"}
                    </Text>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    MetaPeptides — meta-peptides.com | Handle with care — Research
                    compounds
                </Text>
            </Page>
        </Document>
    );
}
