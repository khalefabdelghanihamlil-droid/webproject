/**
 * script.js — NexShop E-Commerce
 * Handles: cart (localStorage), badge update, toast, checkout, login error
 */

/* =====================================================
   CART — localStorage key used across all pages
   ===================================================== */
const CART_KEY = 'nexshop_cart';

/**
 * Format a numeric price as Algerian Dinars.
 * @param {number} amount
 * @returns {string}  e.g. "DA 2 000"
 */
function formatDA(amount) {
    return 'DA ' + Math.round(amount).toLocaleString('fr-DZ');
}

/**
 * Get the current cart array from localStorage.
 * @returns {Array} Array of cart item objects
 */
function getCart() {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
}

/**
 * Persist the cart array to localStorage.
 * @param {Array} cart
 */
function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/**
 * Add a product to cart, or increase its quantity if already present.
 * @param {Object} product  { id, name, price, category }
 * @param {number} quantity
 */
function addToCart(product, quantity) {
    const cart = getCart();
    const idx  = cart.findIndex(i => i.id === product.id);

    if (idx > -1) {
        cart[idx].quantity += quantity;   // update existing
    } else {
        cart.push({ ...product, quantity }); // add new
    }

    saveCart(cart);
    updateCartBadge();
    renderCartSummary();
    showToast(`"${product.name}" added to cart!`);
}

/**
 * Remove a product from the cart by its ID.
 * @param {string} productId
 */
function removeFromCart(productId) {
    saveCart(getCart().filter(i => i.id !== productId));
    updateCartBadge();
    renderCartSummary();
}

/**
 * Calculate the combined total price of all cart items.
 * @returns {number}
 */
function calculateTotal() {
    return getCart().reduce((sum, i) => sum + i.price * i.quantity, 0);
}

/**
 * Return the total number of individual items (sum of quantities).
 * @returns {number}
 */
function getCartCount() {
    return getCart().reduce((sum, i) => sum + i.quantity, 0);
}

/** Empty the cart after a successful order. */
function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateCartBadge();
    renderCartSummary();
}


/* =====================================================
   UI — Badge, Aside Summary, Footer Total
   ===================================================== */

/**
 * Update the cart count badge shown in the navigation bar.
 * Hides the badge when the cart is empty.
 */
function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = getCartCount();
    badge.textContent = count;
    badge.style.display = count === 0 ? 'none' : 'flex';
}

/**
 * Render the mini cart list inside the aside panel on category pages.
 */
function renderCartSummary() {
    const container = document.getElementById('cart-aside-content');
    if (!container) return;

    const cart  = getCart();
    const total = calculateTotal();

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="cart-aside-empty">
                <i class="fa-solid fa-cart-shopping"></i>
                <p>Your cart is empty</p>
            </div>`;
        return;
    }

    // Build list of items
    const rows = cart.map(item => `
        <div class="cart-item-row">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-qty">Qty: ${item.quantity}</div>
            </div>
            <div class="cart-item-price">${formatDA(item.price * item.quantity)}</div>
        </div>`).join('');

    container.innerHTML = rows + `
        <div class="cart-aside-total">
            <span class="cart-aside-total-label">Total</span>
            <span class="cart-aside-total-amount">${formatDA(total)}</span>
        </div>`;

    updateFooterTotal();
}

/**
 * Update the checkout footer with the current item count and total.
 */
function updateFooterTotal() {
    const elCount = document.getElementById('footer-item-count');
    const elTotal = document.getElementById('footer-total');
    const count   = getCartCount();
    if (elCount) elCount.textContent = `${count} item${count !== 1 ? 's' : ''} in cart`;
    if (elTotal) elTotal.textContent = formatDA(calculateTotal());
}


/* =====================================================
   TOAST NOTIFICATIONS
   ===================================================== */

/**
 * Show a brief popup notification at the bottom-right.
 * @param {string} message
 * @param {string} type  'success' | 'error'
 */
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
    container.appendChild(toast);

    // Auto-dismiss after 3 s
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


/* =====================================================
   QUANTITY HELPERS
   ===================================================== */

/** Increment the qty input for a given product. */
function incrementQty(productId) {
    const input = document.getElementById(`qty-${productId}`);
    if (input) input.value = Math.min(parseInt(input.value) + 1, 99);
}

/** Decrement the qty input for a given product (min 1). */
function decrementQty(productId) {
    const input = document.getElementById(`qty-${productId}`);
    if (input) input.value = Math.max(parseInt(input.value) - 1, 1);
}

/**
 * Handle "Add to Cart" click — reads data from the product card's data-* attributes.
 * @param {HTMLElement} btn  The clicked button
 */
function handleAddToCart(btn) {
    const card     = btn.closest('.product-card');
    const id       = card.dataset.productId;
    const qtyInput = document.getElementById(`qty-${id}`);
    const quantity = qtyInput ? Math.max(parseInt(qtyInput.value) || 1, 1) : 1;

    const product = {
        id:       id,
        name:     card.dataset.productName,
        price:    parseFloat(card.dataset.productPrice),
        category: card.dataset.productCategory,
        image:    card.dataset.productImage
    };

    addToCart(product, quantity);

    // Visual feedback
    btn.classList.add('added');
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Added!';
    setTimeout(() => {
        btn.classList.remove('added');
        btn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Add to Cart';
    }, 1600);
}


/* =====================================================
   CHECKOUT — sends cart to save_order.php
   ===================================================== */

/**
 * Process checkout:
 *  1. Validate cart is non-empty
 *  2. POST data to save_order.php
 *  3. Show final total in footer; clear cart on success
 */
async function checkout() {
    const cart = getCart();
    if (cart.length === 0) { showToast('Your cart is empty!', 'error'); return; }

    const total = calculateTotal();

    try {
        const res  = await fetch('save_order.php', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ items: cart, total, order_date: new Date().toISOString() })
        });
        const data = await res.json();

        if (data.success) {
            showToast(`Order placed! Total: ${formatDA(total)}`);
            clearCart();
            updateFooterTotal();
        } else {
            showToast('Could not save order. Try again.', 'error');
        }
    } catch (err) {
        // Server unreachable — still display total to user
        console.warn('save_order.php unreachable:', err);
        updateFooterTotal();
        showToast(`Total: ${formatDA(total)} — Server unavailable`);
    }
}


/* =====================================================
   LOGIN PAGE — show error if ?error=1 in URL
   ===================================================== */

function checkLoginError() {
    const params   = new URLSearchParams(window.location.search);
    const errorDiv = document.getElementById('error-message');
    if (params.get('error') === '1' && errorDiv) {
        errorDiv.style.display = 'flex';
    }
}


/* =====================================================
   INIT — runs on every page load
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();    // show cart count in nav
    renderCartSummary();  // populate aside on category pages
    updateFooterTotal();  // show total in footer
    checkLoginError();    // show error on login page if needed
});
