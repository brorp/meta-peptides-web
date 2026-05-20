import React from "react";
import { readFileSync } from "fs";
import {
    Document,
    Image,
    Page,
    Text,
    View,
    StyleSheet,
} from "@react-pdf/renderer";

const PACKING_SLIP_LOGO_SRC = `data:image/png;base64,${readFileSync(
    `${process.cwd()}/public/icon-meta.png`,
).toString("base64")}`;

const styles = StyleSheet.create({
    page: {
        padding: 8,
        fontSize: 9,
        fontFamily: "Helvetica",
        color: "#000",
    },
    body: {
        width: "100%",
    },
    header: {
        textAlign: "center" as const,
        marginBottom: 5,
        borderBottomWidth: 2,
        borderBottomColor: "#000",
        paddingBottom: 4,
    },
    logo: {
        width: 38,
        height: 38,
        objectFit: "contain" as const,
        alignSelf: "center" as const,
        marginBottom: 2,
    },
    title: {
        fontSize: 17,
        fontFamily: "Helvetica-Bold",
        color: "#000",
        textTransform: "uppercase" as const,
    },
    addressRow: {
        marginBottom: 5,
        gap: 4,
    },
    addressBox: {
        borderWidth: 1,
        borderColor: "#000",
        padding: 5,
    },
    addressLabel: {
        fontFamily: "Helvetica-Bold",
        fontSize: 8,
        color: "#000",
        textTransform: "uppercase" as const,
        marginBottom: 2,
    },
    addressText: {
        fontSize: 13,
        lineHeight: 1.12,
        color: "#000",
        fontFamily: "Helvetica-Bold",
    },
    addressSmall: {
        fontSize: 10,
        color: "#000",
        marginTop: 2,
        lineHeight: 1.12,
    },
    senderText: {
        fontSize: 10,
        color: "#000",
        fontFamily: "Helvetica-Bold",
        lineHeight: 1.1,
    },
    senderSmall: {
        fontSize: 9,
        color: "#000",
        marginTop: 1,
        lineHeight: 1.08,
    },
    metaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 5,
        borderWidth: 1,
        borderColor: "#000",
        padding: 4,
    },
    metaItem: {
        flex: 1,
    },
    metaLabel: {
        fontSize: 7,
        color: "#000",
        textTransform: "uppercase" as const,
    },
    metaValue: {
        fontSize: 10,
        fontFamily: "Helvetica-Bold",
        color: "#000",
        marginTop: 1,
    },
    section: {
        marginBottom: 5,
    },
    sectionTitle: {
        fontFamily: "Helvetica-Bold",
        fontSize: 10,
        color: "#000",
        marginBottom: 2,
        textTransform: "uppercase" as const,
    },
    tableHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 3,
        borderBottomWidth: 2,
        borderBottomColor: "#000",
    },
    headerText: {
        fontFamily: "Helvetica-Bold",
        fontSize: 9,
        color: "#000",
        textTransform: "uppercase" as const,
    },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 3,
        borderBottomWidth: 1,
        borderBottomColor: "#000",
    },
    itemName: {
        fontSize: 10,
        color: "#000",
        flex: 5,
        lineHeight: 1.1,
    },
    itemNameCompact: {
        fontSize: 9,
        lineHeight: 1.05,
    },
    itemQty: {
        fontSize: 11,
        color: "#000",
        flex: 1,
        textAlign: "right" as const,
        fontFamily: "Helvetica-Bold",
    },
    trackingBox: {
        marginTop: 5,
        borderWidth: 2,
        borderColor: "#000",
        borderStyle: "dashed",
        padding: 7,
        textAlign: "center" as const,
    },
    trackingLabel: {
        fontSize: 9,
        color: "#000",
        textTransform: "uppercase" as const,
    },
    trackingNumber: {
        minHeight: 26,
        fontSize: 12,
        fontFamily: "Helvetica-Bold",
        color: "#000",
        marginTop: 4,
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

function sanitizeSlipText(value: unknown) {
    return String(value || "")
        .replace(/meta\s*peptides/gi, "")
        .replace(/metapeptides/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function getPackingSlipItemCode(product: any) {
    return sanitizeSlipText(product?.label) || "Product";
}

export function PackingSlipDocument({ order }: { order: any }) {
    const orderItems = getOrderItems(order);
    const totalQuantity = orderItems.reduce(
        (sum: number, item: any) => sum + Number(item.quantity || 0),
        0,
    );
    const orderCode = sanitizeSlipText(order.id).slice(0, 8).toUpperCase();
    const isDenseOrder = orderItems.length > 6;

    return (
        <Document>
            <Page size={[288, 432]} style={styles.page}>
                <View style={styles.body} wrap={false}>
                    <View style={styles.header}>
                        <Image src={PACKING_SLIP_LOGO_SRC} style={styles.logo} />
                        <Text style={styles.title}>Packing Slip</Text>
                    </View>

                    <View style={styles.addressRow}>
                        <View style={styles.addressBox}>
                            <Text style={styles.addressLabel}>Sender</Text>
                            <Text style={styles.senderText}>MetaWellness</Text>
                            <Text style={styles.senderSmall}>081513392028</Text>
                        </View>
                        <View style={styles.addressBox}>
                            <Text style={styles.addressLabel}>Recipient</Text>
                            <Text style={styles.addressText}>
                                {sanitizeSlipText(order.shipping_name) || "Customer"}
                            </Text>
                            <Text style={styles.addressSmall}>
                                {sanitizeSlipText(order.shipping_phone)}
                                {order.shipping_phone ? "\n" : ""}
                                {sanitizeSlipText(order.shipping_address)}
                                {order.shipping_regional
                                    ? `\n${sanitizeSlipText(order.shipping_regional)}`
                                    : ""}
                                {order.shipping_zip
                                    ? ` ${sanitizeSlipText(order.shipping_zip)}`
                                    : ""}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>Order</Text>
                            <Text style={styles.metaValue}>{orderCode}</Text>
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
                            <Text
                                style={[
                                    styles.headerText,
                                    { flex: 1, textAlign: "right" },
                                ]}
                            >
                                Qty
                            </Text>
                        </View>
                        {orderItems.map((item: any, i: number) => (
                            <View key={i} style={styles.itemRow}>
                                <Text
                                    style={[
                                        styles.itemName,
                                        isDenseOrder ? styles.itemNameCompact : {},
                                    ]}
                                >
                                    {getPackingSlipItemCode(item.products)}
                                    {item.isComplimentary ? " (FREE)" : ""}
                                </Text>
                                <Text style={styles.itemQty}>{item.quantity}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.trackingBox}>
                        <Text style={styles.trackingLabel}>Tracking Number / Resi</Text>
                        <Text style={styles.trackingNumber}> </Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
}
