export interface Field {
    key: string
    label: string
    type?: "select" | "checkbox"
    options?: (string | number)[]
}

export type FieldValues = Record<string, string>

export type Layout = Record<string, string>
export type Layouts = Record<string, Layout>
export type LayoutData = Record<string, FieldValues>

export type Mode = "idle" | "naming" | "creating"

export type TabKey = "reservations" | "odenzareg" | "additional_bookednote_fields"

export type LayoutsByTab = Record<TabKey, Layouts>
export type LayoutDataByTab = Record<TabKey, LayoutData>

// A single saved reservation: its own field values, plus which saved Layout (selector mapping)
// it uses for Scan/Apply. Two reservations can share the same layoutName -- the layout stays a
// reusable template, while each reservation keeps its data in its own slot below.
export interface Reservation {
    id: string
    label: string
    layoutName: string
    fieldValues: FieldValues
    createdAt: number
}

export type Reservations = Record<string, Reservation>

export interface StorageShape {
    layouts: LayoutsByTab
    layoutData?: LayoutDataByTab
    reservations?: Reservations
}
