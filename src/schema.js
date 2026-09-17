export const FIELD_SCHEMA = [
    { key: "confirmation_no", label: "Confirmation Number" },
    { key: "name", label: "name"},
    { key: "base_cost", label: "Base Cost"},
    { key: "tax_cost", label: "Tax Cost"},
    { key: "total_cost", label: "Total Cost"},
    { key: "phone_number", label: "Phone Number"},
    { key: "email", label: "Email"},
    { key: "commission", label: "Commission"},
    { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD"]}

]

// Unused - For individual reservations later
export const INDIVIDUAL_RESERVATION_SCHEMA = [
    { key: "confirmation_no", label: "Confirmation Number" },
    { key: "name", label: "Name"},
    { key: "base_cost", label: "Base Cost"},
    { key: "tax_cost", label: "Tax Cost"},
    { key: "total_cost", label: "Total Cost"},
    { key: "phone_number", label: "Phone Number"},
    { key: "email", label: "Email"},
    { key: "commission", label: "Commission"},
    { key: "actual_booking_date", label: "Actual Booking Date"},
    { key: "currency", label: "Currency", type: "select", options: ["CAD", "USD"]},
    { key: "grossOrNet", label: "Gross Or Net", type: "select", options: ["Gross", "Net"]}
]
