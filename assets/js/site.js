(() => {
  "use strict";

  const config = window.C3_CONFIG || {};
  const amount = (value) => "₹" + new Intl.NumberFormat("en-IN").format(value || 0);

  function cleanDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function phoneDisplay(value) {
    const digits = cleanDigits(value);
    if (digits.length === 12 && digits.slice(0, 2) === "91") {
      return "+91 " + digits.slice(2, 7) + " " + digits.slice(7);
    }
    return digits ? "+" + digits : "";
  }

  function initSharedPage() {
    const year = document.getElementById("current-year");
    if (year) year.textContent = String(new Date().getFullYear());

    const address = document.getElementById("contact-address");
    const footerAddress = document.getElementById("footer-address");
    if (address) address.textContent = config.address || "";
    if (footerAddress) footerAddress.textContent = config.address || "";

    const mapsUrl = config.mapUrl || "";
    ["contact-map", "ambience-map", "footer-map"].forEach((id) => {
      const link = document.getElementById(id);
      if (link) {
        link.href = mapsUrl || "#";
        link.hidden = !mapsUrl;
      }
    });

    const whatsAppNumber = cleanDigits(config.whatsappNumber);
    const helloText = "Hello C3 Restro, I would like to know more about the menu.";
    const whatsAppUrl = /^\d{10,15}$/.test(whatsAppNumber)
      ? "https://wa.me/" + whatsAppNumber + "?text=" + encodeURIComponent(helloText)
      : "";
    ["hero-whatsapp", "contact-whatsapp"].forEach((id) => {
      const link = document.getElementById(id);
      if (link) {
        link.href = whatsAppUrl || "#";
        link.hidden = !whatsAppUrl;
      }
    });

    const whatsAppLabel = document.getElementById("contact-whatsapp-number");
    if (whatsAppLabel) whatsAppLabel.textContent = phoneDisplay(config.whatsappNumber) || "Chat with our team";

    ["hero-zomato", "contact-zomato", "contact-instagram", "footer-instagram"].forEach((id) => {
      const link = document.getElementById(id);
      if (!link) return;
      const value = id.includes("zomato") ? config.zomatoUrl : config.instagramUrl;
      link.href = value || "#";
      link.hidden = !value;
    });

    const callNumber = String(config.callNumber || "").trim();
    const callDigits = cleanDigits(callNumber);
    const callLinkValue = /^\+?\d{10,15}$/.test(callNumber) && callDigits.length >= 10 && callDigits.length <= 15
      ? "tel:+" + callDigits
      : "";
    const callCard = document.getElementById("contact-call-card");
    const callLink = document.getElementById("contact-call");
    const footerCall = document.getElementById("footer-call");
    const callLabel = document.getElementById("contact-call-number");
    [callCard, callLink, footerCall].forEach((node) => {
      if (node) node.hidden = !callLinkValue;
    });
    if (callLink) callLink.href = callLinkValue || "#";
    if (footerCall) footerCall.href = callLinkValue || "#";
    if (callLabel) callLabel.textContent = phoneDisplay(callNumber);

    const toggle = document.getElementById("menu-toggle");
    const nav = document.getElementById("main-nav");
    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
      });
      nav.addEventListener("click", (event) => {
        if (event.target.closest("a")) {
          nav.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.setAttribute("aria-label", "Open navigation");
        }
      });
    }

    document.querySelectorAll("img[data-fallback]").forEach((image) => {
      image.addEventListener("error", () => {
        image.classList.add("image-missing");
        image.hidden = true;
        const frame = image.closest(".about-photo-frame");
        if (frame) frame.classList.add("image-missing");
      }, { once: true });
      if (image.complete && image.naturalWidth === 0) image.dispatchEvent(new Event("error"));
    });
    document.querySelectorAll("img[data-brand-logo]").forEach((image) => {
      const showFallback = () => {
        const mark = image.closest(".brand-mark");
        if (mark) mark.classList.add("logo-missing");
      };
      image.addEventListener("error", showFallback, { once: true });
      if (image.complete && image.naturalWidth === 0) showFallback();
    });
  }

  function initMenuPage() {
    const menuRoot = document.getElementById("menu-sections");
    if (!menuRoot || !Array.isArray(window.C3_MENU_DATA)) return;

    const categories = window.C3_MENU_DATA.filter((category) => category.dishes && category.dishes.length);
    const dishById = new Map();
    const priceByKey = new Map();
    categories.forEach((category) => category.dishes.forEach((dish) => {
      dishById.set(String(dish.id), dish);
      dish.prices.forEach((price) => priceByKey.set(String(dish.id) + "-" + String(price.id), { dish, price }));
    }));

    const cartStorageKey = "c3-restro-static-cart-v1";
    let lastFocus = null;
    let savedCoordinates = { latitude: "", longitude: "" };
    let cart = loadCart();

    function cartKey(dishId, priceId) {
      return String(dishId) + "-" + String(priceId);
    }

    function loadCart() {
      try {
        const stored = localStorage.getItem(cartStorageKey);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return [];
        return parsed.map((entry) => {
          const found = priceByKey.get(cartKey(entry.dishId, entry.priceId));
          const quantity = Number(entry.quantity);
          if (!found || found.dish.soldOut || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) return null;
          return {
            key: cartKey(found.dish.id, found.price.id),
            dishId: found.dish.id,
            priceId: found.price.id,
            name: found.dish.name,
            label: found.price.label,
            price: Number(found.price.price),
            quantity
          };
        }).filter(Boolean);
      } catch (_error) {
        return [];
      }
    }

    function saveCart() {
      try {
        localStorage.setItem(cartStorageKey, JSON.stringify(cart));
      } catch (_error) {
        // Cart remains available in memory until this page is closed.
      }
    }

    function quantityFor(key) {
      const item = cart.find((entry) => entry.key === key);
      return item ? item.quantity : 0;
    }

    function totals() {
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const items = cart.reduce((sum, item) => sum + item.quantity, 0);
      const parcel = items ? Math.max(0, Number(config.parcelCharge) || 0) : 0;
      return { subtotal, items, parcel, total: subtotal + parcel };
    }

    function addItem(dish, price) {
      if (dish.soldOut) return;
      const key = cartKey(dish.id, price.id);
      const item = cart.find((entry) => entry.key === key);
      if (item) item.quantity = Math.min(50, item.quantity + 1);
      else cart.push({
        key,
        dishId: dish.id,
        priceId: price.id,
        name: dish.name,
        label: price.label,
        price: Number(price.price),
        quantity: 1
      });
      changed();
    }

    function changeQuantity(key, step) {
      const item = cart.find((entry) => entry.key === key);
      if (!item) return;
      item.quantity += step;
      if (item.quantity < 1) cart = cart.filter((entry) => entry.key !== key);
      if (item.quantity > 50) item.quantity = 50;
      changed();
    }

    function removeItem(key) {
      cart = cart.filter((entry) => entry.key !== key);
      changed();
    }

    function changed() {
      saveCart();
      renderCart();
      renderSelection();
      syncCardControls();
    }

    function createButton(label, className, action, ariaLabel) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = className;
      button.textContent = label;
      if (ariaLabel) button.setAttribute("aria-label", ariaLabel);
      button.addEventListener("click", action);
      return button;
    }

    function buildMenu() {
      const chips = document.getElementById("category-chips");
      categories.forEach((category) => {
        const sectionId = "category-" + category.id;
        const chip = document.createElement("a");
        chip.className = "category-chip";
        chip.href = "#" + sectionId;
        chip.textContent = category.name + " · " + category.dishes.length;
        chip.dataset.categoryId = String(category.id);
        chips.appendChild(chip);

        const section = document.createElement("section");
        section.className = "menu-category";
        section.id = sectionId;
        section.dataset.categoryName = category.name.toLowerCase();

        const heading = document.createElement("div");
        heading.className = "category-heading";
        const titleBlock = document.createElement("div");
        const eyebrow = document.createElement("p");
        eyebrow.textContent = "C3 Restro favourites";
        const title = document.createElement("h2");
        title.textContent = category.name;
        titleBlock.append(eyebrow, title);
        const count = document.createElement("span");
        count.className = "category-count";
        count.textContent = category.dishes.length + (category.dishes.length === 1 ? " dish" : " dishes");
        heading.append(titleBlock, count);

        const grid = document.createElement("div");
        grid.className = "dish-grid";
        category.dishes.forEach((dish) => grid.appendChild(buildDishCard(dish)));
        section.append(heading, grid);
        menuRoot.appendChild(section);
      });

      const allDishes = categories.reduce((sum, category) => sum + category.dishes.length, 0);
      const status = document.getElementById("search-status");
      if (status) status.textContent = allDishes + " dishes";

      if (window.location.hash && /^#category-\d+$/.test(window.location.hash)) {
        requestAnimationFrame(() => {
          const target = document.querySelector(window.location.hash);
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }

    function buildDishCard(dish) {
      const card = document.createElement("article");
      card.className = "dish-card";
      card.dataset.dishId = String(dish.id);
      card.dataset.searchText = (dish.name + " " + (dish.description || "")).toLowerCase();

      const image = document.createElement("img");
      image.className = "dish-photo dish-photo-pending";
      image.alt = dish.name;
      image.loading = "lazy";
      image.addEventListener("load", () => image.classList.remove("dish-photo-pending"), { once: true });
      const imageSlug = dish.name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const imageCandidates = ["jpg", "jpeg", "png", "webp"]
        .map((extension) => "assets/img/" + imageSlug + "." + extension);
      if (dish.image) imageCandidates.push(dish.image);
      let imageIndex = 0;
      image.addEventListener("error", () => {
        imageIndex += 1;
        if (imageIndex < imageCandidates.length) {
          image.src = imageCandidates[imageIndex];
        } else {
          image.remove();
        }
      });
      image.src = imageCandidates[imageIndex];
      card.appendChild(image);

      const copy = document.createElement("div");
      copy.className = "dish-copy";
      const titleRow = document.createElement("div");
      titleRow.className = "dish-title-row";
      const title = document.createElement("h3");
      title.textContent = dish.name;
      titleRow.appendChild(title);
      if (dish.soldOut) {
        const badge = document.createElement("span");
        badge.className = "sold-out-badge";
        badge.textContent = "Sold out";
        titleRow.appendChild(badge);
      }
      copy.appendChild(titleRow);
      if (dish.description) {
        const description = document.createElement("p");
        description.className = "dish-description";
        description.textContent = dish.description;
        copy.appendChild(description);
      }
      card.appendChild(copy);

      const priceList = document.createElement("div");
      priceList.className = "price-list";
      if (!dish.prices.length) {
        const missing = document.createElement("span");
        missing.className = "price-label";
        missing.textContent = "Price not set";
        priceList.appendChild(missing);
      }
      dish.prices.forEach((price) => {
        const key = cartKey(dish.id, price.id);
        const row = document.createElement("div");
        row.className = "price-option";
        const display = document.createElement("span");
        display.className = "price-display";
        const label = document.createElement("span");
        label.className = "price-label";
        label.textContent = price.label;
        const value = document.createElement("strong");
        value.className = "price-value";
        value.textContent = amount(price.price);
        display.append(label, value);

        const control = document.createElement("span");
        control.className = "variant-control";
        const add = createButton(dish.soldOut ? "Sold out" : "+ Add", "variant-add-button", () => addItem(dish, price));
        add.dataset.cartKey = key;
        add.disabled = Boolean(dish.soldOut);
        add.setAttribute("aria-label", dish.soldOut ? "Sold out" : "Add " + dish.name + " " + price.label);
        const stepper = document.createElement("span");
        stepper.className = "variant-stepper";
        stepper.hidden = true;
        stepper.dataset.cartKey = key;
        stepper.append(
          createButton("−", "stepper-button", () => changeQuantity(key, -1), "Remove one " + dish.name + " " + price.label),
          Object.assign(document.createElement("span"), { className: "stepper-quantity", textContent: "0" }),
          createButton("+", "stepper-button", () => addItem(dish, price), "Add one " + dish.name + " " + price.label)
        );
        control.append(add, stepper);
        row.append(display, control);
        priceList.appendChild(row);
      });
      card.appendChild(priceList);
      return card;
    }

    function syncCardControls() {
      document.querySelectorAll(".variant-add-button").forEach((button) => {
        const key = button.dataset.cartKey;
        const stepper = document.querySelector('.variant-stepper[data-cart-key="' + key + '"]');
        const quantity = quantityFor(key);
        button.hidden = quantity > 0;
        if (stepper) {
          stepper.hidden = quantity < 1;
          const number = stepper.querySelector(".stepper-quantity");
          if (number) number.textContent = String(quantity);
        }
      });
    }

    function appendSelectionLine(container, item, detailed) {
      const line = document.createElement("div");
      line.className = "selection-line";
      const description = document.createElement("span");
      description.textContent = item.name + " (" + item.label + ") × " + item.quantity;
      const total = document.createElement("strong");
      total.textContent = amount(item.price * item.quantity);
      line.append(description, total);
      container.appendChild(line);
      if (detailed) line.setAttribute("aria-label", item.name + ", " + item.label + ", quantity " + item.quantity);
    }

    function renderSelection() {
      const box = document.getElementById("menu-selection");
      const items = document.getElementById("selection-items");
      const count = document.getElementById("selection-count");
      if (!box || !items) return;
      items.replaceChildren();
      const current = totals();
      cart.forEach((item) => appendSelectionLine(items, item, false));
      box.hidden = cart.length === 0;
      if (count) count.textContent = current.items + (current.items === 1 ? " item" : " items");
      document.getElementById("selection-subtotal").textContent = amount(current.subtotal);
      document.getElementById("selection-parcel").textContent = amount(current.parcel);
      document.getElementById("selection-total").textContent = amount(current.total);
    }

    function renderCart() {
      const itemBox = document.getElementById("cart-items");
      const empty = document.getElementById("cart-empty");
      const current = totals();
      const bar = document.getElementById("cart-bar-wrap");
      if (bar) bar.hidden = cart.length === 0;
      const barCount = document.getElementById("cart-bar-count");
      const barTotal = document.getElementById("cart-bar-total");
      if (barCount) barCount.textContent = current.items + (current.items === 1 ? " item" : " items");
      if (barTotal) barTotal.textContent = amount(current.total);
      ["cart-subtotal", "selection-subtotal"].forEach((id) => {
        const node = document.getElementById(id);
        if (node) node.textContent = amount(current.subtotal);
      });
      document.getElementById("cart-parcel").textContent = amount(current.parcel);
      document.getElementById("cart-total").textContent = amount(current.total);
      document.getElementById("checkout-total").textContent = amount(current.total);
      const continueButton = document.getElementById("continue-checkout");
      if (continueButton) continueButton.disabled = cart.length === 0;
      if (!itemBox) return;

      itemBox.replaceChildren();
      if (empty) empty.hidden = cart.length > 0;
      cart.forEach((item) => {
        const card = document.createElement("article");
        card.className = "cart-item";
        const copy = document.createElement("div");
        const name = document.createElement("div");
        name.className = "cart-item-name";
        name.textContent = item.name;
        const subline = document.createElement("div");
        subline.className = "cart-item-subline";
        subline.textContent = item.label + " · " + amount(item.price) + " each";
        copy.append(name, subline);
        const lineTotal = document.createElement("strong");
        lineTotal.className = "cart-item-total";
        lineTotal.textContent = amount(item.price * item.quantity);
        const controls = document.createElement("div");
        controls.className = "cart-item-controls";
        controls.append(
          createButton("−", "stepper-button", () => changeQuantity(item.key, -1), "Remove one " + item.name),
          Object.assign(document.createElement("span"), { className: "stepper-quantity", textContent: String(item.quantity) }),
          createButton("+", "stepper-button", () => changeQuantity(item.key, 1), "Add one " + item.name),
          createButton("Remove", "remove-item", () => removeItem(item.key), "Remove " + item.name + " from order")
        );
        card.append(copy, lineTotal, controls);
        itemBox.appendChild(card);
      });
    }

    function openPanel() {
      const panel = document.getElementById("order-panel");
      const backdrop = document.getElementById("cart-backdrop");
      if (!panel || !backdrop) return;
      lastFocus = document.activeElement;
      panel.hidden = false;
      backdrop.hidden = false;
      panel.setAttribute("aria-hidden", "false");
      document.body.classList.add("panel-open");
      document.getElementById("close-cart").focus();
    }

    function closePanel() {
      const panel = document.getElementById("order-panel");
      const backdrop = document.getElementById("cart-backdrop");
      if (!panel || !backdrop) return;
      panel.hidden = true;
      backdrop.hidden = true;
      panel.setAttribute("aria-hidden", "true");
      document.body.classList.remove("panel-open");
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }

    function updateSearch() {
      const input = document.getElementById("menu-search");
      const query = input.value.trim().toLowerCase();
      const clearButton = document.getElementById("clear-search");
      const noResults = document.getElementById("no-menu-results");
      const status = document.getElementById("search-status");
      if (clearButton) clearButton.hidden = !query;
      let visible = 0;
      document.querySelectorAll(".menu-category").forEach((section) => {
        let inSection = 0;
        const categoryText = section.dataset.categoryName || "";
        section.querySelectorAll(".dish-card").forEach((card) => {
          const match = !query || card.dataset.searchText.includes(query) || categoryText.includes(query);
          card.hidden = !match;
          if (match) inSection += 1;
        });
        section.hidden = inSection === 0;
        visible += inSection;
      });
      if (noResults) noResults.hidden = visible > 0;
      if (status) status.textContent = query ? visible + (visible === 1 ? " dish found" : " dishes found") : categories.reduce((sum, category) => sum + category.dishes.length, 0) + " dishes";
    }

    function showError(id, message) {
      const node = document.getElementById(id);
      if (node) node.textContent = message;
    }

    function clearCheckoutErrors() {
      ["name-error", "location-error", "phone-error"].forEach((id) => showError(id, ""));
      const status = document.getElementById("checkout-status");
      if (status) status.textContent = "";
    }

    function buildWhatsAppMessage(name, location, phone) {
      const current = totals();
      const lines = ["New order - " + (config.restaurantName || "C3 Restro"), "Name: " + name, "Location: " + location];
      const latitude = Number(savedCoordinates.latitude);
      const longitude = Number(savedCoordinates.longitude);
      if (Number.isFinite(latitude) && Number.isFinite(longitude) && savedCoordinates.latitude !== "" && savedCoordinates.longitude !== "") {
        lines.push("Map: https://www.google.com/maps?q=" + latitude + "," + longitude);
      }
      if (phone) lines.push("Phone: " + phone);
      cart.forEach((item, index) => {
        lines.push((index + 1) + ". " + item.name + " (" + item.label + ") x " + item.quantity + " = " + amount(item.price * item.quantity));
      });
      lines.push("Subtotal: " + amount(current.subtotal));
      lines.push("Parcel charge: " + amount(current.parcel));
      lines.push("Total: " + amount(current.total));
      return lines.join("\n");
    }

    function submitWhatsAppOrder(event) {
      event.preventDefault();
      clearCheckoutErrors();
      const name = document.getElementById("customer-name").value.trim();
      const location = document.getElementById("customer-location").value.trim();
      const phone = document.getElementById("customer-phone").value.trim();
      let firstInvalid = null;
      if (name.length < 2 || name.length > 60) {
        showError("name-error", "Naam 2 se 60 characters ka hona chahiye.");
        firstInvalid = firstInvalid || document.getElementById("customer-name");
      }
      if (location.length < 5 || location.length > 200) {
        showError("location-error", "Apna address, area ya landmark 5 se 200 characters mein likhein.");
        firstInvalid = firstInvalid || document.getElementById("customer-location");
      }
      if (phone && !/^\d{10,15}$/.test(phone)) {
        showError("phone-error", "Phone mein country code ke saath 10–15 digits likhein.");
        firstInvalid = firstInvalid || document.getElementById("customer-phone");
      }
      if (!cart.length) {
        const status = document.getElementById("checkout-status");
        if (status) status.textContent = "Your order is empty.";
        return;
      }
      const whatsAppNumber = cleanDigits(config.whatsappNumber);
      if (!/^\d{10,15}$/.test(whatsAppNumber)) {
        const status = document.getElementById("checkout-status");
        if (status) status.textContent = "WhatsApp number is not set. Please contact C3 Restro.";
        return;
      }
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      const message = buildWhatsAppMessage(name, location, phone);
      const url = "https://wa.me/" + whatsAppNumber + "?text=" + encodeURIComponent(message);
      const opened = window.open(url, "_blank");
      if (opened) opened.opener = null;
      const status = document.getElementById("checkout-status");
      if (status) status.textContent = "WhatsApp khul raha hai. Order bhejne ke liye Send dabayein.";
    }

    function requestLocation() {
      const status = document.getElementById("location-status");
      if (!navigator.geolocation) {
        status.textContent = "Is browser mein location share available nahi. Address likh kar continue karein.";
        return;
      }
      status.textContent = "Location mil rahi hai...";
      navigator.geolocation.getCurrentPosition((position) => {
        savedCoordinates.latitude = String(position.coords.latitude);
        savedCoordinates.longitude = String(position.coords.longitude);
        document.getElementById("latitude").value = savedCoordinates.latitude;
        document.getElementById("longitude").value = savedCoordinates.longitude;
        status.textContent = "Location saved. WhatsApp order mein Maps link jayega.";
      }, () => {
        savedCoordinates = { latitude: "", longitude: "" };
        document.getElementById("latitude").value = "";
        document.getElementById("longitude").value = "";
        status.textContent = "Location share nahi hui. Address likh kar aaram se continue karein.";
      }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 });
    }

    buildMenu();
    syncCardControls();
    renderCart();
    renderSelection();

    document.getElementById("open-cart").addEventListener("click", openPanel);
    document.querySelectorAll("[data-open-cart]").forEach((button) => button.addEventListener("click", openPanel));
    document.getElementById("close-cart").addEventListener("click", closePanel);
    document.getElementById("cart-backdrop").addEventListener("click", closePanel);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !document.getElementById("order-panel").hidden) closePanel();
    });
    document.getElementById("clear-cart").addEventListener("click", () => {
      cart = [];
      changed();
    });
    document.getElementById("continue-checkout").addEventListener("click", () => {
      document.getElementById("order-review").hidden = true;
      document.getElementById("checkout-section").hidden = false;
      document.getElementById("customer-name").focus();
    });
    document.getElementById("back-to-order").addEventListener("click", () => {
      document.getElementById("checkout-section").hidden = true;
      document.getElementById("order-review").hidden = false;
    });
    document.getElementById("share-location").addEventListener("click", requestLocation);
    document.getElementById("checkout-form").addEventListener("submit", submitWhatsAppOrder);
    document.getElementById("menu-search").addEventListener("input", updateSearch);
    document.getElementById("clear-search").addEventListener("click", () => {
      const input = document.getElementById("menu-search");
      input.value = "";
      updateSearch();
      input.focus();
    });

    const chipNav = document.getElementById("category-chips");
    chipNav.addEventListener("click", (event) => {
      const chip = event.target.closest(".category-chip");
      if (!chip) return;
      chipNav.querySelectorAll(".category-chip").forEach((entry) => entry.classList.toggle("active", entry === chip));
    });
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const activeChip = chipNav.querySelector('[data-category-id="' + entry.target.id.replace("category-", "") + '"]');
          if (activeChip) chipNav.querySelectorAll(".category-chip").forEach((chip) => chip.classList.toggle("active", chip === activeChip));
        });
      }, { rootMargin: "-155px 0px -68% 0px", threshold: 0 });
      document.querySelectorAll(".menu-category").forEach((section) => observer.observe(section));
    }
  }

  initSharedPage();
  initMenuPage();
})();
