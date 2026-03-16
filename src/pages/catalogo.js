import { supabase } from '../services/supabase.js';

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

// ─── Load Products from Supabase ───
async function loadProducts() {
    try {
        const { data, error } = await supabase
            .from('productos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allStickers = data || [];
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
    categoryList.appendChild(createChip('Todos', true));
    tags.forEach(tag => categoryList.appendChild(createChip(tag, false)));
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
    if (activeTag !== 'Todos') filtered = filtered.filter(s => s.tag === activeTag);
    if (search) {
        filtered = filtered.filter(s =>
            s.nombre.toLowerCase().includes(search) ||
            (s.tag && s.tag.toLowerCase().includes(search))
        );
    }

    switch (sort) {
        case 'price-asc': filtered.sort((a,b) => a.precio - b.precio); break;
        case 'price-desc': filtered.sort((a,b) => b.precio - a.precio); break;
        case 'name': filtered.sort((a,b) => a.nombre.localeCompare(b.nombre)); break;
    }

    renderGrid(filtered);
    resultsInfo.innerHTML = `<strong>${filtered.length}</strong> stickers encontrados`;
}

// ─── Render Grid ───
function renderGrid(products) {
    grid.innerHTML = products.length ? '' : `
        <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <div class="icon" style="font-size: 3rem;">🔍</div>
            <h3>No se encontraron stickers</h3>
        </div>
    `;

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
                <div class="product-price">$${p.precio}</div>
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
    document.querySelectorAll('.plus-btn').forEach(btn => btn.onclick = () => changeQty(btn.dataset.id, 1));
    document.querySelectorAll('.minus-btn').forEach(btn => btn.onclick = () => changeQty(btn.dataset.id, -1));
    document.querySelectorAll('.add-btn').forEach(btn => btn.onclick = () => changeQty(btn.dataset.id, 1));
}

function changeQty(id, delta) {
    const product = allStickers.find(s => s.id == id);
    if (!product) return;
    if (!cart[id]) cart[id] = { nombre: product.nombre, precio: product.precio, qty: 0 };
    cart[id].qty += delta;
    if (cart[id].qty <= 0) delete cart[id];
    localStorage.setItem('aura_cart', JSON.stringify(cart));
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

function updateCartBar() {
    const items = Object.values(cart);
    const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
    const totalPrice = items.reduce((sum, i) => sum + (i.precio * i.qty), 0);
    cartCountEl.textContent = totalQty;
    cartTotalEl.textContent = `$${totalPrice.toLocaleString()}`;
    cartBar.classList.toggle('visible', totalQty > 0);
}

whatsappBtn.onclick = () => {
    const items = Object.values(cart);
    if (!items.length) return;
    let msg = "¡Hola! Quisiera pedir estos stickers:\n\n";
    items.forEach(i => msg += `• ${i.nombre} x${i.qty} — $${i.precio * i.qty}\n`);
    msg += `\n💰 *TOTAL: $${items.reduce((sum, i) => sum + (i.precio * i.qty), 0).toLocaleString()}*`;
    window.open(`https://wa.me/5491168210762?text=${encodeURIComponent(msg)}`);
};

searchInput.oninput = () => applyFilters();
sortSelect.onchange = () => applyFilters();
loadProducts();
