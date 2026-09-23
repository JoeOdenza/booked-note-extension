import { useState } from 'react'
import { ResCardPanelProps } from '@/types'
import { RES_CARD_SCHEMA, RES_CARD_RESERVATION_SCHEMA, ADDITIONAL_TRAVELER_SCHEMA } from "@/schema"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs"
import { Button } from "./ui/button"

function InputField({ label, value }: { label: string; value: string }) {

    const handleCopy = () =>{
        navigator.clipboard.writeText(String(value))
    }

    return (
        <div className="grid grid-cols-[110px_1fr_auto] items-center gap-2">
            <label className="truncate text-sm font-medium text-muted-foreground">
                {label}
            </label>
            <input
                value={value}
                readOnly
                title={value}
                className="w-full min-w-0 truncate rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                Copy
            </Button>
        </div>
    )
}

function SelectField({
    label,
    value,
    onChange,
    options,
}: {
    label: string
    value: number
    onChange: (index: number) => void
    options: string[]
}) {
    return (
        <label className="mb-3 flex flex-col gap-1">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </span>
            <select
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
                {options.map((label, i) => (
                    <option key={i} value={i}>
                        {label}
                    </option>
                ))}
            </select>
        </label>
    )
}


export default function ResCardPanel({ data, agentMarkup }: ResCardPanelProps & {agentMarkup : number}) {
    
    // Index selection for reservations
    const [resIndex, setResIndex] = useState<number>(0)

    //Index selection for additional travelers
    const [addTravelerIndex, setAddTravelerIndex] = useState<number>(0)


    return (
        <Tabs defaultValue="resCard" className="w-[440px]">
          <TabsList className="w-full">
            <TabsTrigger value="resCard">Res Card</TabsTrigger>
            <TabsTrigger value="reservations">Reservations</TabsTrigger>
            <TabsTrigger value="addTravelers">Additional Travelers</TabsTrigger>
          </TabsList>
          <TabsContent value="resCard">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Res Card</CardTitle>
                <CardDescription>
                  Copy Main Res Card Information Here
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {RES_CARD_SCHEMA.map((field) => (
                    <InputField
                        key={field.key}
                        label={field.label}
                        value={data.resCard[field.key] ?? "-"}
                    />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="reservations">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Reservations</CardTitle>
                <CardDescription>
                  Copy Individual Reservation Information Here
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <InputField
                  key="agentMarkup"
                  label="Agent Markup:"
                  value={agentMarkup.toString()}
                />
                <SelectField
                    label="Reservation"
                    value={resIndex}
                    onChange={setResIndex}
                    options={data.reservations.map(
                        (r, i) => r.vendor_name || `Reservation ${i + 1}`
                    )}
                />
                {RES_CARD_RESERVATION_SCHEMA.map((field) => (
                    <InputField
                        key={field.key}
                        label={field.label}
                        value={data.reservations[resIndex][field.key] ?? ""}
                    />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="addTravelers">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Additional Travelers</CardTitle>
                <CardDescription>
                  Copy Additional Traveler Information Here
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <SelectField
                    label="Traveler"
                    value={addTravelerIndex}
                    onChange={setAddTravelerIndex}
                    options={data.additionalTravelers.map((_, i) => `Traveler ${i + 1}`)}
                />
                {ADDITIONAL_TRAVELER_SCHEMA.map((field) => (
                    <InputField
                        key={field.key}
                        label={field.label}
                        value={data.additionalTravelers[addTravelerIndex][field.key] ?? ""}
                    />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    )
}