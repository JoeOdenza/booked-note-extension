export type SiteConfig = {
  hostname: string
  pathname: string
  includes: string[]
  extract: Record<string, string>
}

export const config: SiteConfig[] = [
  {
    hostname: 'mywebrez.com',
    pathname: '/odenza2',
    includes: ['reservation-receipt'],
    extract: {
      confirmationNumber:
        'body > div.pRubeObj.pRubeObjInmain > table > tbody > tr > td > table > tbody > tr > td > div > table.confirmation-details.section > tbody > tr:nth-child(1) > td > p:nth-child(1) > span:nth-child(2) > b',
        name: 'body > div.pRubeObj.pRubeObjInmain > table > tbody > tr > td > table > tbody > tr > td > div > table.traveler-accommodation-information.border-bottom > tbody > tr:nth-child(1) > th.traveler-information-cell.column > p:nth-child(2)'
    }, 
  }, 
  {
    hostname: '',
    pathname: '',
    includes: ['view-hold'],
    extract: {
      confirmationNumber: 'body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-8 > div.res-information-container > div:nth-child(3) > p:nth-child(1) > span',
      clientName: 'body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-8 > div.column-left > div.find-my-reservation-container > div > div > p:nth-child(1)',
      clientAddress: 'body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-8 > div.column-left > div.find-my-reservation-container > div > div > p:nth-child(2)',
      clientPhone: 'body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-8 > div.column-left > div.find-my-reservation-container > div > div > p:nth-child(3)',
      clientEmail: 'body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-8 > div.column-left > div.find-my-reservation-container > div > div > p:nth-child(4)',
      tripProperty: 'body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-8 > div.res-information-container > div:nth-child(3) > p:nth-child(1) > span',
      tripLocation: 'body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-8 > div.column-left > div.trip-summary-container.js-trip-summary-container > div.summary-resort-details-container > p.resort-location',
      checkInDate: 'body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-8 > div.column-left > div.trip-summary-container.js-trip-summary-container > div:nth-child(4) > span',
      checkOutDate: 'body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-8 > div.column-left > div.trip-summary-container.js-trip-summary-container > div:nth-child(4) > span',
      basePrice: 'body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-8 > div.column-left > div.trip-summary-container.js-trip-summary-container > div:nth-child(4) > span',
      taxes: 'body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-8 > div.column-left > div.trip-summary-container.js-trip-summary-container > div:nth-child(4) > span',
      finalAmount:
        'body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-4 > div > div.trip-summary-container.js-trip-summary-container > div.summary-final-item > div.summary-final-item-amount'
    }, 
  }
]

export function findMatchingSite(url: string): SiteConfig | undefined {
  const { hostname, pathname, href } = new URL(url)
  return config.find(
    (site) =>
      hostname.includes(site.hostname) &&
      pathname.includes(site.pathname) &&
      site.includes.every((needle) => href.includes(needle)),
  )
}
