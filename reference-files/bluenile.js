import { getZibbyConfigFor } from "../config/configProvider"
import {
  constructParser,
  debounce,
  replaceSpecialCharactersAndAlphabets
} from "../js/utility"
import { AbstractMerchant, DOMParser } from "../js/abstractMerchant"
import { delegate, setUpListenersForLocationChange } from "../js/globalHelper"

console.log("loaded in blue Nile v2")
setUpListenersForLocationChange()

export function emailParser(node) {
  console.log("email--",node.textContent.trim())
  return node.textContent.trim()
}
export function cartTotalParser(node) {
  const cartTotal = parseFloat(
    replaceSpecialCharactersAndAlphabets(node.textContent.trim())
  )
  console.log("cart total=----",cartTotal)
  return isNaN(cartTotal) ? 0 : cartTotal
}

export function phoneParser(node) {
  console.log("phoneParser----",node.textContent.split(" ")[1].trim())
  return node.textContent.split(" ")[1].trim()
}

export function generalParser(node) {
 console.log("generalParser--", node.textContent.trim())
  return node.textContent.trim()
}
export function salesTaxParser(node) {
  const salesTax = parseFloat(
    replaceSpecialCharactersAndAlphabets(node.textContent.trim())
  )
  console.log("salesTax--",salesTax)
  return isNaN(salesTax) ? 0 : salesTax
}

export function shipAmountParser(node) {
  const shipAmount = parseFloat(
    replaceSpecialCharactersAndAlphabets(node.parentNode.nextSibling.lastChild.textContent.trim())
  )
  console.log("shipAmount--", shipAmount)
  return isNaN(shipAmount) ? 0 : shipAmount
}

function calculateDiscount() {
  const subTotalElement = document.querySelector('[data-qa="sub_total_price-summary-checkout_page"]');
  const subTotal = subTotalElement ? parseFloat(replaceSpecialCharactersAndAlphabets(subTotalElement.textContent.trim())) : 0;

  const items = itemParsers()

  const itemTotal = items.reduce((sum, { unit_price, quantity }) => sum + unit_price * quantity, 0);

  return itemTotal - subTotal;
}
function getGiftCardValue() {
  const couponElement = document.querySelector(`[data-qa="coupon_discount-summary-checkout_page"]`);
  if (couponElement) {
    const value = couponElement.textContent.replace(/[^0-9.]/g, '');
    return parseFloat(value) || 0;
  }
  return 0;
}
export function discountParser() {
  const diff = calculateDiscount();
  const parseGiftCard = getGiftCardValue();
  console.log("GiftCardParser--", parseGiftCard);
  const discountAmt = diff > 0 ? diff : 0;
  console.log("discountAmt--",discountAmt)
  return [
    {
      discount_name: "Total Savings",
      discount_amount: discountAmt + parseGiftCard
    }
  ]
}

export function firstNameParser(node) {
  const parts = node.textContent.split(" ")
  const firstName = parts.slice(0, -1).join(" ")
  console.log("firstName--",firstName)
  return firstName
}
export function lastNameParser(node) {
  const parts = node.textContent.split(" ")
  const lastName = parts.pop()
  console.log("lastName--",lastName)
  return lastName
}

export function cityParser(node) {
  console.log("cityParser--",node.textContent.split(",")[1].trim())
  return node.textContent.split(",")[1].trim()
}

export function stateParser(node) {
  console.log("stateParser--",node.textContent.split(",")[0].trim())
  return node.textContent.split(",")[0].trim()
}

export function zipParser(node) {
  console.log("zipParser--",node.textContent.split(",")[2].trim())
  return node.textContent.split(",")[2].trim()
}

console.log("items=====", JSON.parse(localStorage.getItem("ShoppingCartSummary"))?.items.map(({ productID, title, price, ...rest }) => ({
  display_name: title,
  unit_price: price,
  ...rest
})))

export function itemParsers() {
  let parsedItems = [];

  //Retrieve checkout event details directly from window.dataLayer
  const checkoutEvent = window.dataLayer?.find(({ event }) =>
    event === "begin_checkout" || event === "add_shipping_info"
  );

  console.log('checkoutEvent', checkoutEvent);

  if (checkoutEvent?.ecommerce?.items?.length > 0) {
    parsedItems = checkoutEvent.ecommerce.items.map(({ item_name, item_id, price, quantity }) => ({
      display_name: item_name,
      sku: item_id,
      unit_price: price,
      quantity
    }));
  }

  console.log("parsedItems--", parsedItems);

  return parsedItems;
}


const deliveryParser = {
  email: constructParser(
    "email",
    `section[data-qa="step_box-user_authentication_step-checkout_page"]>div>address`,
    false,
    emailParser
  ),
  phone: constructParser(
    "phone",
    `section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address>div>div`,
    false,
    phoneParser
  ),
  discounts: constructParser("discounts", `[data-qa="total_savings-summary-checkout_page"]`, false, discountParser),
  sales_tax: constructParser(
    "sales_tax",
    `[data-qa="tax-summary-checkout_page"]`,
    false,
    salesTaxParser
  ),
  shipping_amount: constructParser(
    "shipping_amount",
    `[data-qa="sub_total_price-summary-checkout_page"]`,
    false,
    shipAmountParser
  ),
  cart_total: constructParser(
    "cart_total",
    `[data-qa="total_price-summary-checkout_page"]`,
    false,
    cartTotalParser
  ),
  first_name: constructParser("first_name", `section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address>div>strong`, false, firstNameParser),
  last_name: constructParser("last_name", `section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address>div>strong`, false, lastNameParser),
  address: constructParser("address", `section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address>div>label`, false, generalParser),
  zip: constructParser("zip", `section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address>div>label:nth-last-of-type(2)`, false, zipParser),
  city: constructParser("city", `section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address>div>label:nth-last-of-type(2)`, false, cityParser),
  state: constructParser("state", `section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address>div>label:nth-last-of-type(2)`, false, stateParser),
  items: constructParser("items", "body", false, itemParsers)
}

const parserWithBillingForm = {
  ...deliveryParser,
  billing_address: constructParser(
    "billing_address",
    `section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address:last-of-type>div>label`,
    false,
    generalParser
  ),
  billing_city: constructParser(
    "billing_city",
    `section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address:last-of-type>div>label:nth-of-type(2)`,
    false,
    cityParser
  ),
  billing_state: constructParser(
    "billing_state",
    `section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address:last-of-type>div>label:nth-of-type(2)`,
    false,
    stateParser
  ),
  billing_zip: constructParser(
    "billing_zip",
    `section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address:last-of-type>div>label:nth-of-type(2)`,
    false, zipParser)
}

const parserForPickup = {
  ...deliveryParser,
  first_name: constructParser(
    "first_name",
    `section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address:last-of-type>div>strong`,
    false,
    firstNameParser
  ),
  last_name: constructParser(
    "last_name",
    `section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address:last-of-type>div>strong`,
    false,
    lastNameParser
  ),
  address: constructParser(
    "address",
    `section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address:last-of-type>div>label`,
    false,
    generalParser
  ),
  city: constructParser(
    "city",
    `section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address:last-of-type>div>label:nth-of-type(2)`,
    false,
    cityParser
  ),
  state: constructParser(
    "state",
    `section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address:last-of-type>div>label:nth-of-type(2)`,
    false,
    stateParser
  ),
  zip: constructParser("zip", `section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address:last-of-type>div>label:nth-of-type(2)`,
    false,
    zipParser)
}

const bluenileParser = Object.create(DOMParser, {
  parsers: {
    value: deliveryParser
  }
})

const parserObjWithBillingForm = Object.create(DOMParser, {
  parsers: {
    value: parserWithBillingForm
  }
})

const bluenilePickupParser = Object.create(DOMParser, {
  parsers: {
    value: parserForPickup
  }
})

const bluenileMerchant = Object.create(AbstractMerchant)
const provider = getZibbyConfigFor(process.env.APP_ENV)
const config = provider(process.env.APP_URL, "bluenile")

function initialiseMerchant() {
  console.log("initialiseMerchant--")
  if (!window.location.href.includes("/checkout")) return
  let parser
  if (document.querySelector('section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address')?.firstChild?.textContent?.includes("Delivery")) {
    if (document.querySelector('section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>div:last-of-type')?.textContent.includes("Billing address same as shipping address")) {
      parser = bluenileParser;
      bluenileMerchant.customerAddress.setBillingSameAsShipping(true);
    }
    else {
      parser = parserObjWithBillingForm;
    }
  }
  else if (document.querySelector('section[data-qa="step_box-shipping_and_billing_step-checkout_page"]>div>address')?.firstChild?.textContent?.includes("Pickup")) {
    parser = bluenilePickupParser
    bluenileMerchant.customerAddress.setBillingSameAsShipping(true);
  }
  console.log("parser---", parser);
  bluenileMerchant.init(config, parser)
  bluenileMerchant.run()
}

function locationChangeEvent() {
  console.log("locationChangeEvent--")
  if (
    window.location.href.includes("/checkout") &&
    (!document.querySelector(`[data-qa="fedex_pickup_select_button-shipping_and_billing_step-checkout_page"]`) ||
      !document.querySelector(`[data-qa="delivery_address_select_button-shipping_and_billing_step-checkout_page"]`))
  ) {
    setTimeout(initialiseMerchant, 1000)
  } else {
    bluenileMerchant.resetKatapult()
  }
}

const debouncedLocationChangeEvent = debounce(locationChangeEvent, 2000)
//Gift card apply button
delegate(document, "touchstart", `button[data-qa="apply_coupon_button-summary-checkout_page"]`, debouncedLocationChangeEvent);
//Gift card remove button
delegate(document, "click", `button[data-qa="remove_coupon_button-summary-checkout_page"]`, () => {
  debouncedLocationChangeEvent(document.querySelector(`button[data-qa="continue_button-shipping_and_billing_step-checkout_page"]`));
});
delegate(document, "click", `button[data-qa="continue_button-shipping_and_billing_step-checkout_page"]`, debouncedLocationChangeEvent)
delegate(document, "click", `button[data-qa="guest_validation_submit-user_authentication_step-checkout_page"]`, debouncedLocationChangeEvent)
window.addEventListener("load", () => {
  debouncedLocationChangeEvent()
})

window.addEventListener("locationchange", () => {
  debouncedLocationChangeEvent()
})
debouncedLocationChangeEvent()