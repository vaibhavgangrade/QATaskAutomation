import { getZibbyConfigFor } from "../config/configProvider";
import { constructParser, replaceSpecialCharactersAndAlphabets } from "../js/utility";
import { AbstractMerchant, DOMParser } from "../js/abstractMerchant";
import { delegate, isInsideReactNative } from "../js/globalHelper";
console.log('dom parser');

(function creatingDynamicLoader() {
    const div = document.createElement('div')
    div.id = 'cover-spin'
    document.body.appendChild(div)

    const style = document.createElement('style')

    style.innerText = `#cover-spin {
    position:fixed;
    width:100%;
    left:0;right:0;top:0;bottom:0;
    background-color: rgba(50,50,50,0.7);
    z-index:9999;
    display:none;
    }

    @-webkit-keyframes spin {
        from {-webkit-transform:rotate(0deg);}
        to {-webkit-transform:rotate(360deg);}
    }

    @keyframes spin {
        from {transform:rotate(0deg);}
        to {transform:rotate(360deg);}
    }

    #cover-spin::after {
        content:'';
        display:block;
        position:absolute;
        left:48%;top:40%;
        width:40px;height:40px;
        border-style:solid;
        border-color:white;
        border-top-color:transparent;
        border-width: 4px;
        border-radius:50%;
        -webkit-animation: spin .8s linear infinite;
        animation: spin .8s linear infinite;
    }`
    document.body.appendChild(style)

})()

export function lastNameParser(node) {
    let nameNode = node ? node : document.querySelector('#delivery-card-header').nextElementSibling.querySelector('div > div');
    return nameNode.children[0].textContent.split(' ').slice(-1)[0]
}

export function firstNameParser(node) {
    let nameNode = node ? node : document.querySelector('#delivery-card-header').nextElementSibling.querySelector('div > div');
    return nameNode.children[0].textContent.split(' ').slice(0, -1).join(' ');
}

export function stateParser(node) {
    let addressNode = node ? node : document.querySelector('#delivery-card-header').nextElementSibling.querySelector('div > div');
    return addressNode.children[1].textContent.split(',').slice(-1)[0].trim().split(' ')[0];
}

export function zipParser(node) {
    let addressNode = node ? node : document.querySelector('#delivery-card-header').nextElementSibling.querySelector('div > div');
    return addressNode.children[1].textContent.split(',').slice(-1)[0].trim().split(' ')[1];
}

export function cityParser(node) {
    let addressNode = node ? node : document.querySelector('#delivery-card-header').nextElementSibling.querySelector('div > div');
    return addressNode.children[1].textContent.split(',').slice(-2)[0].trim();
}

export function addressParser(node) {
    let addressNode = node ? node : document.querySelector('#delivery-card-header').nextElementSibling.querySelector('div > div');
    return addressNode.children[1].textContent.split(',').slice(0, -2).join(',');
}

export function emailParser(node) {
    return JSON.parse(node.textContent).props.pageProps.bootstrapData.account.data.account.profile.emailAddress
}

export function phoneParser(node) {
    return node.value;
}

export function amountParser(node) {
    return parseFloat(replaceSpecialCharactersAndAlphabets(node.nextSibling.textContent))
}

export function productItemsParser() {
    return JSON.parse(sessionStorage.getItem('productItems'));
}

export function itemsData() {
    let nodes = document.querySelectorAll('[data-testid="nonClickableProductDetails"]');
    let productItems = Array.prototype.map.call(nodes, (item, index) => {
        let qty = parseFloat(document.querySelectorAll('[data-testid="nonClickableProductDetails"]')[index].parentElement.parentElement.childNodes[1].childNodes[0].textContent.split('Qty ').slice(-1));
        let unitPrice = parseFloat(replaceSpecialCharactersAndAlphabets(document.querySelectorAll('[data-testid="nonClickableProductDetails"]')[index].parentElement.parentElement.childNodes[1].childNodes[1].querySelector('div > span').textContent));
        return {
            display_name: document.querySelectorAll('[data-testid="nonClickableProductDetails"] span')[index].textContent,
            sku: document.querySelectorAll('[data-testid="nonClickableProductDetails"] span')[index].textContent,
            quantity: isNaN(qty) ? 0 : qty,
            unit_price: isNaN(unitPrice / qty) ? 0 : (unitPrice / qty)
        }
    })

    const warrantyItemsPrice = Array.prototype.reduce.call(nodes, (a, c) => {
        let warrantyPrice = parseFloat((c.parentElement.parentElement.parentElement.querySelectorAll('i.ld-WalmartShield')[0]?.parentElement.lastChild?.textContent)?.replace(/[^\d\.]/g, ''))
        let installationPrice = parseFloat((c.parentElement.parentElement.parentElement.querySelectorAll('i.ld-Installation')[0]?.parentElement.lastChild?.textContent)?.replace(/[^\d\.]/g, ''))

        let qty = parseFloat(c.parentElement.parentElement.childNodes[1].childNodes[0].textContent.split('Qty ').slice(-1));

        let w_price = isNaN(warrantyPrice * qty) ? 0 : warrantyPrice * qty
        let i_price = isNaN(installationPrice * qty) ? 0 : installationPrice * qty

        return a + w_price + i_price
    }, 0)

    productItems.push({
        display_name: 'Warranty',
        sku: 'Warranty',
        quantity: 1,
        unit_price: warrantyItemsPrice
    })

    //return productItems;

    sessionStorage.setItem('productItems', JSON.stringify(productItems))
}

export function shippingParser(node) {
    const shippingNode = Array.prototype.filter.call(node, (item) => item.textContent.includes('Shipping'));
    const shipAmt = parseFloat(replaceSpecialCharactersAndAlphabets(shippingNode[0]?.lastChild?.lastChild?.textContent));
    const deliveryFee = parseFloat(replaceSpecialCharactersAndAlphabets(document.querySelector('[data-testid="fee"]')?.nextElementSibling?.textContent));
    let amt = isNaN(shipAmt) ? 0 : shipAmt
    let deliveryamt = isNaN(deliveryFee) ? 0 : deliveryFee
    return amt + deliveryamt;
}

const parsers = {
    email: constructParser('email', `[id="__NEXT_DATA__"]`, false, emailParser),
    phone: constructParser('phone', '#phone-number-field', false, phoneParser),
    discounts: constructParser('discounts').val(
        [
            {
                discount_name: "Total Savings",
                discount_amount: 0
            }
        ]
    ),
    sales_tax: constructParser('sales_tax', '[for="taxtotal-label"]', false, amountParser),
    shipping_amount: constructParser('shipping_amount', '#totalSummary > div', false, shippingParser),
    cart_total: constructParser('cart_total', '[for="grandTotal-label"]', false, amountParser),
    items: constructParser('items', 'body', true, productItemsParser),
    first_name: constructParser('first_name', `[data-testid="shipping-display-address"] div`, false, firstNameParser),
    last_name: constructParser('last_name', `[data-testid="shipping-display-address"] div`, false, lastNameParser),
    address: constructParser('address', '[data-testid="shipping-display-address"] div', false, addressParser),
    city: constructParser('city', '[data-testid="shipping-display-address"] div', false, cityParser),
    state: constructParser('state', '[data-testid="shipping-display-address"] div', false, stateParser),
    zip: constructParser('zip', '[data-testid="shipping-display-address"] div', false, zipParser)
}

const parser = Object.create(DOMParser, {
    parsers: {
        value: parsers
    }
})
const merchant = Object.create(AbstractMerchant);

function initialiseMerchant() {
    const provider = getZibbyConfigFor(process.env.APP_ENV);
    const config = provider(process.env.APP_URL, 'walmart');
    merchant.customerAddress.setBillingSameAsShipping(true);
    merchant.init(config, parser);
    merchant.run();
}

if (!isInsideReactNative()) {
    productItemsParsing()
}
function productItemsParsing() {
    setTimeout(() => {

        let listOfProductDivs = document.querySelectorAll('[data-testid*="fulfillment-items"] button');
        Array.prototype.map.call(listOfProductDivs, (item => {
            if ((item.textContent).toLowerCase() === 'view details')
                item.click()
        }))

        setTimeout(() => {

            itemsData();
            runOnLoad();
        }, 2000)
    }, 2000)

}


let intervalId

delegate(document, 'click', '[data-automation-id="continue-button"]', () => {
    clearInterval(intervalId);
    intervalId = setInterval(() => {
        runOnLoad();
    }, 2000)
})

function runOnLoad() {
    if (document.querySelector('[data-testid="wallet-add-payment-card-tiles-container"]') && (document.querySelector('#delivery-card-header') || document.querySelector('[data-testid="shipping-display-address"]'))) {
        clearInterval(intervalId);
        initialiseMerchant();
    }
}

let items = [];

if (isInsideReactNative()) {
    document.querySelector('#cover-spin').style.display = 'block'
    setTimeout(() => {
        const nodes = document.querySelectorAll('[data-testid*="group-module"]')
        parseMobileProductItems(nodes, 0)
    }, 1000)

}

export function parseMobileProductItems(nodes, index) {
    let len = nodes[index].querySelectorAll('button').length;
    let buttons = nodes[index].querySelectorAll('button');
    let button = buttons[len - 1];
    //logic to find button which has view details text
    for (let i = len - 1; i >= 0; --i) {
        button = buttons[i];
        if (!button.textContent.includes('View details')) {
            continue;
        }
        break;
    }
    //document.querySelector('[aria-label="Close dialog"]').click()
    button.click()
    setTimeout(() => {
        const itemLoop = document.querySelectorAll('.column3').length;
        for (let i = 0; i < itemLoop; i++) {
            const price = parseFloat(replaceSpecialCharactersAndAlphabets(document.querySelectorAll('.column3')[i].querySelector('span').textContent));
            const qtyNode = document.querySelectorAll('[data-testid="nonClickableProductDetails"]')[i]?.parentElement?.lastChild?.textContent;
            const qty = qtyNode !== '' && `${qtyNode}`.includes('Qty') ? parseFloat(replaceSpecialCharactersAndAlphabets(document.querySelectorAll('[data-testid="nonClickableProductDetails"]')[i]?.parentElement?.lastChild?.textContent)) : parseFloat(replaceSpecialCharactersAndAlphabets(document.querySelectorAll('[data-testid="nonClickableImage"]')[i].parentElement.lastChild.childNodes[1].textContent));
            const dp = document.querySelectorAll('.column3')[i].previousElementSibling ? document.querySelectorAll('.column3')[i].previousElementSibling.firstChild.textContent
                : document.querySelectorAll('.column3')[i].parentElement.previousElementSibling.textContent;
            items.push({
                sku: dp,
                display_name: dp,
                quantity: qty,
                unit_price: price / qty,
            })
        }
        const warrantynodes = document.querySelectorAll(`[data-testid='nonClickableImage']`)
        const warrantyItemsPrice = Array.prototype.reduce.call(warrantynodes, (a, c, index) => {
            let warrantyPrice = parseFloat((c.parentElement.parentElement.parentElement.querySelectorAll('i.ld-WalmartShield')[0]?.parentElement.lastChild?.textContent)?.replace(/[^\d\.]/g, ''))
            let installationPrice = parseFloat((c.parentElement.parentElement.parentElement.querySelectorAll('i.ld-Installation')[0]?.parentElement.lastChild?.textContent)?.replace(/[^\d\.]/g, ''))

            const qtyNode = document.querySelectorAll('[data-testid="nonClickableProductDetails"]')[index]?.parentElement?.lastChild?.textContent;
            const qty = qtyNode !== '' && `${qtyNode}`.includes('Qty') ? parseFloat(replaceSpecialCharactersAndAlphabets(document.querySelectorAll('[data-testid="nonClickableProductDetails"]')[index]?.parentElement?.lastChild?.textContent)) : parseFloat(replaceSpecialCharactersAndAlphabets(document.querySelectorAll('[data-testid="nonClickableImage"]')[index].parentElement.lastChild.childNodes[1].textContent));
            let w_price = isNaN(warrantyPrice * qty) ? 0 : warrantyPrice * qty
            let i_price = isNaN(installationPrice * qty) ? 0 : installationPrice * qty

            return a + w_price + i_price
        }, 0)

        items.push({
            display_name: 'Warranty',
            sku: 'Warranty',
            quantity: 1,
            unit_price: warrantyItemsPrice
        })

        ++index;
        if (document.querySelector('[aria-label="Close dialog"]')) {
            document.querySelector('[aria-label="Close dialog"]').click()
        }
        if (!(index >= nodes.length))
            parseMobileProductItems(nodes, index)
        else {
            document.querySelector('#cover-spin').style.display = 'none'
            sessionStorage.setItem('productItems', JSON.stringify(items))
            runOnLoad()
        }
    }, 2500);
}