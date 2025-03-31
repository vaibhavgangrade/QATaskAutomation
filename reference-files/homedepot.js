import { getZibbyConfigFor } from "../config/configProvider";
import { constructParser, debounce, replaceSpecialCharactersAndAlphabets, withEventHandler } from "../js/utility";
import { AbstractMerchant, DOMParser } from "../js/abstractMerchant";
import { delegate } from "../js/globalHelper";

export function emailParser(node) {
    return node.textContent;
}

export function phoneParser(node) {
    return node.lastChild.textContent;
}

export function lastNameParser(node) {
    return node.childNodes[0].textContent.split(' ').slice(-1)[0];
}

export function firstNameParser(node) {
    return node.childNodes[0].textContent.split(' ').slice(0, -1).join(' ');
}

export function addressParser(node) {
    return node.childNodes[1].textContent;
}

export function address2Parser(node) {
    const length = node.childNodes.length;
    const address2 = length > 4 ? node.childNodes[2].textContent : '';
    return address2;
}

export function cityStateZipNodeDataExtraction(node) {
    const length = node.childNodes.length;
    return node.childNodes[length - 2].textContent;
}

export function cityParser(node) {
    const data = cityStateZipNodeDataExtraction(node);
    return data.split(',')[0];
}

export function stateParser(node) {
    const data = cityStateZipNodeDataExtraction(node);
    return data.trim().split(',')[1].trim().split(' ')[0];
}

export function zipParser(node) {
    const data = cityStateZipNodeDataExtraction(node);
    return data.trim().split(',')[1].trim().split(' ')[1];
}

export function salesTaxParser(node) {
    const tax = parseFloat(replaceSpecialCharactersAndAlphabets(node.textContent));
    return isNaN(tax) ? 0 : parseFloat(tax);
}

export function cartTotalParser(node) {
    const total = parseFloat(replaceSpecialCharactersAndAlphabets(node.textContent));
    return isNaN(total) ? 0 : parseFloat(total);
}

export function shippingParser() {
    const delivery = replaceSpecialCharactersAndAlphabets(document.querySelector(`[data-automation-id="applianceCost"]`)?.textContent);
    const appDelivery = replaceSpecialCharactersAndAlphabets(document.querySelector(`[data-automation-id="shippingCost"]`)?.textContent);

    return (delivery==='' ||  isNaN(delivery) ? 0 : delivery) + (appDelivery==='' || isNaN(appDelivery) ? 0 : appDelivery);
}

export function getUnitPricePerItem(item, warrantyItems, relatedServices) {
    let optionalLineItemsTotalPriceforItem = item.optionalLineItems?.lineItem?.reduce((a, c) => a + parseFloat(c.totalItemPrice), 0) || 0

    let requiredLineItemsTotalPriceforItem = item.requiredLineItems?.lineItem?.filter(item=>{
        return !item.description.includes('Install')
    }).reduce((a, c) => a + parseFloat(c.totalItemPrice), 0) || 0

    let installationCharges = item.requiredLineItems?.lineItem?.filter(item=>{
        return item.description.includes('Install')
    }).reduce((a, c) => a + parseFloat(c.totalItemPrice), 0) || 0

    let warrantyLineItemsTotalPriceforItem = item.warrantyLineItems?.lineItem?.reduce((a, c) => a + parseFloat(c.totalItemPrice), 0) || 0

    warrantyLineItemsTotalPriceforItem && warrantyItems.push({
        display_name: 'Warranty',
        sku: 'Warranty',
        unit_price: warrantyLineItemsTotalPriceforItem,
        quantity: 1
    });

    relatedServices && relatedServices.push({
        display_name: 'RelatedServices',
        sku: 'RelatedServices',
        unit_price: optionalLineItemsTotalPriceforItem + installationCharges,
        quantity: 1,
        leasableOverride: false,
    });

    let unit_price = item.specialOfferPrice ? parseFloat(item.specialOfferPrice) : parseFloat(item.unitPrice)

    return unit_price + requiredLineItemsTotalPriceforItem;

}

export function productItemParser() {
    let warrantyItemsList = []
    let relatedServicesList = []
    const nodes = JSON.parse(localStorage.getItem('THD_CART')).previousCart.itemModels;

    const itemList = nodes.map((item) => {
        return {
        display_name: (item.brandName || '') + ' ' + item.description,
        sku: (item.brandName || '') + ' ' + item.description,
            unit_price: getUnitPricePerItem(item, warrantyItemsList, relatedServicesList),
            quantity: item.quantity,
            category_metadata: item.description.toUpperCase().includes('WATER HEATER') ? { category: 'water heater' } : {}
        }
    })

    for (let i of warrantyItemsList) { itemList.push(i) }
    for (let i of relatedServicesList) { itemList.push(i) }

    return itemList;
}
export const parsers = {
    discounts: constructParser('discounts').val(
        [
            {
                discount_name: "Total Savings",
                discount_amount: 0
            }
        ]
    ),
    email: constructParser('email', `[data-qm-encrypt]`, false, emailParser),
    phone: constructParser('phone', `[for='DeliveryInformation'] .accordion__content div div`, false, phoneParser),
    first_name: constructParser('first_name', `[for='DeliveryInformation'] .accordion__content div div`, false, firstNameParser),
    last_name: constructParser('last_name', `[for='DeliveryInformation'] .accordion__content div div`, false, lastNameParser),
    address: constructParser('address', `[for='DeliveryInformation'] .accordion__content div div`, false, addressParser),
    address2: constructParser('address2', `[for='DeliveryInformation'] .accordion__content div div`, false, address2Parser),
    city: constructParser('city', `[for='DeliveryInformation'] .accordion__content div div`, false, cityParser),
    state: constructParser('state', `[for='DeliveryInformation'] .accordion__content div div`, false, stateParser),
    zip: constructParser('zip', `[for='DeliveryInformation'] .accordion__content div div`, false, zipParser),
    sales_tax: constructParser('sales_tax', `[data-automation-id="taxCost"]`, false, salesTaxParser),
    shipping_amount: constructParser('shipping_amount', `body`, false, shippingParser),
    cart_total: constructParser('cart_total', `[data-automation-id="total_price"]`, false, cartTotalParser),
    items: constructParser('items', '.product', true, productItemParser)
}
//Pickup Parsers
export function phoneParser2(node) {
    return node.childNodes[2].textContent;
}

export function lastNameParser2(node) {
    return node.childNodes[0].textContent.split(' ').slice(-1)[0];
}

export function firstNameParser2(node) {
    return node.childNodes[0].textContent.split(' ').slice(0, -1).join(' ');
}

export function addressParser2(node) {
    return node.textContent;
}

export function cityParser2(node) {
    return node.textContent.trim().split(',')[0]
}

export function stateParser2(node) {
    return node.textContent.trim().split(',')[1].trim().split(' ')[0]

}
export function zipParser2(node) {
    return node.textContent.trim().split(',')[1].trim().split(' ')[1]

}
export const pickupParser = {
    discounts: constructParser('discounts').val(
        [
            {
                discount_name: "Total Savings",
                discount_amount: 0
            }
        ]
    ),
    email: constructParser('email', `[data-qm-encrypt]`, false, emailParser),
    phone: constructParser('phone', `[for='Contact'] div span div div`, false, phoneParser2),
    first_name: constructParser('first_name', `[for='Contact'] div span div div`, false, firstNameParser2),
    last_name: constructParser('last_name', `[for='Contact'] div span div div`, false, lastNameParser2),
    sales_tax: constructParser('sales_tax', `[data-automation-id="taxCost"]`, false, salesTaxParser),
    shipping_amount: constructParser('shipping_amount', `body`, false, shippingParser),
    cart_total: constructParser('cart_total', `[data-automation-id="total_price"]`, false, cartTotalParser),
    items: constructParser('items', '.product', true, productItemParser)
}

const billingCityParser = () => {
    const target = document.querySelector(`[name='billingAddressForm'] [name='cityState']`);
    return target?.selectedOptions[0]?.text?.split(',')[0].trim();
}

const billingStateParser = () => {
    const target = document.querySelector(`[name='billingAddressForm'] [name='cityState']`);
    return target?.selectedOptions[0]?.text?.split(',')[1].trim();
}

const billingDataParser = (index) => {
    if (document.querySelector(`[name="setNewAddress"]`)?.selectedOptions[0]?.text) {
        const data = document.querySelector(`[name="setNewAddress"]`)?.selectedOptions[0]?.text;
        const address = data.split(',');
        if (address.length === 4) {
            return address[index].trim();
        } else {
            //adding provision for address line 2
            return index === 0 ? address[index].trim() : address[index + 1].trim()
        }
    }
}

const pickupAddressWithSelectDropDown = {
    address: constructParser('address', `#billing-addl1`, false, () => billingDataParser(0)),
    city: constructParser('city', `[name='billingAddressForm'] [name='cityState']`, false, () => billingDataParser(1)),
    state: constructParser('state', `[name='billingAddressForm'] [name='cityState']`, false, () => billingDataParser(2)),
    zip: constructParser('zip', `[name='billingAddressForm'] [name='zipCodeField']`, false, () => billingDataParser(3)),
}



const parserWithBillingSelectDropDown = {
    billing_address: constructParser('billing_address', `#billing-addl1`, false, () => billingDataParser(0)),
    billing_city: constructParser('billing_city', `[name='billingAddressForm'] [name='cityState']`, false, () => billingDataParser(1)),
    billing_state: constructParser('billing_state', `[name='billingAddressForm'] [name='cityState']`, false, () => billingDataParser(2)),
    billing_zip: constructParser('billing_zip', `[name='billingAddressForm'] [name='zipCodeField']`, false, () => billingDataParser(3)),
}

const rerunParser = debounce(() => {
    const intervalId = setInterval(() => {
        if (document.querySelector(`[name='billingAddressForm'] [name='cityState']`)) {
            clearInterval(intervalId);
            let modifiedParser = checkIfDelivery() ? parserObj : pickupParserObj;
            initialiseMerchant(modifiedParser);
        }
    });
}, 2000);

const pickupAddressWithBillingForm = {
    address: withEventHandler('change', rerunParser, constructParser('address', `#billing-addl1`, false)),
    city: withEventHandler('change', rerunParser, constructParser('city', `[name='billingAddressForm'] [name='cityState']`, false, billingCityParser)),
    state: withEventHandler('change', rerunParser, constructParser('state', `[name='billingAddressForm'] [name='cityState']`, false, billingStateParser)),
    zip: withEventHandler('change', rerunParser, constructParser('zip', `[name='billingAddressForm'] [name='zipCodeField']`, false)),
}


const parserWithBillingForm = {
    billing_address: withEventHandler('change', rerunParser, constructParser('billing_address', `#billing-addl1`, false)),
    billing_city: withEventHandler('change', rerunParser, constructParser('billing_city', `[name='billingAddressForm'] [name='cityState']`, false, billingCityParser)),
    billing_state: withEventHandler('change', rerunParser, constructParser('billing_state', `[name='billingAddressForm'] [name='cityState']`, false, billingStateParser)),
    billing_zip: withEventHandler('change', rerunParser, constructParser('billing_zip', `[name='billingAddressForm'] [name='zipCodeField']`, false)),
}

const parserObj = Object.create(DOMParser, {
    parsers: {
        value: parsers
    }
})

const pickupParserObj = Object.create(DOMParser, {
    parsers: {
        value: pickupParser
    }
})

const merchantObj = Object.create(AbstractMerchant);

function initialiseMerchant(parser) {
    const provider = getZibbyConfigFor(process.env.APP_ENV);
    const config = provider(process.env.APP_URL, 'homedepot');


    if (!document.querySelector('[name="setNewAddress"]')) {
        if (document.querySelector('#billing-addl1')) {
            const addressParsers = checkIfDelivery() ? {} : pickupAddressWithBillingForm;
            parser = Object.create(DOMParser, {
                parsers: {
                    value: {
                        ...parser.parsers,
                        ...addressParsers,
                        ...parserWithBillingForm
                    }
                }
            });
        } else {
            merchantObj.customerAddress.setBillingSameAsShipping(true);
        }
    } else {
        const addressParsers = checkIfDelivery() ? {} : pickupAddressWithSelectDropDown;
        parser = Object.create(DOMParser, {
            parsers: {
                value: {
                    ...parser.parsers,
                    ...addressParsers,
                    ...parserWithBillingSelectDropDown
                }
            }
        })
    }

    merchantObj.init(config, parser);
    merchantObj.run();
}

delegate(document, 'click', `[data-automation-id="Continue_Appliance"]`, check);
delegate(document, 'click', `[data-automation-id="Continue_StorePickup"]`, check);
delegate(document, 'click', `[data-automation-id="Continue_DeliveryInformation"]`, check);

var intervalId;

function checkIfDelivery(){
    const nodes = document.querySelectorAll('.accordion__item__label--title');
    return Array.prototype.some.call(nodes,(node)=>node.innerText.includes('Delivery'));
}

function check() {
    clearInterval(intervalId)
    intervalId = setInterval(() => {
        const node = document.querySelector(`[for='DeliveryInformation'] .accordion__content div div`);
        const firstName = node? firstNameParser(node) : false;
        if ((document.querySelector(`[for='DeliveryInformation'] .accordion__content`) && firstName)) {
            clearInterval(intervalId)
            setTimeout(() => {
                if ((document.querySelector(`[for='DeliveryInformation'] .accordion__content`) && firstName)) {
                    initialiseMerchant(parserObj)
                }
            }, 2000);
        }

        setTimeout(()=>{
            if (!checkIfDelivery()) {
                console.log('pickup is used');
                clearInterval(intervalId);
                initialiseMerchant(pickupParserObj)
            }
        },4000)

    }, 2000);

}
//when user select the billing address drop down
delegate(document, 'change', '[name="setNewAddress"]', () => {
    let modifiedParser = checkIfDelivery() ? parserObj : pickupParserObj;
    initialiseMerchant(modifiedParser);
})

