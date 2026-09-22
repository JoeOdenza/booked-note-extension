import { localStore } from "./storage"
import type { ResCardPanelProps } from "@/types"
import mockClaudeData from '../data/mockClaudeData.json'

export async function generateResCardData(): Promise<ResCardPanelProps> {
  const [
    confirmationNumber,
    resortName,
    checkInDate,
    checkOutDate,
    odenzaPrice,
    paymentCurrency,
    tripLocation,
    marketing_source,
    group_type,
    branch_num,
    vendor_name,
    travel_category,
    locator_num,
    currency,
    total_cost,
    travel_property,
    start_date,
    end_date,
    additionalTravelers,
  ] = await Promise.all([
    localStore.get("confirmationNumber"),
    localStore.get("resortName"),
    localStore.get("checkInDate"),
    localStore.get("checkOutDate"),
    localStore.get("odenzaPrice"),
    localStore.get("paymentCurrency"),
    localStore.get("tripLocation"),
    localStore.get("marketing_source"),
    localStore.get("group_type"),
    localStore.get("branch_num"),
    localStore.get("vendor_name"),
    localStore.get("travel_category"),
    localStore.get("locator_num"),
    localStore.get("currency"),
    localStore.get("total_cost"),
    localStore.get("travel_property"),
    localStore.get("start_date"),
    localStore.get("end_date"),
    localStore.get("additionalTravelers"),
  ])

  const mockResCard = mockClaudeData.resCard
  const mockReservation = mockClaudeData.reservations[0]

  const [tripCity, tripRegion] = tripLocation ? parseTripLocation(tripLocation) : []

  const trip_name =
    tripLocation && checkInDate
      ? parseTripName(tripLocation, checkInDate)
      : mockResCard.trip_name
  const payment_Currency = parseCurrency(paymentCurrency ?? "")

  const resolvedLocatorNum = locator_num ?? mockResCard.locator_num

  return {
    data: {
      resCard: {
        trip_name,
        marketing_source: marketing_source ?? mockResCard.marketing_source,
        group_type: group_type ?? mockResCard.group_type,
        branch_num: branch_num ?? mockResCard.branch_num,
        locator_num: resolvedLocatorNum,
        trip_region: tripRegion ?? mockResCard.trip_region,
        trip_city: tripCity ?? mockResCard.trip_city,
      },
      reservations: [{
        vendor_name: vendor_name ?? mockReservation.vendor_name,
        travel_category: travel_category ?? mockReservation.travel_category,
        travel_property: resortName ?? travel_property ?? mockReservation.travel_property,
        confirmation_num: confirmationNumber ?? resolvedLocatorNum,
        locator_num: confirmationNumber ?? resolvedLocatorNum,
        currency: payment_Currency ?? currency ?? mockReservation.currency,
        total_cost: odenzaPrice ?? total_cost ?? mockReservation.total_cost,
        start_date: checkInDate ?? start_date ?? mockReservation.start_date,
        end_date: checkOutDate ?? end_date ?? mockReservation.end_date,
      }],
      additionalTravelers: additionalTravelers ?? mockClaudeData.additionalTravelers,
    },
  }
}

// "City, Region" (or "City, Region, Country" -- the country is dropped) -> [city, region].
function parseTripLocation(location: string): [city: string, region: string] {
    const firstIndex = location.indexOf(',');
    if (firstIndex === -1) return [location.trim(), ""];

    const city = location.slice(0, firstIndex).trim()
    const afterCity = location.slice(firstIndex + 1)
    const secondIndex = afterCity.indexOf(',')
    const region = (secondIndex === -1 ? afterCity : afterCity.slice(0, secondIndex)).trim()

    return [city, region];
}

function parseMonthYearDate(date: string): string {
    const parsed = new Date(date)
    if (isNaN(parsed.getTime())) return date

    return parsed.toLocaleString("en-US", { month: "short", year: "numeric" })
}

function parseTripName(location: string, date: string): string {
    const [city, region] = parseTripLocation(location)
    const destination = region ? `${city}, ${region}` : city
    const monthYear = parseMonthYearDate(date)

    return (destination + " " + monthYear)
}

function parseCurrency(currencyString: string): string {
    if (currencyString.includes("USD")) {
        return "USD"
    } else if (currencyString.includes("CAD")) {
        return "CAD"
    } else return ""
}