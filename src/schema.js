// Used by default for now, will utilize other schemas when I implement the tabs
export const FIELD_SCHEMA = [
    
    { key: "confirmation_no", label: "Confirmation Number" },
    { key: "name", label: "name"},
    { key: "base_cost", label: "Base Cost"},
    { key: "tax_cost", label: "Tax Cost"},
    { key: "total_cost", label: "Total Cost"},
    { key: "phone_number", label: "Phone Number"},
    { key: "email", label: "Email"},
    { key: "commission", label: "Commission"},
    { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD"]},
    { key: "grossOrNet", label: "Gross Or Net", type: "select", options: ["Gross", "Net"]},
    { key: "paymentCount", label: "Payment Count", type: "select", options: [1, 2, 3, 4, 5]}

]

// Payment type options for each dynamic payment box (driven by Payment Count)
export const PAYMENT_TYPE_OPTIONS = [
    "Odenza Card",
    "Guest Card",
    "Uplift Card",
    "Cheque Payment",
    "EFT",
    "FTC",
    "Direct Billing/Invoice",
    "Repeat/Retail Coupon"
]

// Fields every payment box gets regardless of payment type
export const PAYMENT_BASE_FIELDS = [
    { key: "value", label: "Payment Value" },
    { key: "currency", label: "Payment Currency", type: "select", options: ["CAD", "USD"] },
    { key: "date", label: "Payment Date" }
]

// Extra fields shown once a payment box's type is selected
export const PAYMENT_TYPE_EXTRA_FIELDS = {
    "Odenza Card": [{ key: "name_on_card", label: "Name on Card" }],
    "Guest Card": [{ key: "last_4_digits", label: "Last 4 Digits" }],
    "Uplift Card": [{ key: "last_4_digits", label: "Last 4 Digits" }]
}

// For Odenza Reg - extract all information that's static about guests
export const ODENZA_REG_SCHEMA = [
    { key: "agent", label: "Agent"},
    { key: "certificate_code", label: "Certificate Code"},
    { key: "merchant_code", label: "Merchant Code"},
    { key: "merchant_num", label: "Merchant Number"},
    { key: "guest_deposit", label: "Guest Deposit"},
    { key: "guest_in_house_charges", label: "Guest In-house Charges"},
    { key: "guest_profile_number", label: "Guest Profile Number"},
    { key: "first_name", label: "Guest First Name"},
    { key: "last_name", label: "Guest Last Name"},
    { key: "guest_dob", label: "Guest Date of Birth"},
    { key: "guest_address", label: "Guest Address"},
    { key: "guest_city", label: "Guest City"},
    { key: "guest_province_state", label: "Province/State"},
    { key: "guest_postal_zip", label: "Postal/Zip"},
    { key: "guest_country", label: "Guest Country"},
    { key: "guest_phone_number", label: "Guest Phone Number"},
    { key: "guest_email", label:"Guest Email"}
]

// Unused - For individual reservations later
export const INDIVIDUAL_RESERVATION_SCHEMA = [
    { key: "vendor_name", label: "Vendor Name"},
    { key: "confirmation_no", label: "Confirmation Number" },
    { key: "name", label: "Name"},
    { key: "additional_guest_name", label: "Companion Name"},
    { key: "base_cost", label: "Base Cost"},
    { key: "tax_cost", label: "Tax Cost"},
    { key: "total_cost", label: "Total Cost"},
    { key: "phone_number", label: "Phone Number"},
    { key: "email", label: "Email"},
    { key: "commission", label: "Commission"},
    { key: "actual_booking_date", label: "Booking Date"},
    { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD"]},
    { key: "grossOrNet", label: "Gross Or Net", type: "select", options: ["Gross", "Net"]},
    { key: "paymentCount", label: "Payment Count", type: "select", options: [1, 2, 3, 4, 5]}
]

export const SCHEMA_BY_TAB = {
    reservations : INDIVIDUAL_RESERVATION_SCHEMA,
    odenzareg: ODENZA_REG_SCHEMA,
    additional_bookednote_fields: FIELD_SCHEMA
}


