import { Field } from './types'

export const RES_CARD_SCHEMA: Field[] = [
    { key: "trip_name", label: "Trip Name"},
    { key: "marketing_source", label: "Marketing Source"},
    { key: "group_type", label: "Group Type"},
    { key: "branch_num", label: "Branch No."},
    { key: "locator_num", label: "Locator Num"},
    { key: "trip_region", label: "Trip Region"},
    { key: "trip_city", label: "Destination"},
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
    { key: "end_date", label: "End Date"},
    { key: "commission", label: "Commission"}
]

export const ADDITIONAL_TRAVELER_SCHEMA: Field[] = [
    { key: "add_first_name", label: "First Name"},
    { key: "add_middle_name", label: "Middle Name"},
    { key: "add_last_name", label: "Last Name"},
    { key: "add_dob", label: "Date of Birth"},
    { key: "add_relation", label: "Relationship to Main Guest"},
    { key: "add_citizenship", label: "Citizenship"}
] as const satisfies Field[]