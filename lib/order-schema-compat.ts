export const isMissingCustomerUsernameColumn = (error: any) =>
    String(error?.message || error || "")
        .toLowerCase()
        .includes("customer_username");

export const withoutCustomerUsername = <T extends Record<string, any>>(
    payload: T,
) => {
    const { customer_username, ...rest } = payload;
    return rest;
};
