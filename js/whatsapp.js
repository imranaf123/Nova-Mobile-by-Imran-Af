/* Nova Mobile — whatsapp.js
   Builds every wa.me link. The number ALWAYS comes from
   settings.contact.whatsappNumber — never hardcoded elsewhere. */
(function () {
  "use strict";

  // encodeURIComponent with newlines/whitespace escaped the way WhatsApp expects.
  function enc(text) {
    return encodeURIComponent(text).replace(/%0A/g, "\n");
  }

  // Build a wa.me link. number from settings (digits only, no "+").
  function buildWhatsAppLink(number, message) {
    var digits = String(number || "").replace(/[^\d]/g, "");
    if (!digits || /PLACEHOLDER/.test(String(number))) {
      console.warn("[Nova] WhatsApp number is still a placeholder in data/settings.json");
    }
    return "https://wa.me/" + digits + "?text=" + encodeURIComponent(message);
  }

  // Get the number once data is available.
  function numberFrom(settings) {
    return (settings && settings.contact && settings.contact.whatsappNumber) || "";
  }

  // 1) Single product order message.
  function singleProductMessage(settings, product, variant, qty) {
    var name = product.name;
    var line = "*New Order Inquiry — " + (settings.siteName || "Nova Mobile") + "*\n";
    line += "--------------------------------\n";
    line += "Product: " + name + "\n";
    if (variant && variant.color) line += "Color: " + variant.color + "\n";
    if (variant && variant.storage) line += "Storage: " + variant.storage + "\n";
    if (variant && variant.price) line += "Price: " + NovaData.formatPrice(variant.price) + "\n";
    line += "Qty: " + (qty || 1) + "\n";
    line += "--------------------------------\n";
    line += "Please confirm availability and total.";
    return line;
  }

  // 2) Sell / trade-in quote request.
  function sellMessage(settings, data) {
    var line = "*Sell / Trade-In Quote Request — " + (settings.siteName || "Nova Mobile") + "*\n";
    line += "--------------------------------\n";
    line += "Name: " + (data.name || "") + "\n";
    line += "Brand: " + (data.brand || "") + "\n";
    line += "Model: " + (data.model || "") + "\n";
    line += "Storage: " + (data.storage || "") + "\n";
    line += "Condition: " + (data.condition || "") + "\n";
    line += "Battery Health: " + (data.battery || "") + "\n";
    line += "PTA Status: " + (data.pta || "") + "\n";
    line += "Color: " + (data.color || "") + "\n";
    line += "--------------------------------\n";
    line += "Please send me a quote.";
    return line;
  }

  // 3) Full order-list checkout (itemized with total).
  function orderListMessage(settings, items, resolver) {
    var line = "*New Order — " + (settings.siteName || "Nova Mobile") + "*\n";
    line += "--------------------------------\n";
    var total = 0;
    items.forEach(function (item, i) {
      var product = resolver(item.slug);
      var variant = null;
      if (product) {
        variant = (product.variants || []).find(function (v) { return v.sku === item.sku; });
      }
      var name = product ? product.name : item.slug;
      var price = variant ? variant.price : (product && product.variants && product.variants[0] ? product.variants[0].price : 0);
      var sub = price * (item.qty || 1);
      total += sub;
      line += (i + 1) + ". " + name;
      if (variant && variant.storage) line += " (" + variant.storage + ")";
      if (variant && variant.color) line += " — " + variant.color;
      line += "\n   Qty: " + (item.qty || 1) + " x " + NovaData.formatPrice(price) + "\n";
    });
    line += "--------------------------------\n";
    line += "Total: " + NovaData.formatPrice(total) + "\n";
    line += "Please confirm availability, total, and delivery.";
    return line;
  }

  window.buildWhatsAppLink = buildWhatsAppLink;
  window.WhatsApp = {
    numberFrom: numberFrom,
    singleProductMessage: singleProductMessage,
    sellMessage: sellMessage,
    orderListMessage: orderListMessage
  };
})();
