import {getZibbyConfigFor} from "../config/configProvider";
import { constructParser, debounce, roundNumberToDecimalPlaces, withEventHandler, convertStatetoFullForm, replaceSpecialCharactersAndAlphabets } from "../js/utility";
import {AbstractMerchant, DOMParser} from "../js/abstractMerchant";
import {
    delegate,
    setUpListenersForLocationChange,
    observerDelegate,
    closeWidget,
    isInsideReactNative
} from "../js/globalHelper";

setUpListenersForLocationChange();

export function emailParser (node){
  const value =JSON.parse(node.innerText.trim());
  const saved_address = Object.values(value.wf.reactData)[0].bootstrap_data.checkout_accordion.billing_section.saved_addresses;
  const initialEmail = Object.values(value.wf.reactData)[0].bootstrap_data.checkout_accordion?.contact_information_section?.initialEmailAddress;
  return saved_address.length ? saved_address[0].email_address || initialEmail || "unknownemail@email.com" : initialEmail || "unknownemail@email.com";
}

export function phoneParser(nodes) {
  let phone = (replaceSpecialCharactersAndAlphabets(nodes[0].lastChild.lastChild.innerText)).slice(-10);
  return phone;
   }


export function firstNameParser(nodes) {
  return nodes[0].lastChild.firstChild.innerText.split(' ').slice(0,-1).join(' ');
   }


   export function lastNamePaser(nodes) {
    return nodes[0].lastChild.firstChild.innerText.split(' ').slice(-1).join(' ');
   }

   export function addressParser(node) {
  return node.innerText.split(',')[0]
   }


export function address2Parser(node) {
  return node.childNodes[2].textContent || '';
}

   export function cityParser(node) {
     if (node.childNodes.length > 4) {
       return node.childNodes[4].textContent.split(',')[0].trim();
     }
     else {
       return node.childNodes[3].textContent.split(',')[0].trim();
     }
   }

   export function stateParser(node) {
     if (node.childNodes.length > 4) {
       return convertStatetoFullForm(node.childNodes[4].textContent.split(',')[1].trim().split(' ')[0]);
     }
     else {
       return convertStatetoFullForm(node.childNodes[3].textContent.split(',')[1].trim().split(' ')[0]);
     }
   }

   export function zipParser(node) {
     if (node.childNodes.length > 4) {
       return node.childNodes[4].textContent.split(',')[1].trim().split(' ')[1].split('-')[0];
     }
  else {
    return node.childNodes[3].textContent.split(',')[1].trim().split(' ')[1].split('-')[0];
  }
}

   export function billing_addressParser(node) {
     const newNode = node.firstChild;
     return newNode.innerText.split(',')[1].trim();
     }

     export function billing_cityParser(node) {
  const newNode = node.firstChild;
  return newNode.textContent.split(',').slice(-3)[0].trim();
}

export function billing_stateParser(node) {
  const newNode = node.firstChild;
  return newNode.textContent.split(',').slice(-3)[1].trim().split(' ')[0];
     }

     export function billing_zipParser(node) {
       const newNode = node.firstChild;
       let possibleZipCode = newNode.textContent.split(',').slice(-3)[1].trim();
       if (possibleZipCode.includes(' ')) {
         possibleZipCode = possibleZipCode.split(' ')[1]
         if (possibleZipCode.includes('-')) {
           return possibleZipCode.split('-')[0];
         }
         return possibleZipCode;
       }
       return possibleZipCode;
     }

   export function salesTaxParser(nodes) {
     const node = Array.prototype.find.call(nodes, (node) => { return node.getAttribute('data-codeception-id') === "TaxInformation" })
     if (!node) return 0;
     const tax = parseFloat(node.textContent.replace(/[^\d\.]/g, ''));
    return isNaN(tax) ? 0 : tax;
}

export function shipAmountParser(nodes) {
  const node = Array.prototype.find.call(nodes, (node) => { return node.getAttribute('data-codeception-id') === "shipping_cost" })
  if (!node) return 0;
  const shipAmt = parseFloat(node.textContent.replace(/[^\d\.]/g, ''));
    return isNaN(shipAmt) ? 0 : shipAmt;
}


   export function cartTotalParser(node) {
    const cartTotal = parseFloat(node.querySelector('.OrderSummaryTable-total').lastChild.innerText.replace(/[^\d\.]/g, ''));
    return isNaN(cartTotal) ? 0 : cartTotal;
}

export function productItemsParser(nodes) {
  const values = nodes[0].firstChild.firstChild.firstChild.children;
  return Array.prototype.map.call(values, getCartItemsDOM).map((dom) => (
 {
  display_name: dom.itemNameDOM,
  sku: dom.itemSKUDOM,
  unit_price: roundNumberToDecimalPlaces(parseFloat(dom.priceDetailsDOM)),
      quantity: dom.qtyDOM,
 }
));
}

function getCartItemsDOM(parent) {
  try {
      const quantityDom = parseFloat(parent.firstChild.firstChild.lastChild.textContent===""? 1: parent.firstChild.firstChild.lastChild.textContent);
   return {
    itemNameDOM: parent.firstElementChild.lastChild.firstChild.textContent,
    itemSKUDOM: parent.firstElementChild.lastChild.firstChild.textContent,
    priceDetailsDOM: parent.firstElementChild.lastChild.lastChild.firstChild.textContent.replace(/[^\d\.]/g, '')/quantityDom,
    qtyDOM: quantityDom,
   };
  }
  catch (e) {
   // send error to sentry
   throw new Error(e);
  }
 }

 export function discountsParser(node) {
    const discount = 0;
    return [
     {
      discount_name: "Total Savings",
      discount_amount: isNaN(discount) ? 0 : discount
     }
    ]
   }

export function formBillingStateParser(node) {
  return node?.firstChild?.innerText || '';
}

const parsers = {
  email:constructParser('email', 'script#wfAppData', false, emailParser),
  phone:constructParser('phone', 'section', true, phoneParser),
  discounts:constructParser('discounts', 'body', false, discountsParser),
  sales_tax:constructParser('sales_tax', 'div.OrderSummaryTable-row.OrderSummaryTable-row', true, salesTaxParser ),
  shipping_amount:constructParser('shipping_amount', 'div.OrderSummaryTable-row.OrderSummaryTable-row', true, shipAmountParser),
  cart_total:constructParser('cart_total', 'section.OrderSummaryCard.OrderSummaryCard--isInCheckout', false,cartTotalParser),
  items:constructParser('items', "div#CollapsePanel-0, div#CollapsePanel-1, div#CollapsePanel-2", true, productItemsParser),
  first_name:constructParser('first_name', 'section', true, firstNameParser),
  last_name:constructParser('last_name', 'section', true, lastNamePaser),
  address:constructParser('address', 'address.CheckoutCustomerAddressContent', false, addressParser),
  address2: constructParser('address2', 'address.CheckoutCustomerAddressContent', false, address2Parser),
  city:constructParser('city', 'address.CheckoutCustomerAddressContent', false, cityParser),
  state:constructParser('state', 'address.CheckoutCustomerAddressContent', false, stateParser),
  zip:constructParser('zip', 'address.CheckoutCustomerAddressContent', false, zipParser),
  billing_address: constructParser('billing_address', `#a11y-status-message`, false, billing_addressParser),
  billing_city: constructParser('billing_city', `#a11y-status-message`, false, billing_cityParser),
  billing_state: constructParser('billing_state', `address.CheckoutCustomerAddressContent`, false, stateParser),
  billing_zip: constructParser('billing_zip', `#a11y-status-message`, false, billing_zipParser),
}

const parserWithBillingForm = {
  ...parsers,
  billing_address: withEventHandler('change', sameBilling, constructParser('billing_address', `[name="billingAddress.address1"]`, false)),
  billing_city: withEventHandler('change', sameBilling, constructParser('billing_city', `[name="billingAddress.city"]`, false)),
  billing_state: constructParser('billing_state', `#a11y-status-message`, false, formBillingStateParser),
  billing_zip: withEventHandler('change', sameBilling, constructParser('billing_zip', `[name="billingAddress.postalCode"]`, false)),
}

const wayfairParser = Object.create(DOMParser , {
parsers:{
    value:parsers
}
})

const wayfairParserAlternative = Object.create(DOMParser, {
  parsers: {
    value: parserWithBillingForm
  }
})

const wayfairMerchant = Object.create(AbstractMerchant);

const provider = getZibbyConfigFor(process.env.APP_ENV);
  const config = provider(process.env.APP_URL, 'wayfair');

function initialiseMerchant(billingSame = false) {
  wayfairMerchant.init(config,wayfairParser);
  wayfairMerchant.customerAddress.setBillingSameAsShipping(billingSame)
  wayfairMerchant.run();

}

delegate(document, "click", `[data-enzyme-id^="billing-address-dropdown"]`, debounce(sameBilling, 1500));
delegate(document, 'change', `[data-enzyme-id^="billing-address-dropdown"]`, debounce(sameBilling, 1500));
observerDelegate(document, 'DOMSubtreeModified', `form`, debounce(sameBilling, 2000))

function sameBilling(){
  if (!isInsideReactNative() && document.querySelector('.katapult-welcome-screen').style.display == '') {
    closeWidget();
    return;
  }

  const checkboxInterval = setInterval(() => {
    if (!document.querySelector('[data-enzyme-id^="billing-address-dropdown"]') && document.querySelector('div.pl-PhoneNumberInput') === null) {
      initialiseMerchant(true);
    }
    else if(document.querySelector('div.pl-PhoneNumberInput')!==null){
      wayfairMerchant.customerAddress.billingSameAsShipping = document.querySelector('div.pl-PhoneNumberInput')===null;
      wayfairMerchant.init(config, wayfairParserAlternative);
      wayfairMerchant.run();

    }
    else if (document.querySelector('[data-enzyme-id^="billing-address-dropdown"]')) {
      initialiseMerchant();
    }
    clearInterval(checkboxInterval);
  },1000);

}


function locationChangeEvent(){
  if (window.location.href.includes("view#billing")) {
    setTimeout(() => initialiseMerchant(true), 5000);
     }
     else{
      wayfairMerchant.resetKatapult();
    }
}

const debouncedLocationChangeEvent = debounce(locationChangeEvent, 5000)
window.addEventListener('locationchange', debouncedLocationChangeEvent)

locationChangeEvent();
