import { getZibbyConfigFor } from "../config/configProvider";
import {
  constructParser,
  debounce,
  roundNumberToDecimalPlacesWithoutNaNConversion,
} from "../js/utility";
import {
  AbstractMerchant,
  DOMParser,
  getNameFromFullName,
} from "../js/abstractMerchant";
import { delegate, setUpListenersForLocationChange } from "../js/globalHelper";

console.log("BEST_BUY-3.0")

let intervalId=setInterval(() => {
  if(window.location.href.includes('checkout/r/payment') && (!document.querySelector('input#address-input') && document.querySelector('#cc-number'))){
    clearInterval(intervalId);
    document.querySelector('#cc-number').focus();
  }
}, 1000);

export function amountParser(value) {
  if (!value) return 0.0;
  const amt = parseFloat(value.replace(/[^\d\.]/g, ""));
  return isNaN(amt) ? 0 : parseFloat(amt.toFixed(2));
}

export function unitPriceParser(value) {
  if (value === "FREE") return 0;
  const amt = parseFloat(value.replace(/[^\d\.]/g, ""));
  if (Number.isNaN(amt)) return NaN;
  return Number.isInteger(amt) ? amt : parseFloat(amt.toFixed(2));
}

export function getTrackData() {
  const email = window.track?.order?.emailAddress || "";
  let track = window.__INIT_ORDER_DATA;
  if (track) {
    sessionStorage.track = JSON.stringify({
      order: {
        items: window.track.order ? window.track?.order?.items : track.items,
        emailAddress: email || track.emailAddress || "",
        meta: window.track.order ? window.track?.order?.meta : track.meta,
      },
    });
  } else if (sessionStorage.track) {
    return JSON.parse(sessionStorage.track);
  }
  return {
    order: {
      items: window.track.order ? window.track?.order?.items : track.items,
      emailAddress: email || track.emailAddress || "",
      meta: window.track.order ? window.track?.order?.meta : track.meta,
    },
  };
}

export function getEmail() {
  let track = getTrackData();
  return track?.order?.emailAddress;
}

export function getProducts() {
  const nonLeasable = [
    "ITEM SUBTOTAL",
    "SHIPPING",
    "DELIVERY",
    "ESTIMATED SALES TAX",
    "RETAILER DELIVERY FEE",
    "RETAIL DELIVERY FEE",
    "TOTAL",
    "DUE TODAY",
    "TRADE-IN VALUE",
    "TOTAL AFTER TRADE-IN",
  ];
  //adding all extra products as leasable
  const nonLeasableProducts = Array.prototype.filter
    .call(
      document.querySelectorAll(".order-summary__label"),
      (node) => !nonLeasable.includes(node.innerText.toUpperCase()),
    )
    .map((node) => ({
      display_name: node.innerText,
      sku: node.innerText,
      unit_price: unitPriceParser(node?.nextElementSibling.innerText), // unitRegularPrice
      quantity: 1,
      leasableOverride: false,
    }));
  let track = getTrackData();
  let mainObject = track?.order?.items;
  let installationProducts = [];
  let products = [];
  if (mainObject && typeof mainObject == "object" && mainObject.length > 0) {
    products = mainObject.map((item) => {
      if (item?.items?.length) {
        installationProducts.push(
          ...item.items.map((warranty) => {
            // Warranty REFURBISHED
            if (
              warranty?.meta?.shortLabel
                ?.replace(/[^\d\a-z\A-Z ]/g, "")
                .toUpperCase()
                .includes("REFURBISHED") ||
              warranty?.meta?.shortLabel
                ?.replace(/[^\d\a-z\A-Z ]/g, "")
                .toUpperCase()
                .includes("pre-owned") ||
              warranty?.meta?.shortLabel
                ?.replace(/[^\d\a-z\A-Z ]/g, "")
                .toUpperCase()
                .includes("preowned")
            ) {
              return {
                display_name: warranty?.meta?.shortLabel?.replace(
                  /[^\d\a-z\A-Z ]/g,
                  "",
                ),
                sku: warranty.sku || "",
                unit_price: roundNumberToDecimalPlacesWithoutNaNConversion(
                  unitPriceParser(warranty?.meta?.price?.totalCustomerPrice) /
                    warranty.quantity,
                ), // unitRegularPrice
                quantity: parseInt(warranty.quantity || 1),
                leasableOverride:
                  warranty.type && warranty.type?.toUpperCase() === "WARRANTY"
                    ? false
                    : warranty.isLeasable,
              };
            }
            return {
              display_name: warranty?.meta?.shortLabel?.replace(
                /[^\d\a-z\A-Z ]/g,
                "",
              ),
              sku: warranty.sku || "",
              unit_price: roundNumberToDecimalPlacesWithoutNaNConversion(
                unitPriceParser(warranty?.meta?.price?.totalCustomerPrice) /
                  warranty.quantity,
              ), // unitRegularPrice
              quantity: parseInt(warranty.quantity || 1),
              leasableOverride:
                warranty.type && warranty.type?.toUpperCase() === "WARRANTY"
                  ? false
                  : warranty.isLeasable,
            };
          }),
        );
      }
      // REFURBISHED
      if (
        item?.meta?.shortLabel
          ?.replace(/[^\d\a-z\A-Z ]/g, "")
          .toUpperCase()
          .includes("REFURBISHED") ||
        item?.meta?.shortLabel
          ?.replace(/[^\d\a-z\A-Z ]/g, "")
          .toUpperCase()
          .includes("pre-owned") ||
        item?.meta?.shortLabel
          ?.replace(/[^\d\a-z\A-Z ]/g, "")
          .toUpperCase()
          .includes("preowned")
      ) {
        return {
          display_name: item?.meta?.shortLabel?.replace(/[^\d\a-z\A-Z ]/g, ""),
          sku: item.sku || "",
          unit_price: roundNumberToDecimalPlacesWithoutNaNConversion(
            unitPriceParser(item?.meta?.price?.totalCustomerPrice) /
              item.quantity,
          ), // unitRegularPrice
          quantity: parseInt(item.quantity || 1),
        };
      }
      // check for pet items and technologies from model and air wraps
      if (
        item?.meta?.category?.skuClass === "836" ||
        item?.meta?.category?.skuClass === "559"
      ) {
        return {
          display_name: item?.meta?.shortLabel?.replace(/[^\d\a-z\A-Z ]/g, ""),
          sku: item.sku || "",
          unit_price: roundNumberToDecimalPlacesWithoutNaNConversion(
            unitPriceParser(item?.meta?.price?.totalCustomerPrice) /
              item.quantity,
          ), // unitRegularPrice
          quantity: parseInt(item.quantity || 1),
        };
      }

      return {
        display_name: item?.meta?.shortLabel?.replace(/[^\d\a-z\A-Z ]/g, ""),
        sku: item.sku || "",
        unit_price: roundNumberToDecimalPlacesWithoutNaNConversion(
          unitPriceParser(item?.meta?.price?.totalCustomerPrice) /
            item.quantity,
        ), // unitRegularPrice
        quantity: parseInt(item.quantity || 1),
        leasableOverride: item.isLeasable,
      };
    });
  }

  products.push(...installationProducts);
  products.push(...nonLeasableProducts);
  return products;
}

export function getPriceData(key) {
  let track = getTrackData();
  let mainObject = track?.order?.meta?.price;
  return mainObject?.[key] || "";
}

export function getSiteData(key) {
  let track = getTrackData();

  let address = track?.order?.items?.find((item) => {
    return (
      item.selectedFulfillment?.delivery || item.selectedFulfillment?.shipping
    );
  });
  let mainObject = address?.selectedFulfillment;

  if (!address) {
    mainObject = {
      delivery: {
        address: {
          street: billingAddParser(),
          city: billCityParser(),
          state: billStateParser(),
          zipcode: billZipParser(),
          dayPhoneNumber: track.phoneNumber || "",
        },
      },
    };
  }

  if (mainObject && mainObject.delivery && mainObject?.delivery?.address)
    mainObject = mainObject?.delivery?.address;
  else if (mainObject && mainObject.shipping && mainObject?.shipping?.address)
    mainObject = mainObject?.shipping?.address;
  else return "";
  if (!mainObject) return "";
  return mainObject[key] || "";
}

export function discountParser() {
  const products = getProducts();
  // get product with product name as Reward Certificates
  const rewardCertificates = products.find(
    (product) => product.display_name === "Reward Certificates",
  );

  const giftCards = products.find(
    (product) => product.display_name === "Gift Cards & Savings Codes",
  );

  // if reward certificate then get unit pice and put in discount
  if (rewardCertificates) {
    return [
      {
        discount_name: "Total Savings",
        //  discount_amount: amountPars",
        discount_amount: rewardCertificates.unit_price,
      },
    ];
  }
  if (giftCards) {
    return [
      {
        discount_name: "Total Savings",
        //  discount_amount: amountPars",
        discount_amount: giftCards.unit_price,
      },
    ];
  }
  return [
    {
      discount_name: "Total Savings",
      //  discount_amount: amountParser(getPriceData('totalSavings')) || 0.00,
      discount_amount: 0,
    },
  ];
}
export function saleTaxParser() {
  return amountParser(getPriceData("tax")) || 0.0;
}
export function shipParser() {
  const delivery = amountParser(getPriceData("delivery"));
  const shipping = amountParser(getPriceData("shipping"));
  const retailerDeliveryNode = Array.prototype.find.call(
    document.querySelectorAll(".order-summary__label"),
    (node) => node.innerText.toUpperCase().includes("RETAIL DELIVERY FEE"),
  );
  const retailerDeliveryFee = amountParser(
    retailerDeliveryNode?.nextElementSibling.innerText,
  );
  return delivery + shipping + retailerDeliveryFee || 0.0;
}
export function cartTotalParser() {
  return amountParser(getPriceData("total")) || 0.0;
  // return amountParser(getPriceData('total'))+amountParser(getPriceData('totalSavings')) || 0.00
}

export function itemParsers() {
  let products = getProducts();
  products = products.filter(
    (product) =>
      product.display_name !== "Reward Certificates" &&
      product.display_name !== "Gift Cards & Savings Codes"
  );
  return products.length ? products : [];
}
export function firstNameParser() {
  const data =
    getSiteData("firstName") !== ""
      ? getSiteData("firstName")
      : document.querySelector("input#first-name")?.value || "";
  if (!data) {
    try {
      return getNameFromFullName(
        document.querySelector(".billingAddressCard").firstChild.innerText,
      )[0];
    } catch (e) {
      return data;
    }
  }
  return data;
}
export function lastNameParser() {
  const data =
    getSiteData("lastName") !== ""
      ? getSiteData("lastName")
      : document.querySelector("input#last-name")?.value || "";
  if (!data) {
    try {
      return getNameFromFullName(
        document.querySelector(".billingAddressCard").firstChild.innerText,
      )[1];
    } catch (e) {
      return data;
    }
  }
  return data;
}
export function emailParser() {
  return getEmail() || "";
}
export function phoneParser() {
  return getSiteData("dayPhoneNumber") || "";
}
export function addressParser() {
  return getSiteData("street") !== ""
    ? getSiteData("street")
    : document.querySelector("input#address-input")?.value ||
        billingAddParser();
}
export function cityParser() {
  return getSiteData("city") !== ""
    ? getSiteData("city")
    : document.querySelector("input#city")?.value || billCityParser();
}
export function stateParser() {
  return getSiteData("state") !== ""
    ? getSiteData("state")
    : document.querySelector("select#state")?.value || billStateParser();
}
export function zipParser() {
  return getSiteData("zipcode") !== ""
    ? getSiteData("zipcode")
    : document.querySelector("input#postalCode")?.value || billZipParser();
}
function getAddressFromDropDown(key) {
  const node = document.querySelector("#billing-addresses-payment-panel");
  if (!node) return "";
  const nodes = node?.innerText.replaceAll("\n\n", "\n")?.split("\n");
  const cityStateZip = nodes[nodes.length - 1];
  const data = {
    city: cityStateZip.split(",")[0].trim(),
    state: cityStateZip?.split(",")[1]?.trim()?.split(" ")[0]?.trim() || "",
    zip: cityStateZip?.split(",")[1]?.trim()?.split(" ")[1]?.trim() || "",
    address: nodes[1]?.trim(),
  };
  return data[key];
}
export function billingAddParser() {
  var billingcardNode = document.querySelector(".billingAddressCard");
  return billingcardNode !== null
    ? document.querySelector("[data-test=street]").textContent.trim()
    : document.querySelector("input#address-input")?.value ||
        getAddressFromDropDown("address") ||
        "";
}
export function billCityParser() {
  var billingcardNode = document.querySelector(".billingAddressCard");
  return billingcardNode !== null
    ? document.querySelector("[data-test=city]").textContent.trim()
    : document.querySelector("input#city")?.value ||
        getAddressFromDropDown("city") ||
        "";
}
export function billStateParser() {
  var billingcardNode = document.querySelector(".billingAddressCard");
  return billingcardNode !== null
    ? document.querySelector("[data-test=state]").textContent.trim()
    : document.querySelector("select#state")?.value ||
        getAddressFromDropDown("state") ||
        "";
}
export function billZipParser() {
  //condition for saved-card
  if (!document.querySelectorAll(".billing-info-form-wrapper").length && JSON.parse(sessionStorage.getItem('isPickup'))) {
    return sessionStorage.getItem("zip")
  }
  var billingcardNode = document.querySelector(".billingAddressCard");

  return billingcardNode !== null
    ? document.querySelector("[data-test=zipCode]").textContent.trim()
    : document.querySelector("input#postalCode")?.value ||
        getAddressFromDropDown("zip") ||
        "";
}

export function address2Parser() {
  return getSiteData("street2") !== ""
    ? getSiteData("street2")
    : document.querySelector("input#address2-input")?.value || "";
}

export function pickupDiscountPraser() {
  return [
    {
      discount_name: "Total Savings",
      discount_amount: 0,
    },
  ];
}
export function pickupAddressParser() {
  //condition for saved-card
  if (!document.querySelectorAll(".billing-info-form-wrapper").length && JSON.parse(sessionStorage.getItem('isPickup'))) {
    return sessionStorage.getItem("address")
  }
  return document.querySelector('#address-input')?.value || "";
}

export function pickupAddress2Parser() {
  return "";
}

export function pickupCityParser() {
  //condition for saved-card
  if (!document.querySelectorAll(".billing-info-form-wrapper").length && JSON.parse(sessionStorage.getItem('isPickup'))) {
    return sessionStorage.getItem("city")
  }
  return document.querySelector('input#city')?.value || "";
}

export function pickupStateParser() {
  //condition for saved-card
  if (!document.querySelectorAll(".billing-info-form-wrapper").length && JSON.parse(sessionStorage.getItem('isPickup'))) {
    return sessionStorage.getItem("state")
  }
  return document.querySelector('select#state')?.value || "";
}

export function pickupZipParser() {
  //condition for saved-card
  if (!document.querySelectorAll(".billing-info-form-wrapper").length && JSON.parse(sessionStorage.getItem('isPickup'))) {
    return sessionStorage.getItem("zip")
  }
  return document.querySelector('input#postalCode')?.value || "";
}

export function billingAddressParser() {
  console.log("billAddress--")
  //condition for saved-card
  if (!document.querySelectorAll(".billing-info-form-wrapper").length && JSON.parse(sessionStorage.getItem('isPickup'))) {
    return sessionStorage.getItem("address")
  }
  if(document.querySelector('[data-test="street"]'))
  {
    return document.querySelector('[data-test="street"]').textContent?.trim();
  }
  return document.querySelector('#address-input')?.value || "";
}

export function billingCityParser() {
  //condition for saved-card
  if (!document.querySelectorAll(".billing-info-form-wrapper").length && JSON.parse(sessionStorage.getItem('isPickup'))) {
    return sessionStorage.getItem("city")
  }
  if(document.querySelector('[data-test="city"]'))
    {
      return document.querySelector('[data-test="city"]').textContent;
    }
  return document.querySelector('input#city')?.value || "";
}

export function billingStateParser() {
  //condition for saved-card
  if (!document.querySelectorAll(".billing-info-form-wrapper").length && JSON.parse(sessionStorage.getItem('isPickup'))) {
    return sessionStorage.getItem("state")
  }
  if(document.querySelector('[data-test="state"]'))
    {
      return document.querySelector('[data-test="state"]').textContent;
    }
  return document.querySelector('select#state')?.value || "";
}

export function billingZipParser() {
  if(document.querySelector('[data-test="zipCode"]'))
    {
      return document.querySelector('[data-test="zipCode"]').textContent;
    }
  return document.querySelector('input#postalCode')?.value || "";
}

export function pickupFirstNameParser() {
  return document.querySelector('input#first-name')?.value || "";
}

export function pickupLastNameParser() {
  return document.querySelector('input#last-name')?.value || "";
}

export function pickupPhoneParser() {
  const storedPhone = sessionStorage.getItem('pickupPhone');
  
  if (storedPhone) {
    return storedPhone;
  }

  const phoneInput = document.querySelector('input#user\\.phone');

  if (phoneInput) {
    const phoneNumber = phoneInput.value.trim();
    sessionStorage.setItem('pickupPhone', phoneNumber);
    return phoneNumber;
  }

  return "";
}
export function pickupAmountParser() {
  let pickupDelivery = 0.0;
  let regularDelivery = 0.0;
  const pickupElement = Array.from(document.querySelectorAll('.order-summary-card__total-line')).find(line => {
    const labelElement = line.querySelector('.order-summary__label span');
    return labelElement && labelElement.textContent.trim() === 'Store Pickup';
  });
  const regularDeliveryElement = Array.from(document.querySelectorAll('.order-summary-card__total-line')).find(line => {
    const labelElement = line.querySelector('.order-summary__label span');
    return labelElement && labelElement.textContent.trim() === 'Delivery';
  });
  if (pickupElement) {
    const shippingAmountElement = pickupElement.querySelector('.order-summary__price .cash-money');
    if (shippingAmountElement) {
      const amountText = shippingAmountElement.textContent.trim();
      if (amountText === 'FREE') {
        pickupDelivery = 0.0;
      }
      pickupDelivery = parseFloat(amountText.replace(/[^\d.-]/g, '')) || 0.0;
    }
  }
  if (regularDeliveryElement) {
    const shippingAmountElement = regularDeliveryElement.querySelector('.order-summary__price .cash-money');
    if (shippingAmountElement) {
      const amountText = shippingAmountElement.textContent.trim();
      if (amountText === 'FREE') {
        regularDelivery = 0.0;
      }
      regularDelivery = parseFloat(amountText.replace(/[^\d.-]/g, '')) || 0.0;
    }
  }

  return pickupDelivery + regularDelivery;
}

export const pickupParsers = {
  cart_total: constructParser("cart_total", "body", false, cartTotalParser),
  discounts: constructParser("discounts", "body", false, discountParser),
  first_name: constructParser("first_name", "body", false, pickupFirstNameParser),
  last_name: constructParser("last_name", "body", false, pickupLastNameParser),
  email: constructParser("email", "body", false, emailParser),
  phone: constructParser("phone", "body", false, pickupPhoneParser),
  items: constructParser("items", "body", false, itemParsers),
  sales_tax: constructParser("sales_tax", "body", false, saleTaxParser),
};

export const pickupAddressParsers = {
  address: constructParser("address", "body", false, billingAddressParser),
  address2: constructParser("address2", "body", false, pickupAddress2Parser),
  city: constructParser("city", "body", false, billingCityParser),
  state: constructParser("state", "body", false, billingStateParser),
  zip: constructParser("zip", "body", false, billZipParser),
  // billing_address: constructParser("billing_address", "body", false, pickupAddressParser),
  // billing_city: constructParser("billing_city", "body", false, pickupCityParser),
  // billing_state: constructParser("billing_state", "body", false, pickupStateParser),
  // billing_zip: constructParser("billing_zip", "body", false, pickupZipParser),
  shipping_amount: constructParser("shipping_amount", "body", false, pickupAmountParser),
};

export const billingAddressParsers = {
  billing_address: constructParser("billing_address", "body", false, billingAddressParser),
  billing_city: constructParser("billing_city", "body", false, billingCityParser),
  billing_state: constructParser("billing_state", "body", false, billingStateParser),
  billing_zip: constructParser("billing_zip", "body", false, billingZipParser),
};

export const parsers = {
  discounts: constructParser("discounts", "body", false, discountParser),
  sales_tax: constructParser("sales_tax", "body", false, saleTaxParser),
  cart_total: constructParser("cart_total", "body", false, cartTotalParser),
  items: constructParser("items", "body", false, itemParsers),
  first_name: constructParser("first_name", "body", false, firstNameParser),
  last_name: constructParser("last_name", "body", false, lastNameParser),
  email: constructParser("email", "body", false, emailParser),
  phone: constructParser("phone", "body", false, phoneParser),
};

export const deliveryAddressParsers = {
  address: constructParser("address", "body", false, addressParser),
  address2: constructParser("address2", "body", false, address2Parser),
  city: constructParser("city", "body", false, cityParser),
  state: constructParser("state", "body", false, stateParser),
  zip: constructParser("zip", "body", false, zipParser),
  // billing_address: constructParser(
  //   "billing_address",
  //   "body",
  //   false,
  //   billingAddParser,
  // ),
  // billing_city: constructParser("billing_city", "body", false, billCityParser),
  // billing_state: constructParser(
  //   "billing_state",
  //   "body",
  //   false,
  //   billStateParser,
  // ),
  // billing_zip: constructParser("billing_zip", "body", false, billZipParser),
  shipping_amount: constructParser(
    "shipping_amount",
    "body",
    false,
    shipParser,
  ),
}

const bestbuyMerchant = Object.create(AbstractMerchant);
const bestbuyParser = Object.create(DOMParser, {
  parsers: {
    value: parsers,
  },
});
const bestbuyPickupParser = Object.create(DOMParser, {
  parsers: {
    value: pickupParsers,
  },
});

export const runMerchant = debounce(() => {
  let billingSameAsShipping = document.querySelector('#billing-address-checkbox')?.checked || true;
  console.log('insode debounce',billingSameAsShipping,'here',document.querySelector('#billing-address-checkbox')?.checked)
  bestbuyMerchant.customerAddress.setBillingSameAsShipping(billingSameAsShipping);
  bestbuyMerchant.run();
}, 1000);
export const debouncedWindowDispatcher = debounce(() => {
  bestbuyMerchant.setWindowDispatcher();
}, 500);

export function tocheckIf() {
  let track = getTrackData();
  if (!track.order) window.location.pathname = "/checkout/r/fulfillment";
}

export function windowload() {
  if (window.location.pathname.includes("checkout/r/payment")) {
    setTimeout(tocheckIf, 3000);
  }

  // window.addEventListener("locationchange", () => initialiseMerchant());
  // window.addEventListener('load', initialiseMerchant);
  initialiseMerchant();

  const debouncedUpdateCheckoutData = debounce(
    () => initialiseMerchant(0),
    2000,
  );

  function addEvents() {
    if (document.querySelector("#billing-addresses-payment-panel")) {
      document
        .querySelector("#billing-addresses-payment-panel")
        .addEventListener("DOMSubtreeModified", debouncedUpdateCheckoutData);
    }
    delegate(
      document,
      "change",
      "input#first-name",
      debouncedUpdateCheckoutData,
    );
    delegate(
      document,
      "change",
      "input#last-name",
      debouncedUpdateCheckoutData,
    );
    delegate(document, "change", "input#address-input", () => {
      setTimeout(debouncedUpdateCheckoutData, 1000);
    });
    delegate(document, "change", "input#city", debouncedUpdateCheckoutData);
    delegate(document, "change", "select#state", debouncedUpdateCheckoutData);
    delegate(
      document,
      "change",
      "input#postalCode",
      debouncedUpdateCheckoutData,
    );
    delegate(
      document,
      "change",
      "input#address2-input",
      debouncedUpdateCheckoutData,
    );
  }
  function executeaddEvent() {
    if (document.querySelector("#billing-addresses-payment-panel")) {
      document
        .querySelector("#billing-addresses-payment-panel")
        .addEventListener("DOMSubtreeModified", debouncedUpdateCheckoutData);
    }
    setTimeout(addEvents, 3000);
  }
  window.addEventListener("locationchange", executeaddEvent);
  executeaddEvent();
  // Item Remove button

  delegate(document, "click", ".item-list__action", function () {
    setTimeout(runMerchant, 5000);
  });
  // Rerun Merchant on click
  delegate(document, "click", '[data-track="gift-promo-code-link"]', function () {
    setTimeout(() => {
      // On field blur
      if (document.querySelector("input#gcNumber")) {
        document
          .querySelector("input#gcNumber")
          .addEventListener("blur", function () {
            setTimeout(runMerchant, 5000);
          });
      }

      // On apply click
      delegate(document, "click", ".gc-apply-button", function () {
        setTimeout(runMerchant, 5000);
      });
      // New form apply button
      delegate(document, "click", ".new-address-form__button", function () {
        setTimeout(runMerchant, 5000);
      });

    }, 5000);
  });
  
}
let isSpecialInputListenersSetup = false;
function setupSpecialInputListeners() {
  if (isSpecialInputListenersSetup) return;
  if (document.querySelector("input#first-name")) {
    document
      .querySelector("input#first-name")
      .addEventListener("blur", function () {
        setTimeout(runMerchant, 3000);
      });
  }
  if (document.querySelector("input#last-name")) {
    document
      .querySelector("input#last-name")
      .addEventListener("blur", function () {
        setTimeout(runMerchant, 3000);
      });
  }
  if (document.querySelector("input#address-input")) {
    document
      .querySelector("input#address-input")
      .addEventListener("blur", function () {
        setTimeout(runMerchant, 3000);
      });
  }
  if (document.querySelector("input#city")) {
    document.querySelector("input#city").addEventListener("blur", function () {
      setTimeout(runMerchant, 3000);
    });
  }
  //zipcode
  if (document.querySelector("input#postalCode")) {
    document
      .querySelector("input#postalCode")
      .addEventListener("blur", function () {
        setTimeout(runMerchant, 3000);
      });

      document
      .querySelector("input#postalCode")
      .addEventListener("input", function (e) {
        let val = this.value;
        if (!val && val.length < 5) { return false;}
        setTimeout(runMerchant, 3000);
      });
  }
  // Gift Card
  if (document.querySelector("input#gcNumber")) {
    document
      .querySelector("input#gcNumber")
      .addEventListener("blur", function () {
        setTimeout(runMerchant, 3000);
      });
  }
  // Gift Card Removal
  document.addEventListener("click", function (event) {
    if (event.target && event.target.classList.contains("update-payment-method")) {
      setTimeout(runMerchant, 3000);
    }
  });
  
  isSpecialInputListenersSetup = true;
}

export function hasShippingAddress() {
  const shippingAddressElement = document.querySelector('.shipping-location-address-container__heading span');
  if (shippingAddressElement && shippingAddressElement.textContent.trim() === 'Shipping Address') {
    return true;
  }
  return false;
}

console.log("Befor-pickup")
export function isPickup() {
  console.log("inside pickup")
  if (hasShippingAddress()) {
    sessionStorage.setItem('isPickup', 'false');
    return false;
  } else {
    console.log("inside else")
    const pickupElement = document.querySelector('.spu-location-card__location-group-title');
    if (pickupElement?.textContent.trim().toLowerCase().includes('store pickup details')) {
      sessionStorage.setItem('isPickup', 'true');
      
      //condition for saved-card
      sessionStorage.setItem('address', document.querySelector(".spu-store-information>span")?.textContent);
      sessionStorage.setItem('city', document.querySelector(".spu-store-information>span:nth-of-type(2)").textContent.trim().split(",")[0]);
      sessionStorage.setItem('state', document.querySelector(".spu-store-information>span:nth-of-type(2)").textContent.trim().split(",")[1].trim().split(' ')[0]);
      sessionStorage.setItem('zip',  document.querySelector(".spu-store-information>span:nth-of-type(2)").textContent.trim().split(",")[1].trim().split(' ')[1]);
      return true;
    }
    sessionStorage.setItem('isPickup', 'false');
    return false;
  }
}

export function isPickupSession() {
  const pickupData = sessionStorage.getItem('isPickup');
  if (pickupData !== null) {
    return pickupData === 'true' ? true : false;
  } else {
    return false;
  }
}

export function storeAddressParsers() {
  console.log("Store address")
  pickupAddressParser();
  pickupAddress2Parser();
  pickupCityParser();
  pickupStateParser();
  pickupZipParser();
  pickupFirstNameParser();
  pickupLastNameParser();
  pickupPhoneParser();
}

export function initialiseMerchant(timeout = 5000) {
  console.log("initalize--")
  if (window.location.pathname.includes("checkout/r/fast-track")) {
    setupSpecialInputListeners();
    setTimeout(function () {
      tocheckIf();
      const provider = getZibbyConfigFor(process.env.APP_ENV);
      const config = provider(process.env.APP_URL, "bestbuy");
      bestbuyMerchant.init(config, bestbuyParser);
      let billingSameAsShipping = document.querySelector('#billing-address-checkbox')?.checked || true;
      bestbuyMerchant.customerAddress.setBillingSameAsShipping(billingSameAsShipping);
      console.log('insode initialise',billingSameAsShipping,'here',document.querySelector('#billing-address-checkbox')?.checked)
      bestbuyMerchant.run();
    }, timeout);
  } else if ((window.location.pathname.includes("/checkout/r/fulfillment") ||
    window.location.pathname.includes("checkout/r/payment"))) {
      console.log("initalize-2-")
    setupSpecialInputListeners();
    tocheckIf();
    storeAddressParsers();
    setTimeout(function () {
      const provider = getZibbyConfigFor(process.env.APP_ENV);
      const config = provider(process.env.APP_URL, "bestbuy");
      let parser = bestbuyPickupParser;
      let isPickUp='';
      if (window.location.pathname.includes("/checkout/r/fulfillment")) {
        console.log("if-else-if")
        isPickUp = isPickup();
        parser = isPickUp ? bestbuyPickupParser : bestbuyParser;
        console.log('isPickUp',isPickUp)
      } else if (window.location.pathname.includes("checkout/r/payment")) {
        console.log("else-if")
        isPickUp = isPickupSession();
        console.log('isPickUpSession',isPickUp)
        if (isPickUp) {
          parser = Object.create(DOMParser, {
            parsers: {
              value: {
                ...pickupParsers,
                ...pickupAddressParsers
              }
            }
          })
        } else if (!document.querySelectorAll(".billing-info-form-wrapper").length && !JSON.parse(sessionStorage.getItem('isPickup'))) { 
          parser = Object.create(DOMParser, {
            parsers: {
              value: {
                ...parsers,
                ...deliveryAddressParsers,
              }
            }
          })
        } else {
          console.log("Else-statement")
          parser = Object.create(DOMParser, {
            parsers: {
              value: {
                ...parsers,
                ...deliveryAddressParsers,
                ...billingAddressParsers
              }
            }
          })
        }
      }
      console.log('isPickUp if loop',isPickUp);
      if(isPickUp)
      {
        console.log('isPickUp entered',isPickUp)
        bestbuyMerchant.customerAddress.setBillingSameAsShipping(true);
      }
      console.log("Saved-card")
      //condition for saved-card
      if (!document.querySelectorAll(".billing-info-form-wrapper").length) {
        console.log("Inside-saved-card")
        bestbuyMerchant.customerAddress.setBillingSameAsShipping(true);
      }
      bestbuyMerchant.init(config, parser);
      bestbuyMerchant.run();
    }, 1000);
  }
}

delegate(document, "click", "#billing-address-checkbox", ()=>setTimeout(runMerchant,1000));

setUpListenersForLocationChange();
windowload();

