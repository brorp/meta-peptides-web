import React from "react";
import {
    Document,
    Image,
    Page,
    renderToBuffer,
    Text,
    View,
    StyleSheet,
} from "@react-pdf/renderer";
import { META_PEPTIDES_LOGO_URL } from "@/lib/brand";

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: "Helvetica",
        color: "#1a1a1a",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 30,
        borderBottomWidth: 2,
        borderBottomColor: "#414042",
        paddingBottom: 15,
        alignItems: "flex-start" as const,
        gap: 16,
    },
    brandBlock: {
        flex: 1,
    },
    logo: {
        width: 136,
        height: 74,
        objectFit: "contain" as const,
        marginBottom: 6,
    },
    companyName: {
        fontSize: 18,
        fontFamily: "Helvetica-Bold",
        color: "#414042",
    },
    companyInfo: {
        fontSize: 8,
        color: "#666",
        marginTop: 4,
        lineHeight: 1.5,
    },
    invoiceTitle: {
        fontSize: 24,
        fontFamily: "Helvetica-Bold",
        color: "#414042",
        textAlign: "right" as const,
    },
    invoiceMeta: {
        fontSize: 9,
        color: "#666",
        textAlign: "right" as const,
        marginTop: 4,
        lineHeight: 1.5,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontFamily: "Helvetica-Bold",
        fontSize: 9,
        color: "#414042",
        marginBottom: 6,
        textTransform: "uppercase" as const,
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 2,
    },
    label: {
        color: "#888",
        fontSize: 9,
    },
    value: {
        fontSize: 9,
        color: "#1a1a1a",
    },
    table: {
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#f5f5f5",
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    colProduct: { flex: 3 },
    colQty: { flex: 1, textAlign: "center" as const },
    colPrice: { flex: 2, textAlign: "right" as const },
    colTotal: { flex: 2, textAlign: "right" as const },
    headerText: {
        fontFamily: "Helvetica-Bold",
        fontSize: 8,
        color: "#414042",
        textTransform: "uppercase" as const,
    },
    cellText: {
        fontSize: 9,
        color: "#333",
    },
    totalsSection: {
        marginTop: 15,
        borderTopWidth: 2,
        borderTopColor: "#414042",
        paddingTop: 10,
        alignItems: "flex-end" as const,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginBottom: 4,
        width: 200,
    },
    totalLabel: {
        fontSize: 9,
        color: "#888",
        flex: 1,
    },
    totalValue: {
        fontSize: 9,
        color: "#1a1a1a",
        textAlign: "right" as const,
        flex: 1,
    },
    grandTotal: {
        fontSize: 14,
        fontFamily: "Helvetica-Bold",
        color: "#414042",
    },
    footer: {
        position: "absolute" as const,
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: "center" as const,
        fontSize: 8,
        color: "#999",
        borderTopWidth: 1,
        borderTopColor: "#eee",
        paddingTop: 10,
    },
});

function formatCurrency(value: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(value);
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function getOrderItems(order: any) {
    return (order.order_items || []).map((item: any) => ({
        ...item,
        isComplimentary: Number(item.price_at_purchase) === 0,
    }));
}

export function InvoiceDocument({ order }: { order: any }) {
    const orderItems = getOrderItems(order);
    const complimentaryItems = orderItems.filter((item: any) => item.isComplimentary);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.brandBlock}>
                        <Image src={META_PEPTIDES_LOGO_URL} style={styles.logo} />
                        <Text style={styles.companyInfo}>
                            Premium Research Peptides{"\n"}
                            meta-peptides.com{"\n"}
                            support@meta-peptides.com
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.invoiceTitle}>INVOICE</Text>
                        <Text style={styles.invoiceMeta}>
                            Invoice #{order.id.slice(0, 8).toUpperCase()}
                            {"\n"}
                            Date: {formatDate(order.created_at)}
                        </Text>
                    </View>
                </View>

                {/* Bill To */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Bill To</Text>
                    <View style={styles.row}>
                        <Text style={styles.value}>{order.shipping_name || "Guest"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>{order.shipping_phone || ""}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>{order.shipping_email || ""}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>
                            {order.shipping_address || ""}
                            {order.shipping_regional
                                ? `, ${order.shipping_regional}`
                                : ""}
                            {order.shipping_zip ? ` ${order.shipping_zip}` : ""}
                        </Text>
                    </View>
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.headerText, styles.colProduct]}>Product</Text>
                        <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
                        <Text style={[styles.headerText, styles.colPrice]}>
                            Unit Price
                        </Text>
                        <Text style={[styles.headerText, styles.colTotal]}>Total</Text>
                    </View>
                    {orderItems.map((item: any, i: number) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={[styles.cellText, styles.colProduct]}>
                                {item.products?.name || "Product"}
                                {item.isComplimentary ? " (Complimentary)" : ""}
                            </Text>
                            <Text style={[styles.cellText, styles.colQty]}>
                                {item.quantity}
                            </Text>
                            <Text style={[styles.cellText, styles.colPrice]}>
                                {item.isComplimentary
                                    ? "FREE"
                                    : formatCurrency(item.price_at_purchase)}
                            </Text>
                            <Text style={[styles.cellText, styles.colTotal]}>
                                {item.isComplimentary
                                    ? "FREE"
                                    : formatCurrency(item.price_at_purchase * item.quantity)}
                            </Text>
                        </View>
                    ))}
                </View>

                {complimentaryItems.length > 0 && (
                    <View style={{ marginTop: 10 }}>
                        <Text
                            style={{
                                fontSize: 8,
                                color: "#2f855a",
                                lineHeight: 1.5,
                            }}
                        >
                            Complimentary items are included at no charge and are listed
                            above for packing and reference purposes.
                        </Text>
                    </View>
                )}

                {/* Totals */}
                <View style={styles.totalsSection}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Subtotal</Text>
                        <Text style={styles.totalValue}>
                            {formatCurrency(order.subtotal || order.total_price)}
                        </Text>
                    </View>
                    <View style={[styles.totalRow, { marginTop: 6 }]}>
                        <Text style={[styles.totalLabel, styles.grandTotal]}>Total</Text>
                        <Text style={[styles.totalValue, styles.grandTotal]}>
                            {formatCurrency(order.total_price)}
                        </Text>
                    </View>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    Thank you for your order — MetaPeptides | meta-peptides.com
                </Text>
            </Page>
        </Document>
    );
}

export async function renderInvoicePdfBuffer(order: any): Promise<Buffer> {
    return renderToBuffer(
        React.createElement(InvoiceDocument, { order }) as any,
    );
}
