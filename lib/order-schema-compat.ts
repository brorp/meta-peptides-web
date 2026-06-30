export const isMissingCustomerUsernameColumn = (error: any) =>
    String(error?.message || error || "")
        .toLowerCase()
        .includes("customer_username");

export const isMissingTrackingNumberColumn = (error: any) =>
    String(error?.message || error || "")
        .toLowerCase()
        .includes("tracking_number");

export const withoutCustomerUsername = <T extends Record<string, any>>(
    payload: T,
) => {
    const { customer_username, ...rest } = payload;
    return rest;
};

export const withoutTrackingNumber = <T extends Record<string, any>>(
    payload: T,
) => {
    const { tracking_number, ...rest } = payload;
    return rest;
};

export const withoutTrackingNumberSelect = (select: string) =>
    select
        .replace("tracking_number, ", "")
        .replace(", tracking_number", "");
