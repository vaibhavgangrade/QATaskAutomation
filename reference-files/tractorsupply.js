import {getZibbyConfigFor} from "../config/configProvider";
import {constructParser} from "../js/utility";
import {AbstractMerchant, DOMParser} from "../js/abstractMerchant";
import {delegate} from "../js/globalHelper";

export function getProductDetailsObject(){
    return JSON.parse(DOMParser.getNodeFromDocument({selector:"#ordersList"}).innerText.replaceAll('\n\t','').replaceAll('\t',''))
}

export function productParser(){
    return getProductDetailsObject()['orderItem'].map(item=>({
        unit_price:parseFloat(item['unitPrice']),
        quantity:+item['quantity'],
        display_name:item['productName'].split(',')[0],
        sku:item['productName']
    }));
}

export function salesTaxParser(){
    const tax = getProductDetailsObject()['totalSalesTax'];
    return isNaN(tax)?0: tax;
}

export function shipAmountParser(){
    let shipAmt =  getProductDetailsObject()['totalShippingCharge'];
     shipAmt = isNaN(shipAmt)? 0: shipAmt
    return shipAmt !== "FREE" ? shipAmt: 0;

}

export function cartTotalParser(){
    return getProductDetailsObject()['grandTotal'];
}

export function billingAddressParser(node){
    return node.innerText.split('\n')[1]
}

export function discountsParser(){
    const node=document.querySelector("#appliedDeliveryDiscountValue");
    const totalDiscount = node ? parseFloat(node.innerText.replace(/[^\d\.]/g, '')) : 0;
    return [
        {
            discount_name: "Total Savings",
            discount_amount: isNaN(totalDiscount) ? 0 : totalDiscount
        }
    ]
}

export function stateParser(node){
    return node.selectedOptions[0].value;
}

export function billingCityParser(node){
    return node.innerText.split('\n').slice(-3)[0].split(",")[0];
}

export function billingStateParser(node){
    return node.innerText.split('\n').slice(-3)[0].split(",")[1].trim().substring(0,2);
}

export function billingZipParser(node){
    const zipcode = node.innerText.split('\n').slice(-3)[0].split(",")[1].trim().substring(3);
    return zipcode.split('-')[0];
}

export function zipParser(node){
    const zipcode = this.cleanup(node);
    return zipcode.split('-')[0];
}


const parsers = {
    email:constructParser('email', '#email1', false),
    phone:constructParser('phone', '#phone1', false),
    discounts:constructParser('discounts', `body`, false, discountsParser ),
    sales_tax:constructParser('sales_tax', `body`, false, salesTaxParser ),
    shipping_amount:constructParser('shipping_amount', `body`, false, shipAmountParser),
    cart_total:constructParser('cart_total', `body`, false,cartTotalParser ),
    items:constructParser('items', 'body', true, productParser),
    first_name:constructParser('first_name', '#firstName', false),
    last_name:constructParser('last_name', '#lastName', false),
    address:constructParser('address', '#address1', false),
    city:constructParser('city', '#city', false),
    state:constructParser('state', '#state', false, stateParser),
    zip:constructParser('zip', '#zipCode', false, zipParser),
    billing_address:constructParser('billing_address', '#selectedBillingAddress', false, billingAddressParser),
    billing_city:constructParser('billing_city', '#selectedBillingAddress', false, billingCityParser),
    billing_state:constructParser('billing_state', '#selectedBillingAddress', false, billingStateParser),
    billing_zip:constructParser('billing_zip', '#selectedBillingAddress', false, billingZipParser),
}

const parser = Object.create(DOMParser , {
    parsers:{
        value:parsers
    }
})
const merchant = Object.create(AbstractMerchant);

function initialiseMerchant(){
    const provider = getZibbyConfigFor(process.env.APP_ENV);
    const config = provider(process.env.APP_URL, 'tractorsupply');
    merchant.init(config,parser);
    merchant.run();
}

export function updateBillingAddress(){
    merchant.updateCache(['billing_address']);
    merchant.setWindowDispatcher();
}

setTimeout(()=>{
    initialiseMerchant()
})

delegate(document, 'click', '#billingAddressAdd button.green', ()=>
    setTimeout(()=>{
        updateBillingAddress()
    },4000));
delegate(document, 'click', '.address-button button.green', updateBillingAddress);