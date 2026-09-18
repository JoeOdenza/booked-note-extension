import type { Field, TabKey } from "./types"

// Unused - For individual reservations later
export const INDIVIDUAL_RESERVATION_SCHEMA = [
    { key: "vendor_name", label: "Vendor Name"},
    { key: "confirmation_no", label: "Confirmation Number" },
    { key: "record_locator", label: "Record Locator" },
    { key: "name", label: "Name"},
    { key: "additional_guest_name", label: "Companion Name"},
    { key: "base_cost", label: "Base Cost"},
    { key: "tax_cost", label: "Tax Cost"},
    { key: "total_cost", label: "Total Cost"},
    { key: "phone_number", label: "Phone Number"},
    { key: "email", label: "Email"},
    { key: "commission", label: "Commission"},
    { key: "actual_booking_date", label: "Booking Date"},
    { key: "start_date", label: "Start Date"},
    { key: "end_date", label: "End Date"},    
    { key: "trip_city", label: "City Traveling To"},
    { key: "trip_region", label: "Region Traveling To"},
    { key: "travel_property", label: "Travel Property"},
    { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD"]},
    { key: "grossOrNet", label: "Gross Or Net", type: "select", options: ["Gross", "Net"]},
    { key: "paymentCount", label: "Payment Count", type: "select", options: [1, 2, 3, 4, 5]}
] as const satisfies Field[]

// Payment type options for each dynamic payment box (driven by Payment Count)
export const PAYMENT_TYPE_OPTIONS: string[] = [
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
export const PAYMENT_BASE_FIELDS: Field[] = [
    { key: "value", label: "Payment Value" },
    { key: "currency", label: "Payment Currency", type: "select", options: ["CAD", "USD"] },
    { key: "date", label: "Payment Date" }
]

// Extra fields shown once a payment box's type is selected
export const PAYMENT_TYPE_EXTRA_FIELDS: Record<string, Field[]> = {
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
] as const satisfies Field[]

// Used by default for now, will utilize other schemas when I implement the tabs
export const ADDITIONAL_FIELD_SCHEMA = [

    { key: "added_guest_cc", label: "Added Guest Credit Card?", type: "checkbox"},
    { key: "guest_deposit", label: "Guest Deposit"},
    { key: "guest_in_house_charges", label: "Guest Inhouse Charges"},
    { key: "additional_travelers_num", label: "Additional Travelers Count", type:"select", options: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
] as const satisfies Field[]

export const ADDITIONAL_TRAVELER_SCHEMA: Field[] = [
    { key: "add_first_name", label: "First Name"},
    { key: "add_middle_name", label: "Middle Name"},
    { key: "add_last_name", label: "Last Name"},
    { key: "add_dob", label: "Date of Birth"},
    { key: "add_relation", label: "Relationship to Main Guest"},
    { key: "add_citizenship", label: "Citizenship"}
] as const satisfies Field[]

export const RES_CARD_SCHEMA: Field[] = [
    { key: "trip_name", label: "Trip Name"},
    { key: "group_type", label: "Group Type"},
    { key: "branch_num", label: "Branch No."},
    { key: "locator_num", label: "Locator Num"},
    { key: "trip_region", label: "Trip Region"},
    { key: "trip_city", label: "Destination"}
] as const satisfies Field[]

export const RES_CARD_RESERVATION_SCHEMA: Field[] = [
    { key: "vendor_name", label: "Vendor"},
    { key: "travel_category", label:"Travel Category"},
    { key: "confirmation_num", label: "Confirmation Number"},
    { key: "locator_num", label: "Locator Number"},
    { key: "currency", label: "Currency"},
    { key: "total_cost", label: "Base Cost"},
    { key: "travel_property", label: "Travel Property"},
    { key: "start_date", label: "Start Date"},
    { key: "end_date", label: "End Date"}

]

export const RES_CARD_SELECTION_SCHEMA = {
    resCard : RES_CARD_SCHEMA,
    reservations: RES_CARD_RESERVATION_SCHEMA,
    additionalTravler: ADDITIONAL_TRAVELER_SCHEMA,
}


export const SCHEMA_BY_TAB: Record<TabKey, readonly Field[]> = {
    reservations : INDIVIDUAL_RESERVATION_SCHEMA,
    odenzareg: ODENZA_REG_SCHEMA,
    additional_bookednote_fields: ADDITIONAL_FIELD_SCHEMA
}

// Every schema, named -- the source of truth for both SCHEMA_BY_TAB and the
// schema-qualified field key type below, so a new schema only needs to be added here.
export const SCHEMAS = {
    fieldSchema: ADDITIONAL_FIELD_SCHEMA,
    odenzaReg: ODENZA_REG_SCHEMA,
    individualReservation: INDIVIDUAL_RESERVATION_SCHEMA
} as const

export type SchemaName = keyof typeof SCHEMAS

// "schemaName.fieldKey", e.g. "individualReservation.base_cost" -- scopes each key to the
// schema it actually belongs to, so a key from one schema can't be mistaken for another's.
export type QualifiedFieldKey = {
    [S in SchemaName]: `${S}.${(typeof SCHEMAS)[S][number]["key"]}`
}[SchemaName]


