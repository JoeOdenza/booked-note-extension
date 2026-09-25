import { localStore } from "./storage"
import type { ResCardPanelProps, BankPointType } from "@/types"
import mockClaudeData from '../data/mockClaudeData.json'
import resCardGroupTypes from "../data/resCardGroupTypes.json"
import resCardBranchNo from "../data/resCardBranchNo.json"
import stateProvinceNames from "../data/stateProvinceNames.json"

const MOCK_CERT_CODE: string = "DCFAPUSACV"
const BANK_POINT_TYPE: BankPointType = null

export async function generateResCardData(): Promise<ResCardPanelProps> {
  const [
    confirmationNumber,
    resortName,
    checkInDate,
    checkOutDate,
    odenzaPrice,
    paymentCurrency,
    tripLocation,
    locator_num,
    currency,
    additionalTravelers,
  ] = await Promise.all([
    localStore.get("confirmationNumber"),
    localStore.get("resortName"),
    localStore.get("checkInDate"),
    localStore.get("checkOutDate"),
    localStore.get("odenzaPrice"),
    localStore.get("paymentCurrency"),
    localStore.get("tripLocation"),
    localStore.get("locator_num"),
    localStore.get("currency"),
    localStore.get("additionalTravelers"),
  ])

  const mockResCard = mockClaudeData.resCard
  const mockReservation = mockClaudeData.reservations[0]

  const [tripCity, tripRegion] = tripLocation ? parseTripLocation(tripLocation) : []
  const [marketingSource, groupType] = MOCK_CERT_CODE ? getCertTableFields(MOCK_CERT_CODE) : []
  const branchNo = BANK_POINT_TYPE || tripRegion ? getBranchNo(BANK_POINT_TYPE, tripRegion) : "06"

  const trip_name =
    tripCity && checkInDate
      ? parseTripName(tripCity, checkInDate)
      : mockResCard.trip_name

  const payment_Currency = parseCurrency(paymentCurrency ?? "")

  const resolvedLocatorNum = locator_num ?? mockResCard.locator_num

  const travelProperty = parseTravelProperty(resortName ?? "")

  return {
    data: {
      resCard: {
        trip_name,
        marketing_source: marketingSource ?? mockResCard.marketing_source,
        group_type: groupType ?? mockResCard.group_type,
        branch_num: branchNo ?? mockResCard.branch_num,
        locator_num: confirmationNumber ?? resolvedLocatorNum,
        trip_region: tripRegion ?? mockResCard.trip_region,
        trip_city: tripCity ?? mockResCard.trip_city,
      },
      reservations: [{
        vendor_name: mockReservation.vendor_name,
        travel_category: mockReservation.travel_category,
        travel_property: travelProperty ?? mockReservation.travel_property,
        confirmation_num: confirmationNumber ?? resolvedLocatorNum,
        locator_num: confirmationNumber ?? resolvedLocatorNum,
        currency: payment_Currency ?? currency ?? mockReservation.currency,
        total_cost: odenzaPrice ?? mockReservation.total_cost,
        start_date: checkInDate ?? mockReservation.start_date,
        end_date: checkOutDate ?? mockReservation.end_date,
        commission: mockReservation.commission
      }],
      additionalTravelers: additionalTravelers ?? mockClaudeData.additionalTravelers,
    },
  }
}

// "City, Region" (or "City, Region, Country" -- the country is dropped) -> [city, region].
function parseTripLocation(location: string): [city: string, region: string] {
    const substrings = location.split(",")

    const property = substrings[0].trim()
    const city = substrings[1].trim()
    const cityFullName = (stateProvinceNames as Record<string, string>)[city.toUpperCase()] ?? city;
    const region = substrings[2].trim()

    return [cityFullName, region];
}

function parseMonthYearDate(date: string): string {
    const parsed = new Date(date)
    if (isNaN(parsed.getTime())) return date

    return parsed.toLocaleString("en-US", { month: "short", year: "numeric" })
}

function parseTripName(city: string, date: string): string {
    const destination = `${city}`
    const monthYear = parseMonthYearDate(date)

    return (destination + ", " + monthYear)
}

function parseCurrency(currencyString: string): string {
    if (currencyString.includes("USD")) {
        return "USD"
    } else if (currencyString.includes("CAD")) {
        return "CAD"
    } else return ""
}

function getCertTableFields(certCode: string): [marketingSource: string, groupType: string] {
  const match = certCode.match(/[A-Z]+/)
    if (!match) {
    throw new Error(`Invalid certCode format: ${certCode}`);
  }
  const certCodeStripped = match[0]
  const entry = resCardGroupTypes.find((entry) => entry.Program === certCodeStripped)
  return entry 
  ? [entry["Marketing Source"], entry["Group Code"]] 
  : ["", ""];
}

function getBranchNo(bankPointType: BankPointType, region: string | undefined): string {
  const lookupType = bankPointType === null 
    ? region
    : bankPointType;

  const entry = resCardBranchNo.find((entry) => entry.type === lookupType);
  
  return entry ? (entry.label) : "";
}

function parseTravelProperty(travelPropertyRawString: string): string | undefined {
  const index = travelPropertyRawString.indexOf(' - ')
  if (index === -1) return travelPropertyRawString
  
  return travelPropertyRawString.slice(0, index)
}