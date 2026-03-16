import { db, collection, getDocs, query, orderBy } from '../services/firebase.js';

// DOM
const grid = document.getElementById('product-grid');
const searchInput = document.getElementById('search-input');
const categoryList = document.getElementById('category-list');
const sortSelect = document.getElementById('sort-select');
const resultsInfo = document.getElementById('results-info');
const loadingSkeleton = document.getElementById('loading-skeleton');
const cartBar = document.getElementById('cart-bar');
const cartCountEl = document.getElementById('cart-count');
const cartTotalEl = document.getElementById('cart-total');
const whatsappBtn = document.getElementById('whatsapp-btn');

// State
let allStickers = [];
let cart = JSON.parse(localStorage.getItem('aura_cart')) || {};

// ─── Load Products from Firebase ───
async function loadProducts() {
    try {
        const q = query(collection(db, "productos"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        allStickers = [];
        snapshot.forEach(docSnap => {
            allStickers.push({ id: docSnap.id, ...docSnap.data() });
        });
    } catch (err) {
        console.error('Error loading products:', err);
        allStickers = [];
    }

    loadingSkeleton.style.display = 'none';
    grid.style.display = '';

    renderCategories();
    applyFilters();
    updateCartBar();
}

// ─── Categories ───
function renderCategories() {
    const tags = [...new Set(allStickers.map(s => s.tag).filter(Boolean))];
    categoryList.innerHTML = '';

    const allChip = createChip('Todos', true);
    categoryList.appendChild(allChip);

    tags.forEach(tag => {
        categoryList.appendChild(createChip(tag, false));
    });
}

function createChip(label, active) {
    const chip = document.createElement('div');
    chip.className = `cat-chip${active ? ' active' : ''}`;
    chip.textContent = label;
    chip.dataset.cat = label;
    chip.onclick = () => {
        document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        applyFilters();
    };
    return chip;
}

// ─── Filter + Sort ───
function applyFilters() {
    const activeTag = document.querySelector('.cat-chip.active')?.dataset.cat || 'Todos';
    const search = searchInput.value.toLowerCase().trim();
    const sort = sortSelect.value;

    let filtered = [...allStickers];

    // Category filter
    if (activeTag !== 'Todos') {
        filtered = filtered.filter(s => s.tag === activeTag);
    }

    // Search filter
    if (search) {
        filtered = filtered.filter(s =>
            s.nombre.toLowerCase().includes(search) ||
            (s.tag && s.tag.toLowerCase().includes(search))
        );
    }

    // Sort
    switch (sort) {
        case 'price-asc':
            filtered.sort((a, b) => (a.precio || 0) - (b.precio || 0));
            break;
        case 'price-desc':
            filtered.sort((a, b) => (b.precio || 0) - (a.precio || 0));
            break;
        case 'name':
            filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));
            break;
        case 'newest':
        default:
            filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

    renderGrid(filtered);
    resultsInfo.innerHTML = `<strong>${filtered.length}</strong> sticker${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`;
}

// ─── Render Grid ───
function renderGrid(products) {
    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="icon">🔍</div>
                <h3>No se encontraron stickers</h3>
                <p>Probá con otra búsqueda o categoría</p>
            </div>
        `;
        return;
    }

    products.forEach((p, i) => {
        const card = document.createElement('div');
        card.className = 'product-card animate-fade-in-up';
        card.style.animationDelay = `${Math.min(i * 0.05, 0.5)}s`;

        const qty = cart[p.id] ? cart[p.id].qty : 0;

        card.innerHTML = `
            <div class="product-img-wrap">
                <span class="badge badge-pink product-tag">${p.tag || 'General'}</span>
                <img src="${p.imagen}" alt="${p.nombre}" loading="lazy">
            </div>
            <div class="product-body">
                <div class="product-name">${p.nombre}</div>
                <div class="product-price">$${p.precio || 0}</div>
                <div class="qty-row">
                    <button class="qty-btn minus-btn" data-id="${p.id}">−</button>
                    <span class="qty-value" data-qty-id="${p.id}">${qty}</span>
                    <button class="qty-btn plus-btn" data-id="${p.id}">+</button>
                    <button class="add-btn" data-id="${p.id}" ${qty > 0 ? 'disabled' : ''}>
                        ${qty > 0 ? '✓ Agregado' : 'Agregar'}
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    attachListeners();
}

// ─── Cart Logic ───
function attachListeners() {
    document.querySelectorAll('.plus-btn').forEach(btn => {
        btn.onclick = () => changeQty(btn.dataset.id, 1);
    });
    document.querySelectorAll('.minus-btn').forEach(btn => {
        btn.onclick = () => changeQty(btn.dataset.id, -1);
    });
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.onclick = () => {
            if (!cart[btn.dataset.id]) changeQty(btn.dataset.id, 1);
        };
    });
}

function changeQty(id, delta) {
    const product = allStickers.find(s => s.id === id);
    if (!product) return;

    if (!cart[id]) cart[id] = { nombre: product.nombre, precio: product.precio, imagen: product.imagen, qty: 0 };
    cart[id].qty += delta;

    if (cart[id].qty <= 0) delete cart[id];

    saveCart();
    updateQtyDisplay(id);
    updateCartBar();
}

function updateQtyDisplay(id) {
    const qtyEl = document.querySelector(`[data-qty-id="${id}"]`);
    const addBtn = document.querySelector(`.add-btn[data-id="${id}"]`);
    if (qtyEl) {
        const qty = cart[id] ? cart[id].qty : 0;
        qtyEl.textContent = qty;
        if (addBtn) {
            addBtn.disabled = qty > 0;
            addBtn.textContent = qty > 0 ? '✓ Agregado' : 'Agregar';
        }
    }
}

function saveCart() {
    localStorage.setItem('aura_cart', JSON.stringify(cart));
}

function updateCartBar() {
    const items = Object.values(cart);
    const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
    const totalPrice = items.reduce((sum, i) => sum + (i.precio * i.qty), 0);

    cartCountEl.textContent = totalQty;
    cartTotalEl.textContent = `$${totalPrice.toLocaleString()}`;

    if (totalQty > 0) {
        cartBar.classList.add('visible');
    } else {
        cartBar.classList.remove('visible');
    }
}

// ─── WhatsApp ───
whatsappBtn.onclick = () => {
    const items = Object.values(cart);
    if (items.length === 0) return;

    let msg = "¡Hola! 🌟 Quisiera pedir estos stickers:\n\n";
    items.forEach(item => {
        msg += `• ${item.nombre} x${item.qty} — $${item.precio * item.qty}\n`;
    });
    const total = items.reduce((sum, i) => sum + (i.precio * i.qty), 0);
    msg += `\n💰 *TOTAL: $${total.toLocaleString()}*`;

    window.open(`https://wa.me/5491168210762?text=${encodeURIComponent(msg)}`);
};

// ─── Event Listeners ───
searchInput.oninput = () => applyFilters();
sortSelect.onchange = () => applyFilters();

// ─── Init ───
loadProducts();
