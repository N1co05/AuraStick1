// ─── AMBIENTE & SEGURIDAD ───
// Los módulos JS y Firebase requieren un servidor (http/https). 
// En GitHub funcionando automáticamente. En tu PC local usá el servidor_local.py.
if (window.location.protocol === 'file:') {
    console.warn('⚠️ Nota: En modo local (file://) algunas funciones pueden estar limitadas. Usá servidor_local.py para probar en tu PC.');
}

import { db, storage, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, ref, uploadBytes, getDownloadURL } from '../services/firebase.js';

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

// State
let selectedFile = null;

// Stats
const statTotal = document.getElementById('stat-total');
const statCategories = document.getElementById('stat-categories');
const statLatest = document.getElementById('stat-latest');
const debugLog = document.getElementById('debug-log');

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

const ADMIN_PASS = '1234';

// ─── AUTH ───
function checkAuth() {
    if (sessionStorage.getItem('aura_admin') === 'true') {
        loginOverlay.classList.add('hidden');
    }
}

loginBtn.onclick = () => {
    const pass = adminPass.value;
    console.log('Intento de login...');
    
    if (pass === ADMIN_PASS) {
        try {
            sessionStorage.setItem('aura_admin', 'true');
            loginOverlay.classList.add('hidden');
            loginError.textContent = '';
            showToast('¡Bienvenido de nuevo!');
        } catch (e) {
            console.error('Error al guardar sesión:', e);
            alert('Error técnico: No se pudo guardar la sesión en el navegador.');
        }
    } else {
        loginError.textContent = 'Contraseña incorrecta';
        adminPass.value = '';
        adminPass.focus();
    }
};

adminPass.onkeydown = (e) => {
    if (e.key === 'Enter') loginBtn.click();
};

logoutBtn.onclick = () => {
    sessionStorage.removeItem('aura_admin');
    loginOverlay.classList.remove('hidden');
    adminPass.value = '';
    adminPass.focus();
};

// ─── FILE DROP ───
fileDrop.onclick = () => fileInput.click();

fileDrop.ondragover = (e) => {
    e.preventDefault();
    fileDrop.classList.add('dragover');
};
fileDrop.ondragleave = () => fileDrop.classList.remove('dragover');
fileDrop.ondrop = (e) => {
    e.preventDefault();
    fileDrop.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        selectedFile = e.dataTransfer.files[0];
        showPreview(selectedFile);
    }
};

fileInput.onchange = () => {
    if (fileInput.files[0]) {
        selectedFile = fileInput.files[0];
        showPreview(selectedFile);
    }
};

function showPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        dropPlaceholder.innerHTML = `<img src="${e.target.result}" alt="preview">`;
    };
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

// ─── TOAST ───
function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = msg;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ─── UPLOAD ───
saveBtn.onclick = async () => {
    logToUI('Iniciando proceso de subida...');
    const nombre = nameInput.value.trim();
    const tag = tagInput.value.trim();
    const precio = priceInput.value.trim();

    if (!selectedFile || !nombre || !tag || !precio) {
        logToUI('Faltan campos: ' + (!selectedFile ? 'Imagen ' : '') + (!nombre ? 'Nombre ' : '') + (!tag ? 'Tag ' : '') + (!precio ? 'Precio' : ''), 'warn');
        showToast('Completá todos los campos y seleccioná una imagen', 'error');
        return;
    }

    logToUI(`Datos: ${nombre}, Cat: ${tag}, $: ${precio}, File: ${selectedFile.name} (${selectedFile.size} bytes)`);

    saveBtn.disabled = true;
    saveBtn.textContent = 'Subiendo...';
    progressBar.style.display = 'block';
    progressFill.style.width = '20%';

    try {
        logToUI('1. Preparando referencia de Storage...');
        const storageRef = ref(storage, `stickers/${Date.now()}_${selectedFile.name.replace(/\s+/g, '_')}`);
        logToUI('2. Referencia creada. Iniciando uploadBytes...');
        
        progressFill.style.width = '40%';
        await uploadBytes(storageRef, selectedFile);
        logToUI('3. Imagen subida con éxito a Storage.');
        
        progressFill.style.width = '70%';

        logToUI('4. Obteniendo URL de descarga...');
        const url = await getDownloadURL(storageRef);
        logToUI('5. URL obtenida: ' + url.substring(0, 30) + '...');
        progressFill.style.width = '85%';

        // Save to Firestore
        logToUI('6. Guardando en Firestore...');
        await addDoc(collection(db, "productos"), {
            nombre,
            tag,
            precio: Number(precio),
            imagen: url,
            timestamp: Date.now()
        });

        progressFill.style.width = '100%';
        logToUI('7. ¡ÉXITO TOTAL! Sticker guardado.');
        showToast('¡Sticker subido con éxito!');
        
        setTimeout(() => {
            resetForm();
            loadStickers();
        }, 1500);

    } catch (err) {
        logToUI('❌ ERROR CRÍTICO: ' + err.message, 'error');
        console.error('Error detallado:', err);
        
        let errorMsg = 'Error al subir';
        if (err.code === 'storage/unauthorized') errorMsg = 'Error: No tenés permiso en Firebase (Rules)';
        else if (err.code === 'storage/canceled') errorMsg = 'Subida cancelada';
        else errorMsg = `Error: ${err.message || 'Desconocido'}`;
        
        showToast(errorMsg, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Reintentar Subida';
    }
};

// ─── LOAD INVENTORY ───
async function loadStickers() {
    stickerList.innerHTML = '<div class="inv-empty"><div class="icon">⏳</div><div>Cargando...</div></div>';

    try {
        const q = query(collection(db, "productos"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        const items = [];
        snapshot.forEach(docSnap => items.push({ id: docSnap.id, ...docSnap.data() }));

        // Update stats
        statTotal.textContent = items.length;
        const categories = new Set(items.map(i => i.tag).filter(Boolean));
        statCategories.textContent = categories.size;
        statLatest.textContent = items.length > 0 ? items[0].nombre : '—';

        invCount.textContent = items.length;

        if (items.length === 0) {
            stickerList.innerHTML = '<div class="inv-empty"><div class="icon">📦</div><div>No hay stickers todavía. ¡Subí el primero!</div></div>';
            return;
        }

        stickerList.innerHTML = '';
        items.forEach(p => {
            const div = document.createElement('div');
            div.className = 'inv-item';
            div.innerHTML = `
                <img src="${p.imagen}" alt="${p.nombre}">
                <div class="inv-info">
                    <div class="name">${p.nombre}</div>
                    <div class="meta">${p.tag} · $${p.precio}</div>
                </div>
                <button class="inv-delete" data-id="${p.id}" title="Eliminar">🗑️</button>
            `;
            stickerList.appendChild(div);
        });

        // Delete handlers
        document.querySelectorAll('.inv-delete').forEach(btn => {
            btn.onclick = async () => {
                if (confirm(`¿Eliminar este sticker?`)) {
                    btn.disabled = true;
                    try {
                        await deleteDoc(doc(db, "productos", btn.dataset.id));
                        showToast('Sticker eliminado');
                        loadStickers();
                    } catch (err) {
                        console.error(err);
                        showToast('Error al eliminar', 'error');
                        btn.disabled = false;
                    }
                }
            };
        });

    } catch (err) {
        console.error(err);
        stickerList.innerHTML = '<div class="inv-empty"><div class="icon">⚠️</div><div>Error al cargar. Recargá la página.</div></div>';
    }
}

// ─── INIT ───
checkAuth();
loadStickers();
