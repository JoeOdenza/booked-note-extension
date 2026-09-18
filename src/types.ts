export interface Field {
    key: string
    label: string
    type?: "select"
    options?: (string | number)[]
}

export type FieldValues = Record<string, string>

export type Layout = Record<string, string>
export type Layouts = Record<string, Layout>

export type Mode = "idle" | "naming" | "creating"

export type TabKey = "reservations" | "odenzareg" | "additional_bookednote_fields"
