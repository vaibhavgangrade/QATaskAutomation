import { getZibbyConfigFor } from "../config/configProvider";
import {
  constructParser,
  debounce,
  replaceSpecialCharactersAndAlphabets,
  roundNumberToDecimalPlaces,
  withEventHandler
} from "../js/utility";
import { AbstractMerchant, DOMParser, getNameFromFullName } from "../js/abstractMerchant";
import { setChangeObserver } from '../js/commonMerchantFunctions'
import { delegate, setUpListenersForLocationChange, isInsideReactNative } from "../js/globalHelper";


setUpListenersForLocationChange()


export function emailParser(nodes) {
  if(nodes.length >1 && isInsideReactNative())
  {
    return nodes[1].value;
  }
  return nodes[0].value;
}
export function phoneParser(node) {
  return node.value.replace(/[^\d\.]/g, '');
}
export function discountsParser(node) {
  const discount = replaceSpecialCharactersAndAlphabets(node?.innerText || '');
  return [
    {
      discount_name: "Coupon Discount",
      discount_amount: discount || 0
    }
  ]
}

export function salesTaxParser(node) {
  const map = getValuationMap(node);
  const tax = parseFloat(map['Taxes'].replace(/\$/g, '').replace(/,/g, ""))
  return isNaN(tax) ? 0 : tax;
}

export function shipAmountParser(node) {
  const map = getValuationMap(node);
  let shipAmt = parseFloat(map['Shipping']?.replace(/\$/g, '').replace(/,/g, ""))
  shipAmt = isNaN(shipAmt) ? 0 : shipAmt
    return map['Shipping'] !== "FREE" ? shipAmt : 0;
}

export function cartTotalParser(node) {
  return node.innerText.replace(/[^\d\.]/g, '');
}

export function getProductName(dom) {
  return {
    display_name: dom?.innerHTML.trim() || '',
    sku: dom?.innerHTML.trim() || ''
  }
}

export function firstNameParser(node) {
  return getNameFromFullName(this.cleanup(node))[0];
}

export function lastNameParser(node) {
  return getNameFromFullName(this.cleanup(node))[1];
}

export function addressParser(nodes) {
  return this.cleanup(nodes[1]);
}

export function cityParser(nodes) {
  const [city] = nodes[2].innerHTML.trim().split(',').map(_ => _.trim());
  return city
}

export function stateParser(nodes) {
  const arr = nodes[2].innerHTML.trim().split(',').map(_ => _.trim());
  return arr[1]

}

export function zipParser(nodes) {
  const arr = nodes[2].innerHTML.trim().split(',').map(_ => _.trim());
  return arr[2]
}

export function getValuationMap(dom) {
  return dom.innerText.split('\n').reduce((acc, curr, index, arr) => {
    return index % 2 === 0 ? { ...acc, [curr.trim()]: arr[index + 1] } : acc
  }, {})
}

export function getCartObjectForCheckout(node) {
  const cart = [];
  Array.prototype.forEach.call(node.children, (child) => {
    //if child is bundle items
    if (child.querySelector(`[data-testid*='cart_item_price_the-stf-box']`)) {
      if (child?.querySelector('[class*=remove-button_]')) {
        tryAddingChildrenBundle(child, cart);
      }
    } else {
      tryAddingParentBundle(child, cart);
    }
  });
  return cart;
}

function tryAddingChildrenBundle(child, cart) {
  Array.prototype.forEach.call(child.querySelector('[class*=list_]').children, (item) => {
    const discountedPrice = item.querySelector(`[class*=discounted-price]`);
    const actualPrice = item?.querySelector(`[data-testid*='cart_item_price_the-stf-box']`)?.textContent;
    const actualPriceWhenDiscountNodeIsPresent = item?.querySelector('[class*="prediscounted-price"]')?.textContent;
    const unit_price = discountedPrice ?  actualPriceWhenDiscountNodeIsPresent: actualPrice;
    const display_name = item.querySelector("[class*='product-title--clickable']").textContent;
    const quantity = +(item.querySelector("[class*='image-wrap__quantity']")?.textContent || 1);
    cart.push({
      display_name,
      sku: display_name,
      unit_price: roundNumberToDecimalPlaces(replaceSpecialCharactersAndAlphabets(unit_price) / quantity),
      quantity: quantity
    });
  });
}

function tryAddingParentBundle(child, cart) {
  //remove button is present and hence its a bundle product which needs to be added to cart
  const discountedPrice = child.querySelector(`[class*=discounted-price]`);
  const actualPrice = child?.querySelector(`[class*=price_]`)?.textContent;
  const actualPriceWhenDiscountPresent = child?.querySelector(`[class*=prediscounted-price]`)?.textContent;
  const finalPrice = discountedPrice? actualPriceWhenDiscountPresent: actualPrice ;
  const quantity = +(child.querySelector(`[class*='quantity__value']`)?.textContent || 1);
  const display_name = child?.querySelector(`[class*='product-link-title']`)?.textContent || child?.querySelector("[class*=product-title--]")?.textContent;
  cart.push({
    display_name,
    sku: display_name,
    unit_price: roundNumberToDecimalPlaces(replaceSpecialCharactersAndAlphabets(finalPrice) / quantity),
    quantity: quantity
  });

}

function generalParser(node) {
  return node.value;
}

const emailSelector = isInsideReactNative() ? "#email" : "#checkout_shipping_step #email";

export const parsers = {
  email: constructParser('email', emailSelector, true, emailParser),
  phone: constructParser('phone', '#shippingAddress_phone', false, phoneParser),
  discounts: constructParser('discounts', `[data-testid='coupon_discount']`, false, discountsParser),
  sales_tax: constructParser('sales_tax', `.summary_F8y`, false, salesTaxParser),
  shipping_amount: constructParser('shipping_amount', `.summary_F8y`, false, shipAmountParser),
  cart_total: constructParser('cart_total', `#total_price`, false, cartTotalParser),
  items: constructParser('items', `[data-testid='cart_items_area']`, false, getCartObjectForCheckout),
  first_name: constructParser('first_name', '#shippingAddress_fullName', false, firstNameParser),
  last_name: constructParser('last_name', '#shippingAddress_fullName', false, lastNameParser),
  address: constructParser('address', '#shippingAddress_line1', false, generalParser),
  city: constructParser('city', '#shippingAddress_city', false, generalParser),
  state: constructParser('state', '#shippingAddress_state', false, generalParser),
  zip: constructParser('zip', '#shippingAddress_zip', false, generalParser),
  billing_address: constructParser('billing_address', '#shippingAddress_line1', false, generalParser),
  billing_city: constructParser('billing_city', '#shippingAddress_city', false, generalParser),
  billing_state: constructParser('billing_state', '#shippingAddress_state', false, generalParser),
  billing_zip: constructParser('billing_zip', '#shippingAddress_zip', false, generalParser)
}

const nsParser = Object.create(DOMParser, {
  parsers: {
    value: parsers
  }
})

function updateBillingAddress() {
  nsMerchant.updateCache(['billing_address', 'checkOutData']);
  nsMerchant.rerunWithUpdatedCache();
}

const billingVariantParser = Object.create(DOMParser, {
  parsers: {
    value: {
      ...parsers,
      billing_address: withEventHandler('change', updateBillingAddress, constructParser('billing_address', '#billingAddress_line1', false, generalParser)),
      billing_city: withEventHandler('change', updateBillingAddress, constructParser('billing_city', '#billingAddress_city', false, generalParser)),
      billing_state: withEventHandler('change', updateBillingAddress, constructParser('billing_state', '#billingAddress_state', false, generalParser)),
      billing_zip: withEventHandler('change', updateBillingAddress, constructParser('billing_zip', '#billingAddress_zip', false, generalParser))
    }
  }
})

const nsMerchant = Object.create(AbstractMerchant);
const provider = getZibbyConfigFor(process.env.APP_ENV);
const config = provider(process.env.APP_URL, 'nectarsleep');
function changeParserAndRun(billingStatus) {
  const parserToUse = billingStatus === "same" ? nsParser : billingVariantParser;
  nsMerchant.init(config, parserToUse);
  nsMerchant.run();
}
setTimeout(() => {
  nsMerchant.init(config, nsParser);
})

const debouncedRun = debounce(nsMerchant.run.bind(nsMerchant), 3000)

export function attachObserver() {
  setChangeObserver(debouncedRun, nsParser);
}

function callRun() {
  nsMerchant.run()
  setBillingCheckBoxObserver()
  setTimeout(attachObserver, 2000)
}

function conditionallyCallRun() {
  let intervalId
      if (window.location.href.includes("shipping")) {
          
          intervalId=setInterval(()=>{
              if(document.querySelector('.shipping-form_TGp')){
                  clearInterval(intervalId);
                  if(!document.querySelector("#checkout_shipping_continue_btn")){
                      setTimeout(callRun, 2000);
                  }
                  else{
                      nsMerchant.resetKatapult();
                  }
              }
          },2000)
      } else {
          clearInterval(intervalId);
          nsMerchant.resetKatapult();
      }
}

export function locationChangeEvent() {
  if (window.location.href.includes("billing")) {
    callRun();
  }
  else {
    setTimeout(conditionallyCallRun, 2000);
  }
}

const debouncedLocationChangeEvent = debounce(locationChangeEvent, 2000)

window.addEventListener('locationchange', debouncedLocationChangeEvent)
window.addEventListener('load', debouncedLocationChangeEvent)

export function mobileDeviceChanges() {
  var intv2 = setInterval(() => {
    if (document.querySelectorAll('#shippingAddress_phone').length > 0) {
      if (window.location.href.includes("shipping") && document.querySelectorAll('#checkout_review_step').length == 0) {
        let inputElementsList = [
          '#email',
          `#shippingAddress_line1`,
          `#shippingAddress_fullName`,
          `#shippingAddress_city`,
          `#shippingAddress_state`,
          `#shippingAddress_zip`,
          '#shippingAddress_phone',
        ]
        inputElementsList.forEach(function (item) {
          delegate(document, 'change', item, callRun);
        })
      }
      clearInterval(intv2)
    }
  }, 1000)
}

window.addEventListener('locationchange', mobileDeviceChanges)

setTimeout(nsMerchant.resetKatapult.bind(nsMerchant), 1000);


export function setBillingCheckBoxObserver() {
  nsParser.getNodeFromDocument({ selector: "#differentBilling" }).addEventListener('change', function (e) {
    const status = e.target.checked ? "same" : "different";
    changeParserAndRun(status);
  });
}
