import { getZibbyConfigFor } from "../config/configProvider";
import { AbstractMerchant, DOMParser } from "../js/abstractMerchant";
import { constructParser, debounce, firstNameExtractor, lastNameExtractor, replaceSpecialCharactersAndAlphabets, roundNumberToDecimalPlaces } from "../js/utility";
import { setUpListenersForLocationChange, delegate, isInsideReactNative } from "../js/globalHelper";

console.log(" Inside amazon.js  v4.30 Alpha");

function detectMob() {
  const toMatch = [
      /Android/i,
      /webOS/i,
      /iPhone/i,
      /iPad/i,
      /iPod/i,
      /BlackBerry/i,
      /Windows Phone/i
  ];

  return toMatch.some((toMatchItem) => {
      return navigator.userAgent.match(toMatchItem);
  });
}

function getGiftWrap(nodes) {
  //nodes is a collection of break-word elements in the payment section
  const giftWrap = Array.prototype.find.call(nodes, item => item.textContent.includes('Gift Wrap'))?.parentElement.nextElementSibling;
  return giftWrap;
}

if (window.ReactNativeWebView) {
  console.log("in RN webview ****")
  setTimeout(() => {
    window.ReactNativeWebView.postMessage(JSON.stringify({ eventId: 14, action: 'set' }));
  }, 3000)
}

function parseBundleItemsFromCart() {
  console.log("proceed to checkout clicked NEW")
  const nodes=document.querySelectorAll('#sc-active-cart [id*="sc-active"]');
  let bundledItemsNodeArray = Array.prototype.filter.call(nodes, item => {
    if (item.getAttribute('data-subtotal')) {
      return (item.getAttribute('data-quantity') != JSON.parse(item.getAttribute('data-subtotal')).numberOfItems && item.querySelector('[type="checkbox"]').checked) 
    }
  });
  
  let bundleItemsHash={};
  bundledItemsNodeArray.map(item=>{
    let bundleName= item.querySelector('span.a-truncate-full')?.textContent||item.querySelector('[type="checkbox"]').getAttribute('aria-label').replaceAll('&amp;trade;','TM');
    bundleItemsHash[bundleName]={
      unit_price:JSON.parse(item.getAttribute('data-subtotal')).subtotal.amount,
      display_name:bundleName
    }
  })
  console.log("bundledItesmHash^^",bundleItemsHash)
  
  localStorage.setItem('bundleItemsHash',JSON.stringify(bundleItemsHash));
}
if (window.location.href.includes('cart')) {
  const submitButton = document.querySelector('[data-feature-id="proceed-to-checkout-action"]')
  submitButton.addEventListener("click",parseBundleItemsFromCart)
  delegate(document, 'click', '[data-feature-id="proceed-to-checkout-action"]', parseBundleItemsFromCart)
}

const isMobile = detectMob() ||  isInsideReactNative();
console.log(' isMobile View Or Inside ReactNative APP ', isMobile)
window.addEventListener("visibilitychange", beforeUnloadListener);
export function beforeUnloadListener() {
  console.log(' inside beforeUnloadListener ',window.location.href.includes("cart"));
  if(isMobile)return;
  if (window.location.href.includes("cart")) {
    localStorage.setItem("productItems", []);
    if(document.querySelector('#nav-flyout-ewc')){
      localStorage.setItem("productItems", getProductItemsfromNavFlyOut());
    }else{
      localStorage.setItem("productItems", getProductItems());
    }
  }
}

export function getProductItemsfromNavFlyOut(){
  console.log('Inside getProductItemsfromNavFlyOut')
  let nodes = document.querySelectorAll(".a-row.ewc-item");
  console.log('####### ',nodes);
  let totalQty = 0;
  const shippingList = Array.prototype.map.call(nodes, (node) => {
  const productName = node.querySelector('.sc-product-image').alt;
  // const priceD = isNaN(node.dataset.price)? 0 : node.dataset.price;
  const priceD = node.dataset.price;
  totalQty +=parseInt(node.dataset.quantity);
    return {
      category_metadata: productName?.toUpperCase()?.includes('Asurion Tech Unlimited Protection'.toUpperCase())?
          {category:'tech_unlimited'}:{},
      display_name: productName,
      sku: node.dataset.itemid,
      quantity: parseInt(node.dataset.quantity),
      unit_price: parseFloat(priceD),
    };
  });
  localStorage.setItem("totalQty",totalQty);
  console.log('getProductItemsfromNavFlyOut: ',shippingList);
  return JSON.stringify(shippingList);
}

export function getProductItems() {
  console.log('Inside getProductItems')
  let nodes = document.querySelectorAll(
    ".a-section.a-spacing-mini.sc-list-body.sc-java-remote-feature>.a-row.sc-list-item"
  );
  let totalQty = 0;
  const shippingList = Array.prototype.map.call(nodes, (node) => {
  const productName = node.childNodes[7].innerText.split("\n\n")[0];
  //const priceD = isNaN(node.dataset.price)? 0 : node.dataset.price;
  const priceD = node.dataset.price;
  totalQty +=parseInt(node.dataset.quantity);
    return {
      category_metadata: productName?.toUpperCase()?.includes('Asurion Tech Unlimited Protection'.toUpperCase())?
          {category:'tech_unlimited'}:{},
      display_name: productName,
      sku: node.dataset.itemid,
      quantity: parseInt(node.dataset.quantity),
      unit_price: parseFloat(priceD),
    };
  });
  localStorage.setItem("totalQty",totalQty);
  console.log(' getProductItems : ',shippingList);
  return JSON.stringify(shippingList);
}

export function generalParser(node, index, splitChar = "") {
  if(!node) return '';
  let val = node.innerText;
  if (splitChar != "none") {
    val = val.split(splitChar)[index];
  }
  return val?.trim() || '';
}

export function cityStateZip(node, index, split_index = "") {
  //console.log(" cityStateZip ", node);
  if(!node) return '';
  let val = node?.innerText?.split(",");
  if (index == 1) {
    let strTxt = val[index].trim();
    return strTxt.split(" ")[split_index]?.split('-')[0];
  }
  return val[index];
}

function getCity(node){
  if(node)
    return cityStateZip(node, 0)
  else{
    let fullAddress=getFullAddress();
    return fullAddress.split(',')[2].trim();
  }
}

function getState(node){
  if(node)
    return cityStateZip(node, 1, 0)
  else{
    let fullAddress=getFullAddress();
    return fullAddress.split(',')[3].trim();
  }
}

function getZip(node){
  if(node)
    return cityStateZip(node, 1, 1)
  else{
    let fullAddress=getFullAddress();
    return fullAddress.split(',')[4].trim().split('-')[0];
  }
}

export function appendNonLeasableItem(node){
  let orderSummary  = node.innerText.split('\n')
  let jsonData  = JSON.parse(localStorage.getItem("productItems"));

  let nodeArrA = getOrderSummary('Regulatory Fees');
  let nodeArrB = getOrderSummary('Gift Wrap');
  const nodeArr = nodeArrA.concat(nodeArrB);
  for(let i=0; i<nodeArr.length; i++){
    let productName = nodeArr[i]?.split("\t$")[0]?.replace(':','') || '';
    // let unit_price = nodeArr[i]?.split("\t$")[1]?.trim() || '0';
    let unit_price = nodeArr[i]?.split("\t$")[1]?.trim();
    unit_price = unit_price.replaceAll(",", "");
    let skuString = productName;
    if(productName!='')jsonData.push({
      category_metadata: productName?.toUpperCase()?.includes('Asurion Tech Unlimited Protection'.toUpperCase())?
          {category:'tech_unlimited'}:{},
      display_name: productName, sku: skuString,
      quantity: 1,unit_price: parseFloat(unit_price), leasableOverride:false})
  }
  console.log('jsonData ', jsonData)
  return jsonData;
}

// function getOrderSummary(param){
//   console.log(' @@@@@@@ getOrderSummary @@@@@@@@@@ ')
//   console.log('param ', param);
//   let v = document.querySelector('#subtotals-marketplace-table').innerText;
//   console.log('v ', v);
//   let orderSummary  = v.split('\n')
//   console.log('orderSummary ', orderSummary);
//   let obj  = orderSummary.filter(e => {
//     if (e.includes(param))return e;
//   });
//   console.log('obj ', obj);
//   return obj;
// }

function getOrderSummary(param){
  console.log(' @@@@@@@ getOrderSummary @@@@@@@@@@ ')
  console.log('param ', param);

  let nodeLen=document.querySelector('#subtotals-marketplace-table').querySelectorAll('tr').length

  let orderSummary = nodeLen>0 ? document.querySelector('#subtotals-marketplace-table').querySelectorAll('tr') : document.querySelector('#subtotals-marketplace-table').querySelectorAll('li');
  let obj  = Array.prototype.filter.call(orderSummary, e => {
    if (e.textContent.includes(param))return e;
  });
  console.log('obj ', obj);
  let arr=[];
  if(obj.length>0){
    arr.push(obj[0].innerText.trim().split('\n').join(''));
  }
  return arr;
}

function orderSummary(node, paramtxt) {
  console.log('paramtxt ', paramtxt);
  let nodeArr = getOrderSummary(paramtxt);
  console.log('nodeArr ', nodeArr);
  if(paramtxt=='Estimated tax' && nodeArr.length==0){
    console.log('Estimated tax if condition');
    //when shipping address is absent this element is shown
    nodeArr=getOrderSummary('Hold for potential taxes');
    console.log('nodeArr if condition', nodeArr);
  }
  let amt = nodeArr[0].split("$")[1].trim();
  console.log('amt ', amt);
  amt = amt.replaceAll(",", "");
  console.log('amt after replaceAll ', amt);
  let finalAmt=isNaN(amt)? 0 : parseFloat(amt);
  console.log('finalAmt ', finalAmt);
  return finalAmt;
}

export function orderCartTotal(node) {
  let nodeArr = node.innerText.split("\n");
  let amt = nodeArr[nodeArr.length-1].split("\t$")[1].trim();
  amt = amt.replaceAll(",", "");
  return isNaN(amt)? 0 : parseFloat(amt);
}

function getDisountAmount(node){
  let v = document.querySelector('#subtotals-marketplace-table').innerText;
  let orderSummary  = v.split('\n')
  let nodeArr  = orderSummary.filter(e => {
    if (e.includes("-$") && !(e.includes('Lightning Deal')))return e;
  });
  let discount_amount  = 0;
  for(let i=0; i<nodeArr.length; i++){
    let amt = nodeArr[i].split("-$")[1].trim();
    amt = amt.replaceAll(",", "");
    discount_amount  += parseFloat(amt);
  }

  const productDiscountNodes1=document.querySelectorAll('.lineitem-discount-link')
  const productDiscountArr1=Array.prototype.reduce.call(productDiscountNodes1,(acc,item)=>{
    if(item.textContent.includes('discount applied'))
      acc+=roundNumberToDecimalPlaces(parseFloat(replaceSpecialCharactersAndAlphabets(item.textContent)))
    return acc;
    },0);

  const productDiscountNodes2=document.querySelectorAll('[class="a-popover-trigger a-declarative"]')
  const productDiscountArr2=Array.prototype.reduce.call(productDiscountNodes2,(acc,item)=>{
    if(item.textContent.includes('discount applied'))
      acc+=roundNumberToDecimalPlaces(parseFloat(replaceSpecialCharactersAndAlphabets(item.textContent)))
    return acc;
    },0);
  
  // discount_amount-=(productDiscountArr1+productDiscountArr2);
  discount_amount-=(productDiscountArr1);
  console.log('discount_amount',discount_amount);
  return [
    {
      discount_name: "Total Savings",
      discount_amount: discount_amount<0?0:discount_amount,
    },
  ];
}


function getShippingAmount(node, paramtxt){
  let nodeArr = getOrderSummary(paramtxt);
  let shipping_amount  = 0;
  for(let i=0; i<nodeArr.length; i++){
    let amt = nodeArr[i].split("$")[1].trim();
    amt = amt.replaceAll(",", "");
    shipping_amount  += parseFloat(amt);
  }

  const assocaitedItemsNode=document.querySelectorAll('.associated-items');

  const shippingExtraCharges = Array.prototype.reduce.call(assocaitedItemsNode,(acc,item)=>{
    let nodeArr=item.textContent.trim().split('\n').filter((i)=>i.trim()!=="");
    return acc+ parseFloat(replaceSpecialCharactersAndAlphabets(nodeArr[1].trim()));
  },0);
  return shipping_amount + shippingExtraCharges;
}

function useThisAddressClick(){
  delegate(document, 'click', '#orderSummaryPrimaryActionBtn', () => {
    console.log('orderSummaryPrimaryActionBtn button click ');
    setTimeout(initMerchant, 2500);
  })
  setTimeout(useThisAddressBtn2Click,1200);
}

function useThisAddressBtn2Click(){
  delegate(document, 'click', '#shipToThisAddressButton>.a-button-inner>input', () => {
    console.log('shipToThisAddressButton button click ');
    setTimeout(initMerchant, 10000);
  })
}

function processParsing(){
  console.log(' Process Parsing ')
  if(document.querySelector('#addressChangeLinkId')){
    document.querySelector('#addressChangeLinkId').click();
    setTimeout(useThisAddressClick,1000);
  }
  if(document.querySelector('#shipToThisAddressButton')){
    setTimeout(useThisAddressBtn2Click,500);
  }
}


/** Mobile version Parsing */

function getName(node, index){
  if(!node)
    return ""
  let nodeArr = node.innerText.split(" ");
  return nodeArr[index] || "";
}

function getFullAddress(){
  return document.querySelector('[data-orderid] a span[data-testid]')?.textContent?.trim()?.split(':')[1]?.trim() || "";
}

function getAddress(node){
  if(node){
    return node.innerText;
  }
  let fullAddress=getFullAddress();
  return fullAddress.split(',')[1].trim();
}

function getBillingAddress(node){
  return node.innerText?.split(',')[1];
}

function getBillingZip(node){
  const length = node.innerText?.split(',')?.length
  return node.innerText?.split(',')?.[length-1]?.trim()?.split(' ')?.[0]?.split('-')?.[0];
}

function getBillingState(node){
  const length = node.innerText?.split(',')?.length
  return node.innerText?.split(',')?.[length-2];
}

function getBillingCity(node){
  const length = node.innerText?.split(',')?.length
  return node.innerText?.split(',')?.[length-3];
}

function getPhoneNumber(node){
  let nodeArr = node?.innerText?.split(':')
  return nodeArr? nodeArr[1]?.trim() : "";
}

export function appendNonLeasableItemMB(node){
  console.log('AppendNonLeasableItem MB Product List')
  let jsonData = [];
  let productNameArr = document.querySelectorAll('.a-box-group.a-spacing-large.shipment .wrap-word-break.a-text-bold');
  let priceArr = document.querySelectorAll('.a-box-group.a-spacing-large.shipment .a-color-price.a-text-bold');
  let qtyArr = document.querySelectorAll('[data-current-quantity]').length ? document.querySelectorAll('[data-current-quantity]') : document.querySelectorAll('.quantity-display');
  let skuArr = document.querySelectorAll('.a-row.a-spacing-small.a-spacing-top-mini.update-quantity-error.hidden');

  let layawayArr = [];
  let shipmentBoxes = document.querySelectorAll('.a-box-group.a-spacing-large.shipment');
  shipmentBoxes.forEach((shipmentBox, index) => {
    let boxInnerElements = shipmentBox.querySelectorAll('.a-box.shipment-item, .a-box.a-last.shipment-item');

    if (boxInnerElements.length > 1) {
      boxInnerElements.forEach(boxInner => {
        let layawayCheckboxContainer = boxInner.querySelector('.a-checkbox.a-checkbox-fancy.a-control-row.a-touch-checkbox');
        if (layawayCheckboxContainer && /Reserve with|Layaway/.test(layawayCheckboxContainer.textContent)) {
          let layawayCheckbox = layawayCheckboxContainer.querySelector('input[type="checkbox"]');
          let isChecked = layawayCheckbox?.checked || undefined;
          layawayArr.push(isChecked);
        } else {
          let isChecked = undefined;
          layawayArr.push(isChecked);
        }
      });
    } else {
      let layawayCheckboxContainer = shipmentBox.querySelector('.a-checkbox.a-checkbox-fancy.a-control-row.a-touch-checkbox');
      if (layawayCheckboxContainer && /Reserve with|Layaway/.test(layawayCheckboxContainer.textContent)) {
        let layawayCheckbox = layawayCheckboxContainer.querySelector('input[type="checkbox"]');
        let isChecked = layawayCheckbox?.checked || undefined;
        layawayArr.push(isChecked);
      } else {
        let isChecked = undefined;
        layawayArr.push(isChecked);
      }
    }
  });
  for(let i=0; i<productNameArr.length; i++){
    let skutxt = skuArr[i].dataset.itemid ? skuArr[i].dataset.itemid : productNameArr[i].innerText
    let qty = 1;
    //fix after or is written because quantiy display is different in case of gift card for apple pencil
    qty = parseFloat(qtyArr[i]?.textContent?.split(':')[1] || priceArr[i]?.nextElementSibling?.nextElementSibling?.nextElementSibling?.textContent.split(':')[1].trim());
    let layawayCheckbox = layawayArr?.[i];
    let isChecked = layawayCheckbox || false;

    let unit_price = parseFloat(getSiblingWithClass(priceArr[i])?.textContent.replace(/\$/g, '').replace(/,/g, ""))
    jsonData.push ( {
        layaway: isChecked,
        display_name:productNameArr[i].innerText,
        sku:skutxt,
        quantity:parseInt(qty),
        category_metadata: productNameArr[i].innerText?.toUpperCase()?.includes('Asurion Tech Unlimited Protection'.toUpperCase())?
            {category:'tech_unlimited'}:{},
        unit_price,
        bundleItemName:isNaN(unit_price)?productNameArr[i].closest('.shipment-item')?.querySelector('div.a-spacing-small > span.a-text-bold')?.nextElementSibling?.textContent:undefined
    });
  }


  // this is to check if unit price sibling has a striked text then use that since we apply discount later
  function getSiblingWithClass(ele){
    if(!ele) return ele;
    const sibling = ele?.previousElementSibling
    if(!sibling) return ele;
    if(sibling.classList && sibling.classList.contains('a-text-strike')){
      return sibling;
    }
    return ele;

  }

  let nodeArrA = getOrderSummary('Regulatory Fees');
  for(let i=0; i<nodeArrA.length; i++){
    let productName = nodeArrA[i].split("\t$")[0].replace(':','');
    let unit_price = nodeArrA[i].split("\t$")[1].trim();
    unit_price = unit_price.replaceAll(",", "");
    let skuString = productName;
    if(productName!='')jsonData.push({
      category_metadata: productName?.toUpperCase()?.includes('Asurion Tech Unlimited Protection'.toUpperCase())?
          {category:'tech_unlimited'}:{},
      display_name: productName, sku: skuString, quantity: 1,unit_price: parseFloat(unit_price), leasableOverride:false
    })
  }
  console.log('jsonData ', jsonData)

  let hasBundleItems=jsonData.filter(item=>isNaN(item.unit_price))

  //if json data has bundled Items
  if(hasBundleItems.length){
    let bundleItemsLocal = JSON.parse(localStorage.getItem('bundleItemsHash'))
    let withBundleData = bundledItemMerge(jsonData, bundleItemsLocal || []);
    if(withBundleData){
      jsonData=withBundleData;
    }

 
  }
  // Gift wraps working for normal items  ,for bundled Items need to check
  // const giftWrap=getOrderSummary('Gift Wrap')

  // if(giftWrap.length>0 && !priceArr[0]?.nextElementSibling?.nextElementSibling?.nextElementSibling?.textContent){
  //   jsonData.push({
  //     display_name:'Gift Wrap',
  //     sku:'Gift Wrap',
  //     quantity:1,
  //     unit_price:parseFloat(replaceSpecialCharactersAndAlphabets(giftWrap[0].split('$')[1])),
  //     leasableOverride:false
  //   })
  // }

  try {
    // Giftwrap is getting added to the unit_price of non bundled items , logic to add giftwrap price in items if bundled items are gift wrapped
    //(from check out page)(total items amount + giftwrap amount) - total of all the items parsed i.e sum of all JSonData items (unit_price *quantity)
    
    const updatedJsonData = jsonData.map(product => {
      const total_price = product.unit_price * product.quantity;
      return {
        ...product,
        total_price: total_price
      };
    });
    console.log("updatedJsonData", updatedJsonData)
    const totalSum = updatedJsonData.reduce((sum, product) => sum + product.total_price, 0);
    console.log("totalSum", totalSum)
    const UIItemsTotal = +[...document.querySelector('#subtotals-marketplace-table').querySelectorAll('tr')][0].innerText.trim().split("$")[1];
    const giftWrap = getOrderSummary('Gift Wrap')
    const giftWrapPrice = parseFloat(replaceSpecialCharactersAndAlphabets(giftWrap[0].split('$')[1]));
    const totalSumDifference = (UIItemsTotal + giftWrapPrice)- totalSum;
    if (giftWrap.length > 0  && totalSumDifference) {
      jsonData.push({
        display_name: 'Gift Wrap',
        sku: 'Gift Wrap',
        quantity: 1,
        unit_price: Number(totalSumDifference.toFixed(2)),
        leasableOverride: false
      })
    }
  } catch (e) {
    console.log("UPDATEJSONDATAERROR^^",e)
  }
  return jsonData;
}



function bundledItemMerge(productsArray,bundleItemsLocal){
  try{
    let newArr = [], hashObj = {};
    
    //merge 2 products of same bundleItem into one, as in final page bundleItem gets divide into 2 half
    productsArray.map(item=>{
      if(!item.bundleItemName){
        newArr.push({...item})
      }
      else{
        if(!hashObj[item.bundleItemName]){
          newArr.push({...item,display_name:item.bundleItemName})
          hashObj[item.bundleItemName]=1;
        }
      }
    })
    //adding unit_price from localStorage
    return newArr.map(item=>{

      const bundledLocalKeysArray = Object.keys(bundleItemsLocal);
      let matchedKey = bundledLocalKeysArray.find(bundledKey => bundledKey.startsWith(item.display_name.split("|")[0]))
      console.log("matchedKey***",matchedKey)
      if(bundleItemsLocal[item.display_name]|| bundleItemsLocal[matchedKey] ){
          return {...item,unit_price:bundleItemsLocal[item.display_name]?bundleItemsLocal[item.display_name].unit_price:bundleItemsLocal[matchedKey].unit_price}
      }
      else if(isNaN(item.unit_price)){
        //Logic for direct buy now code for bundle productsof 2
        let bundleItemQty=parseFloat(replaceSpecialCharactersAndAlphabets(document.querySelector('#order-summary-box tr span').textContent));
        if(bundleItemQty===2){
          let price=parseFloat(replaceSpecialCharactersAndAlphabets(document.querySelector('#order-summary-box tr .a-text-right').textContent.trim()));
          return {...item,unit_price:price}
        }
       
      }
      else{
          return {...item};
      }
    })
    }
  catch (e) {
    console.log("BundledITEMSERROR**",e)
      return false;
    }
}


const parsers = {
  email: constructParser("email").val(""),
  phone:constructParser('phone').val(''),
  first_name: constructParser(
    "first_name",
    ".displayAddressDiv>.displayAddressUL>.displayAddressFullName",
    false,
    (node) => generalParser(node, 0, " ")
  ),
  last_name: constructParser(
    "last_name",
    ".displayAddressDiv>.displayAddressUL>.displayAddressFullName",
    false,
    (node) => generalParser(node, 1, " ")
  ),
  address: constructParser(
    "address",
    ".displayAddressDiv>.displayAddressUL>.displayAddressAddressLine1",
    false,
    (node) => generalParser(node, 0, "none")
  ),
  city: constructParser(
    "city",
    ".displayAddressDiv>.displayAddressUL>.displayAddressCityStateOrRegionPostalCode",
    false,
    (node) => cityStateZip(node, 0, "")
  ),
  state: constructParser(
    "state",
    ".displayAddressDiv>.displayAddressUL>.displayAddressCityStateOrRegionPostalCode",
    false,
    (node) => cityStateZip(node, 1, 0)
  ),
  zip: constructParser(
    "zip",
    ".displayAddressDiv>.displayAddressUL>.displayAddressCityStateOrRegionPostalCode",
    false,
    (node) => cityStateZip(node, 1, 1)
  ),
  items: constructParser(
    "items",
    "#subtotals-marketplace-table",
    false,
    (node) => appendNonLeasableItem(node)
  ),
  discounts: constructParser("discounts","#subtotals-marketplace-table",
      false, getDisountAmount),
  sales_tax: constructParser(
    "sales_tax",
    "#subtotals-marketplace-table",
    false,
    (node) => orderSummary(node, 'Estimated tax')
  ),
  shipping_amount: constructParser(
    "shipping_amount",
    "#subtotals-marketplace-table",
    false,
    (node) => getShippingAmount(node, 'Shipping & handling')
  ),
  cart_total: constructParser(
    "cart_total",
    "#subtotals-marketplace-table",
    false,
    (node) => orderSummary(node,'Order total')
  ),
};

const parsersMB = {
  email: constructParser("email").val(""),
  phone:constructParser("phone",".displayAddressUL>.displayAddressPhoneNumber",false,(node) => getPhoneNumber(node)),
  first_name: constructParser("first_name",".displayAddressUL>.displayAddressFullName",false,(node) => getName(node, 0)),
  last_name: constructParser("last_name",".displayAddressUL>.displayAddressFullName",false,(node) => getName(node, 1)),
  address: constructParser("address",".displayAddressDiv>.displayAddressUL>.displayAddressAddressLine1",false,(node) => getAddress(node)),
  city: constructParser("city",".displayAddressDiv>.displayAddressUL>.displayAddressCityStateOrRegionPostalCode",false,(node) => getCity(node)),
  state: constructParser("state",".displayAddressDiv>.displayAddressUL>.displayAddressCityStateOrRegionPostalCode",false,(node) => getState(node)),
  zip: constructParser("zip",".displayAddressDiv>.displayAddressUL>.displayAddressCityStateOrRegionPostalCode",false,(node) => getZip(node)),
  items: constructParser("items","#subtotals-marketplace-table",false,(node) => appendNonLeasableItemMB(node)),
  discounts: constructParser("discounts","#subtotals-marketplace-table",false, getDisountAmount),
  sales_tax: constructParser("sales_tax","#subtotals-marketplace-table",false,(node) => orderSummary(node, 'Estimated tax')),
  shipping_amount: constructParser("shipping_amount","#subtotals-marketplace-table",false,(node) => getShippingAmount(node, 'Shipping & handling')),
  cart_total: constructParser("cart_total","#subtotals-marketplace-table",false,(node) => orderSummary(node,'Order total')),
};


function firstNameMobile2Parser(node){
  const firstName=node.querySelector('.a-section').querySelector('#deliver-to-customer-text').textContent.trim().split('Delivering to ')[1];
  return firstNameExtractor(firstName);
}

function lastNameMobile2Parser(node){
  const lastName=node.querySelector('.b-section').querySelector('#deliver-to-customer-bbbb').textContent.trim().split('Delivering to ')[1];
  return lastNameExtractor(lastName);
}

function addressMobile2Parser(node){
  const address=node.querySelector('.a-section').querySelector('#deliver-to-address-text').textContent.trim();
  return address.split(',')[0];
}

function zipMobile2Parser(node){
  const address=node.querySelector('.a-section').querySelector('#deliver-to-address-text').textContent.trim();
  return address.split(',').slice(-2)[0].trim().split('-')[0].trim();
}

function cityMobile2Parser(node){
  const address=node.querySelector('.a-section').querySelector('#deliver-to-address-text').textContent.trim();
  return address.split(',').slice(-4)[0].trim();
}

function stateMobile2Parser(node){
  const address=node.querySelector('.a-section').querySelector('#deliver-to-address-text').textContent.trim();
  return address.split(',').slice(-3)[0].trim();
}

function itemMobile2Parser(){
  const nodes=document.querySelectorAll('[data-csa-c-slot-id="checkout-item-block-itemBlock"]');
  let products= Array.prototype.map.call(nodes,(item,index)=>{
    return{
      display_name:item.querySelector('.lineitem-title-text').textContent.trim(),
      sku:item.querySelector('.lineitem-title-text').textContent.trim(),
      quantity:parseFloat(item.querySelector('.quantity-display')?.textContent.trim() || item.querySelector('[id*="lineItemQuantity_"]')?.textContent),
      unit_price:parseFloat(replaceSpecialCharactersAndAlphabets(item.querySelector('.lineitem-strikethrough-basis-price-text')? item.querySelector('.lineitem-strikethrough-basis-price-text').textContent.trim() : item.querySelector('.lineitem-price-text').textContent.trim()))
    }
  })

  let feeArr = getOrderSummary('Regulatory Fees');
  if(feeArr.length){
    let productName = feeArr[0].split("\t$")[0].replace(':','');
    let unit_price = feeArr[0].split("\t$")[1].trim();
    products.push({
      display_name:productName,
      sku:productName,
      quantity:1,
      unit_price:parseFloat(unit_price)
    })
  }

  const giftWrap=getOrderSummary('Gift Wrap')

  if(giftWrap.length>0){
    products.push({
      display_name:'Gift Wrap',
      sku:'Gift Wrap',
      quantity:1,
      unit_price:parseFloat(replaceSpecialCharactersAndAlphabets(giftWrap[0].split('$')[1])),
      leasableOverride:false
    })
  }

  return products;
}

const parsersMB2={
  email: constructParser("email").val(""),
  phone:constructParser("phone",".displayAddressUL>.displayAddressPhoneNumber",false,(node) => getPhoneNumber(node)),
  first_name: constructParser("first_name","#checkout-delivery-address-block",false,firstNameMobile2Parser),
  last_name: constructParser("last_name","#checkout-delivery-address-block",false,lastNameMobile2Parser),
  address: constructParser("address","#checkout-delivery-address-block",false,addressMobile2Parser),
  city: constructParser("city","#checkout-delivery-address-block",false,cityMobile2Parser),
  state: constructParser("state","#checkout-delivery-address-block",false,stateMobile2Parser),
  zip: constructParser("zip","#checkout-delivery-address-block",false,zipMobile2Parser),
  items: constructParser("items","#row-item-block-panel",true,itemMobile2Parser),
  discounts: constructParser("discounts","#subtotals-marketplace-table",false, getDisountAmount),
  sales_tax: constructParser("sales_tax","#subtotals-marketplace-table",false,(node) => orderSummary(node, 'Estimated tax')),
  shipping_amount: constructParser("shipping_amount","#subtotals-marketplace-table",false,(node) => getShippingAmount(node, 'Shipping & handling')),
  cart_total: constructParser("cart_total","#subtotals-marketplace-table",false,(node) => orderSummary(node,'Order total')),
}

const merchantObj = Object.create(AbstractMerchant);


const initMerchant = debounce(()=>{
    init_merchant();
  },4500)


function isShipToStore(selector = '#purchase-shipping-address'){
  return document.querySelector(selector)?.innerText?.toLowerCase().includes('amazon hub locker')
}

function isShipSingleToStore(selector = '#purchase-shipping-address'){
  return document.querySelector(selector)?.innerText?.toLowerCase().includes('amazon locker') || document.querySelector(selector)?.innerText?.toLowerCase().includes('amazon counter')
}

function compareAddress(shippingStr,billingStr){
  let shippingObj={
    address:document.querySelector(shippingStr).querySelector('.displayAddressAddressLine1').textContent,
    statezip:document.querySelector(shippingStr).querySelector('.displayAddressCityStateOrRegionPostalCode').textContent,
  }

  let billingObj={
    address:document.querySelector(billingStr).querySelector('.displayAddressAddressLine1').textContent,
    statezip:document.querySelector(billingStr).querySelector('.displayAddressCityStateOrRegionPostalCode').textContent,
  }
  return Object.keys(shippingObj).every((k)=>shippingObj[k]===billingObj[k])
}

function init_merchant() {
  console.log(" inside init merchants ");
  const provider = getZibbyConfigFor(process.env.APP_ENV);
  const config = provider(process.env.APP_URL, "amazon");
  const selected_mobile_parser=document.querySelector("#checkout-delivery-address-block")?parsersMB2:parsersMB;
  console.log(document.querySelector("#checkout-delivery-address-block")?"ParsereMB2":"parsersMB")
  let relevantParser = (isMobile)?selected_mobile_parser:parsers
  let isShippingBillingDifferent=false;

  if(isMobile) {
    if(document.querySelector('#billing-address')){
      const shipToStore = isShipToStore();
      console.log('shipToStore:', shipToStore);
      if(shipToStore){
        // if shiptostore then we pick address from billing section
        relevantParser = {
          ...relevantParser,
          first_name: constructParser(
              "first_name",
              "#billing-address .displayAddressUL>.displayAddressFullName",
              false,
              (node) => getName(node, 0)
          ),
          last_name: constructParser(
              "last_name",
              "#billing-address .displayAddressUL>.displayAddressFullName",
              false,
              (node) => getName(node, 1)
          ),
          address: constructParser(
              "address",
              "#billing-address>.displayAddressDiv>.displayAddressUL>.displayAddressAddressLine1",
              false,
              (node) => getAddress(node)
          ),
          city: constructParser(
              "city",
              "#billing-address>.displayAddressDiv>.displayAddressUL>.displayAddressCityStateOrRegionPostalCode",
              false,
              (node) => cityStateZip(node, 0)
          ),
          state: constructParser(
              "state",
              "#billing-address>.displayAddressDiv>.displayAddressUL>.displayAddressCityStateOrRegionPostalCode",
              false,
              (node) => cityStateZip(node, 1, 0)
          ),
          zip: constructParser(
              "zip",
              "#billing-address>.displayAddressDiv>.displayAddressUL>.displayAddressCityStateOrRegionPostalCode",
              false,
              (node) => cityStateZip(node, 1, 1)
          ),
        }
      }
      const isMultipleAddress = document.querySelector(`#change-shipping-address [data-testid]`)?.textContent.includes('You are shipping items to multiple addresses');
      console.log('isMultipleAddress:', isMultipleAddress);
      let billingSameAsShipping = document.querySelector('#billing-address').innerText.toLowerCase().includes('same as shipping address');
      console.log('billingSameAsShipping:', billingSameAsShipping);
      if(!billingSameAsShipping && !isMultipleAddress){ 
        // logic to check billing and shipping manually
        let billing = '';
        let shipping = '';
        document.querySelector('#billing-address .displayAddressUL').childNodes.forEach((c,i)=>{
          billing += i>1 && c.nodeType !== 3 ? c.innerText : ''
        });
        billing=billing.replace('undefined','');
        if(document.querySelector('#change-shipping-address .displayAddressUL'))
        {
          document.querySelector('#change-shipping-address .displayAddressUL').childNodes.forEach((c,i)=>{
            shipping += (!(c?.classList?.contains('displayAddressPhoneNumber')) && i>1 && c.nodeType !== 3) ? c.innerText : ''
          });
          billingSameAsShipping = billing === shipping
        }
        else{
          billingSameAsShipping=document.querySelector('#purchase-shipping-address')?compareAddress('#purchase-shipping-address','#billing-address'):true;
        }
      }
      console.log('isShipSingleToStore:', isShipSingleToStore());

      // Pick up fix for multiple pickup
      if (isMultipleAddress) {
        let all_pickup = false;
        // Check if there are more than 1 shipping address
        if (document.querySelectorAll(`#spc-orders h2[data-testid]`).length > 1) {
          // Check if all are delivery address
          document.querySelectorAll(`#spc-orders [data-orderid] a span[data-testid]`).forEach((node, index) => {
            all_pickup = node.innerText.toLowerCase().includes('amazon locker') ? true : false;
          })
        }
        
        // Billing shipping different
        if (!all_pickup) {
          let billing = document.querySelector('#billing-address .displayAddressUL').innerText.toLowerCase().replaceAll(',', '');
          let shipping = [];
          document.querySelectorAll(`#spc-orders [data-orderid] a span[data-testid]`).forEach((node, index) => {
            shipping[index] = node.innerText.toLowerCase().replaceAll("shipping address: ", "").replaceAll(',', '');
          })
          billingSameAsShipping = shipping.includes(billing);
        }
        else {
          isShippingBillingDifferent = !all_pickup;
        }
        // End billing shipping
      }
      // Only single item pickup
      else if (!isMultipleAddress && isShipSingleToStore()) {
        // if shiptostore then we pick address from billing section
        relevantParser = {
          ...relevantParser,
          first_name: constructParser(
              "first_name",
              "#billing-address .displayAddressUL>.displayAddressFullName",
              false,
              (node) => getName(node, 0)
          ),
          last_name: constructParser(
              "last_name",
              "#billing-address .displayAddressUL>.displayAddressFullName",
              false,
              (node) => getName(node, 1)
          ),
          address: constructParser(
              "address",
              "#billing-address>.displayAddressDiv>.displayAddressUL>.displayAddressAddressLine1",
              false,
              (node) => getAddress(node)
          ),
          city: constructParser(
              "city",
              "#billing-address>.displayAddressDiv>.displayAddressUL>.displayAddressCityStateOrRegionPostalCode",
              false,
              (node) => cityStateZip(node, 0)
          ),
          state: constructParser(
              "state",
              "#billing-address>.displayAddressDiv>.displayAddressUL>.displayAddressCityStateOrRegionPostalCode",
              false,
              (node) => cityStateZip(node, 1, 0)
          ),
          zip: constructParser(
              "zip",
              "#billing-address>.displayAddressDiv>.displayAddressUL>.displayAddressCityStateOrRegionPostalCode",
              false,
              (node) => cityStateZip(node, 1, 1)
          ),
        }
      }
      // Pick up fix end
      else {
        isShippingBillingDifferent = isMultipleAddress || !billingSameAsShipping;
        console.log('isShippingBillingDifferent:', isShippingBillingDifferent);
      }
      // if multiple address is not selected and ship to store then billing will be same as shipping
      if(!isMultipleAddress && shipToStore){
        isShippingBillingDifferent = false;
        console.log('isShippingBillingDifferent:', isShippingBillingDifferent);
      }
    }
    else{
      const shipToStore = isShipToStore();
      isShippingBillingDifferent = shipToStore;
      console.log('isShippingBillingDifferent:', isShippingBillingDifferent);
    }
  }
  else{
    const shipToStore = isShipToStore('[aria-label="Shipping address"]');
    if(shipToStore){
      relevantParser = {
        ...relevantParser,
        first_name: constructParser("first_name",).val(""),
        last_name: constructParser("last_name").val(""),
        address: constructParser(
            "address",
            "#billing-address .single-address",
            false,
            getBillingAddress
        ),
        city: constructParser(
            "city",
            "#billing-address .single-address",
            false,
            getBillingCity
        ),
        state: constructParser(
            "state",
            "#billing-address .single-address",
            false,
            getBillingState
        ),
        zip: constructParser(
            "zip",
            "#billing-address .single-address",
            false,
            getBillingZip
        ),
      }
    }
    const duplicateAddress = document.querySelector('.duplicate-address');
    const isMultipleAddress = document.querySelector(`[aria-label="Shipping address"]`)?.textContent.includes('You are shipping items to multiple addresses');
    if(isMultipleAddress){
      relevantParser = {
        ...relevantParser,
        address: constructParser(
          "address",
          "#billing-address .single-address",
          false,
          getBillingAddress
      ),
      city: constructParser(
          "city",
          "#billing-address .single-address",
          false,
          getBillingCity
      ),
      state: constructParser(
          "state",
          "#billing-address .single-address",
          false,
          getBillingState
      ),
      zip: constructParser(
          "zip",
          "#billing-address .single-address",
          false,
          getBillingZip
      ),
      }
    }
      isShippingBillingDifferent = ( isMultipleAddress ||
          !duplicateAddress ||
          (duplicateAddress && duplicateAddress.style.display === 'none'));
      if(!isMultipleAddress && shipToStore){
        isShippingBillingDifferent = !document.querySelector('#billing-address');
      }
      if(!shipToStore && !document.querySelector('#billing-address')){
        isShippingBillingDifferent = false;
      }
      if(shipToStore && !document.querySelector('#billing-address')){
        isShippingBillingDifferent = true;
      }
  }

  const merchantParser = Object.create(DOMParser, {
    parsers: {
      value: relevantParser,
    },
  });
  merchantObj.init(config, merchantParser);
  merchantObj.customerAddress.setBillingSameAsShipping(!isShippingBillingDifferent);
  merchantObj.run();
}

function redirectCheckout(){
  console.log(' Redirect to checkout ');
  let payOption = document.querySelectorAll('.pmts-modern-selectable-row')
  let len = payOption.length
  if(document.querySelectorAll('.pmts-modern-selectable-row')[len-2].dataset.disabled == 'true'){
    console.log(' Affirm is disabled ');
    return;
  }
  document.querySelectorAll('.pmts-modern-selectable-row')[len-2].click();
}

let pageLoadValue = 0;
function pageLoad() {
  console.log(' PageLoad >>>>>>>>>>>> ',window.location.href);
  if(pageLoadValue == 1){
    console.log(" PageLoad Value is 1 ");
    const selector = !isInsideReactNative() ? '[aria-label="Shipping address"]' : '#change-shipping-address [data-testid]';
    const isMultipleAddress = document.querySelector(selector)?.textContent?.includes('You are shipping items to multiple addresses');
    if(!isMultipleAddress) return;
  }
  console.log(' document refere  >>>>>>>>>>>> ',document.referrer);
  if (window.location.href.includes("buy/payselect") ||
      window.location.href.includes("buy/addressselect")){
    if(!document.referrer.includes("cart")){localStorage.setItem("productItems", []);}
    pageLoadValue = 1;
    setTimeout(processParsing, 2000);
  } else {
    if (!window.location.href.includes("cart")) {
      setTimeout(init_merchant, 2500);
    }
  }
}

let pageLoadValueMb = 0;
function pageLoadMB() {
   //gp/buy/payselect
  // gp/buy/spc
  if(pageLoadValueMb == 1){console.log(" pageLoadValueMb Value is 1 "); return;}
  if(window.location.href.includes("buy/payselect")){
    pageLoadValueMb = 1;
    setTimeout(redirectCheckout,500);
  }else if(window.location.href.includes("gp/buy/spc")) {
      setTimeout(initMerchant, 2000);
  }
}


window.onload = function () {
  console.log(" @@@@@@@@@ window.onload amazon on load ##### ", window.location.href);
  if (window.location.href.includes("buy")){
    if(isMobile){
      setTimeout(pageLoadMB, 1500);
    }else{
      setTimeout(pageLoad, 2000);
    }
  }
};

export function checkURL() {
  console.log(" @@@@@@@@@ checkURL ##### ", window.location.href);
  if (window.location.href.includes("buy") || window.location.href.includes('checkout')){
    if(isMobile){
      //setTimeout(pageLoadMB, 1500);
      if(window.location.href.includes("gp/buy/spc") || window.location.href.includes('checkout')) {
        setTimeout(initMerchant, 2000);
      }
    }else{
      setTimeout(pageLoad, 2000);
    }
  }
}

window.addEventListener('locationchange', function () {
  checkURL()
})

setUpListenersForLocationChange();

checkURL()

const targetNode = isMobile? document.getElementById("spinner-anchor"): document.getElementById("subtotalsContainer");
const config = { attributes: true,chidList:true, subtree:true };

const callback = (mutationList) => {
  if(!isMobile &&  (window.location.href.includes("buy/payselect")
      || window.location.href.includes("buy/addressselect") ||
          window.location.href.includes("buy/shipoptionselect")
  )){
    return;
  }
  for (const mutation of mutationList) {
    if (mutation.type === "attributes") {
      if(mutation.attributeName === "data-cel-widget"  ||  (isMobile&& mutation.attributeName==="style")){
          // localStorage.setItem("productItems",JSON.stringify(getProductItemsFromPaymentPage()));
          setTimeout(()=>{
            initMerchant()
          },isMobile?1000:3000);
          break;
      }
    }
  }
};

// Create an observer instance linked to the callback function
const observer = new MutationObserver(debounce(callback,isMobile?1000:3000));


delegate(document, 'click', '[data-feature-id="proceed-to-checkout-action"]', parseBundleItemsFromCart)
// Start observing the target node for configured mutations
function setMutationObserver(){
const interval = setInterval(()=>{
  if(targetNode) {
    clearInterval(interval);
    observer.observe(targetNode, config);
  }
},1000)
}
setMutationObserver();

