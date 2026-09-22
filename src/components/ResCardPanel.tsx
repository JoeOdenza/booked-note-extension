import { ResCardTabKey } from "@/types"
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

function InputField({ label, value }: { label: string; value: string }) {

    const handleCopy = () =>{
        navigator.clipboard.writeText(String(value))
    }

    return (
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {label}
            <input value={value} readOnly />
            <button type="button" onClick={handleCopy}>
                Copy
            </button>
        </label>
    )
}


export default function ResCardPanel() {

    return (
        <Tabs defaultValue="overview" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="resCard">Res Card</TabsTrigger>
        <TabsTrigger value="reservations">Reservations</TabsTrigger>
        <TabsTrigger value="addTravelers">Additional Travelers</TabsTrigger>
      </TabsList>
      <TabsContent value="resCard">
        <Card>
          <CardHeader>
            <CardTitle>Res Card</CardTitle>
            <CardDescription>
              Copy Main Res Card Information Here
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {RES_CARD_SCHEMA.map((field) => (
                <InputField
                    key={field.key}
                    label={field.label}
                    value="Hello"
                />
            ))}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="reservations">
        <Card>
          <CardHeader>
            <CardTitle>Reservations</CardTitle>
            <CardDescription>
              Copy Individual Reservation Information Here
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {RES_CARD_RESERVATION_SCHEMA.map((field) => (
                <InputField
                    key={field.key}
                    label={field.label}
                    value="Hello"
                />
            ))}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="addTravelers">
        <Card>
          <CardHeader>
            <CardTitle>Additional Travelers</CardTitle>
            <CardDescription>
              Copy Additional Traveler Information Here
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {ADDITIONAL_TRAVELER_SCHEMA.map((field) => (
                <InputField
                    key={field.key}
                    label={field.label}
                    value="Hello"
                />
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
    )
}