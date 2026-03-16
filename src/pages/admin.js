import { supabase } from '../services/supabase.js';

// ─── AMBIENTE & SEGURIDAD ───
if (window.location.protocol === 'file:') {
    console.warn('⚠️ Nota: En modo local (file://) usá servidor_local.py.');
}

// ─── DOM ───
const loginOverlay = document.getElementById('login-overlay');
const loginBtn = document.getElementById('login-btn');
const adminPass = document.getElementById('admin-pass');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

const fileDrop = document.getElementById('file-drop');
const fileInput = document.getElementById('file-input');
const dropPlaceholder = document.getElementById('drop-placeholder');
const nameInput = document.getElementById('sticker-name');
const tagInput = document.getElementById('sticker-tag');
const priceInput = document.getElementById('sticker-price');
const saveBtn = document.getElementById('save-btn');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const stickerList = document.getElementById('sticker-list');
const invCount = document.getElementById('inv-count');
const toastContainer = document.getElementById('toast-container');
const debugLog = document.getElementById('debug-log');

// State
let selectedFile = null;
const ADMIN_PASS = '1234';

// ─── LOGGING ───
function logToUI(msg, type = 'info') {
    console.log(msg);
    if (!debugLog) return;
    const div = document.createElement('div');
    div.style.marginBottom = '4px';
    div.style.color = (type === 'error') ? '#ff5555' : (type === 'warn' ? '#ffff55' : '#00ff00');
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    debugLog.appendChild(div);
    debugLog.parentElement.scrollTop = debugLog.parentElement.scrollHeight;
}

// ─── AUTH ───
function checkAuth() {
    if (sessionStorage.getItem('aura_admin') === 'true') {
        loginOverlay.classList.add('hidden');
    }
}

loginBtn.onclick = () => {
    if (adminPass.value === ADMIN_PASS) {
        sessionStorage.setItem('aura_admin', 'true');
        loginOverlay.classList.add('hidden');
        showToast('¡Bienvenido!');
    } else {
        loginError.textContent = 'Contraseña incorrecta';
        adminPass.value = '';
        adminPass.focus();
    }
};

adminPass.onkeydown = (e) => { if (e.key === 'Enter') loginBtn.click(); };

logoutBtn.onclick = () => {
    sessionStorage.removeItem('aura_admin');
    loginOverlay.classList.remove('hidden');
};

// ─── FILE DROP ───
fileDrop.onclick = () => fileInput.click();
fileInput.onchange = () => { if (fileInput.files[0]) { selectedFile = fileInput.files[0]; showPreview(selectedFile); } };
fileDrop.ondrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) { selectedFile = e.dataTransfer.files[0]; showPreview(selectedFile); }
};
fileDrop.ondragover = (e) => e.preventDefault();

function showPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => { dropPlaceholder.innerHTML = `<img src="${e.target.result}" alt="preview">`; };
    reader.readAsDataURL(file);
}

function resetForm() {
    selectedFile = null;
    fileInput.value = '';
    nameInput.value = '';
    tagInput.value = '';
    priceInput.value = '';
    dropPlaceholder.innerHTML = '<div class="icon">📷</div><div>Hacé clic o arrastrá una imagen</div>';
    saveBtn.disabled = false;
    saveBtn.textContent = 'Subir Sticker';
    progressBar.style.display = 'none';
    progressFill.style.width = '0%';
}

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = msg;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ─── UPLOAD TO SUPABASE ───
saveBtn.onclick = async () => {
    logToUI('Iniciando subida a Supabase...');
    const nombre = nameInput.value.trim();
    const tag = tagInput.value.trim();
    const precio = priceInput.value.trim();

    if (!selectedFile || !nombre || !tag || !precio) {
        showToast('Completá todos los campos', 'error');
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Subiendo...';
    progressBar.style.display = 'block';
    progressFill.style.width = '20%';

    try {
        // 1. Upload Image to Storage
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `stickers/${fileName}`;

        logToUI('1. Subiendo imagen a Supabase Storage...');
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('sticker-images')
            .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;
        progressFill.style.width = '60%';

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('sticker-images')
            .getPublicUrl(filePath);

        logToUI('2. URL obtenida. Guardando datos en tabla...');
        progressFill.style.width = '80%';

        // 3. Save to Table
        const { error: dbError } = await supabase
            .from('productos')
            .insert([{ nombre, tag, precio: Number(precio), imagen: publicUrl }]);

        if (dbError) throw dbError;

        logToUI('3. ¡Éxito! Sticker guardado.');
        progressFill.style.width = '100%';
        showToast('¡Sticker subido!');
        
        setTimeout(() => { resetForm(); loadStickers(); }, 1000);

    } catch (err) {
        logToUI('❌ ERROR: ' + err.message, 'error');
        showToast('Error: ' + err.message, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Reintentar';
    }
};

// ─── LOAD INVENTORY ───
async function loadStickers() {
    logToUI('Cargando inventario de Supabase...');
    try {
        const { data: items, error } = await supabase
            .from('productos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        invCount.textContent = items.length;
        document.getElementById('stat-total').textContent = items.length;
        document.getElementById('stat-categories').textContent = new Set(items.map(i => i.tag)).size;
        document.getElementById('stat-latest').textContent = items[0] ? items[0].nombre : '—';

        stickerList.innerHTML = items.length ? '' : '<div class="inv-empty">No hay stickers</div>';
        
        items.forEach(p => {
            const div = document.createElement('div');
            div.className = 'inv-item';
            div.innerHTML = `
                <img src="${p.imagen}" alt="${p.nombre}">
                <div class="inv-info">
                    <div class="name">${p.nombre}</div>
                    <div class="meta">${p.tag} · $${p.precio}</div>
                </div>
                <button class="inv-delete" data-id="${p.id}">🗑️</button>
            `;
            stickerList.appendChild(div);
        });

        document.querySelectorAll('.inv-delete').forEach(btn => {
            btn.onclick = async () => {
                if (confirm('¿Eliminar?')) {
                    const { error } = await supabase.from('productos').delete().eq('id', btn.dataset.id);
                    if (!error) { showToast('Eliminado'); loadStickers(); }
                }
            };
        });

    } catch (err) {
        logToUI('❌ ERROR CARGA: ' + err.message, 'error');
        stickerList.innerHTML = '<div class="inv-empty">Error al cargar</div>';
    }
}

checkAuth();
loadStickers();
