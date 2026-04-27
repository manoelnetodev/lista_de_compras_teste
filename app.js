// ===== CONSTANTS =====
const STORAGE_KEY = 'shoppingListItems';
const CATEGORIES = {
    geral: '🏷️', frutas: '🍎', carnes: '🥩', laticinios: '🧀',
    padaria: '🍞', bebidas: '🥤', limpeza: '🧹', higiene: '🧴',
    congelados: '🧊', outros: '📦'
};

// ===== STATE =====
let items = [];
let currentFilter = 'all';
let searchQuery = '';
let confirmCallback = null;

// ===== DOM REFS =====
const $ = (sel) => document.querySelector(sel);
const addForm = $('#addItemForm');
const itemsList = $('#itemsList');
const emptyState = $('#emptyState');
const editModal = $('#editModal');
const confirmModal = $('#confirmModal');
const searchInput = $('#searchInput');

// ===== LOCAL STORAGE =====
function loadItems() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        items = data ? JSON.parse(data) : [];
    } catch { items = []; }
}

function saveItems() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ===== PRICE HELPERS =====
function parsePrice(str) {
    if (!str) return 0;
    const cleaned = str.replace(/[^\d,\.]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
}

function formatPrice(num) {
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ===== TOAST =====
function showToast(message, type = 'info') {
    const container = $('#toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

// ===== CRUD =====
function createItem(name, quantity, price, category) {
    const item = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        name: name.trim(),
        quantity: parseInt(quantity) || 1,
        price: parsePrice(price),
        category: category || 'geral',
        purchased: false,
        createdAt: Date.now()
    };
    items.unshift(item);
    saveItems();
    return item;
}

function updateItem(id, data) {
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return;
    items[idx] = { ...items[idx], ...data };
    saveItems();
}

function deleteItem(id) {
    items = items.filter(i => i.id !== id);
    saveItems();
}

function togglePurchased(id) {
    const item = items.find(i => i.id === id);
    if (item) {
        item.purchased = !item.purchased;
        saveItems();
    }
}

// ===== RENDER =====
function getFilteredItems() {
    let filtered = [...items];
    if (currentFilter === 'pending') filtered = filtered.filter(i => !i.purchased);
    if (currentFilter === 'purchased') filtered = filtered.filter(i => i.purchased);
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(i => i.name.toLowerCase().includes(q));
    }
    return filtered;
}

function renderItems() {
    const filtered = getFilteredItems();
    if (filtered.length === 0) {
        itemsList.innerHTML = '';
        emptyState.classList.add('visible');
    } else {
        emptyState.classList.remove('visible');
        itemsList.innerHTML = filtered.map(item => `
            <div class="item-card ${item.purchased ? 'purchased' : ''}" data-id="${item.id}">
                <button class="item-checkbox" onclick="handleToggle('${item.id}')" title="Marcar como ${item.purchased ? 'pendente' : 'comprado'}">
                    ${item.purchased ? '✓' : ''}
                </button>
                <span class="item-category-icon">${CATEGORIES[item.category] || '🏷️'}</span>
                <div class="item-info">
                    <div class="item-name">${escapeHtml(item.name)}</div>
                    <div class="item-meta">
                        <span>📦 Qtd: ${item.quantity}</span>
                        ${item.price > 0 ? `<span>💰 ${formatPrice(item.price)} un.</span>` : ''}
                        ${item.price > 0 ? `<span>🧮 Subtotal: ${formatPrice(item.price * item.quantity)}</span>` : ''}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="item-btn edit" onclick="openEditModal('${item.id}')" title="Editar">✏️</button>
                    <button class="item-btn delete" onclick="handleDelete('${item.id}')" title="Excluir">🗑️</button>
                </div>
            </div>
        `).join('');
    }
    updateStats();
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function updateStats() {
    const total = items.length;
    const purchased = items.filter(i => i.purchased).length;
    const totalPrice = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    $('#totalItems').textContent = total;
    $('#purchasedItems').textContent = purchased;
    $('#totalPrice').textContent = formatPrice(totalPrice);
}

// ===== EVENT HANDLERS =====
function handleToggle(id) {
    togglePurchased(id);
    renderItems();
}

function handleDelete(id) {
    const item = items.find(i => i.id === id);
    showConfirm(`Deseja excluir "<strong>${escapeHtml(item?.name || '')}</strong>" da lista?`, () => {
        const card = document.querySelector(`.item-card[data-id="${id}"]`);
        if (card) {
            card.classList.add('removing');
            setTimeout(() => { deleteItem(id); renderItems(); showToast('Item removido!', 'success'); }, 300);
        } else {
            deleteItem(id); renderItems(); showToast('Item removido!', 'success');
        }
    });
}

// ===== MODAL: EDIT =====
function openEditModal(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    $('#editItemId').value = item.id;
    $('#editName').value = item.name;
    $('#editQuantity').value = item.quantity;
    $('#editPrice').value = item.price > 0 ? item.price.toFixed(2).replace('.', ',') : '';
    $('#editCategory').value = item.category;
    editModal.classList.add('active');
    setTimeout(() => $('#editName').focus(), 100);
}

function closeEditModal() {
    editModal.classList.remove('active');
}

// ===== MODAL: CONFIRM =====
function showConfirm(message, callback) {
    $('#confirmMessage').innerHTML = message;
    confirmCallback = callback;
    confirmModal.classList.add('active');
}

function closeConfirmModal() {
    confirmModal.classList.remove('active');
    confirmCallback = null;
}

// ===== INIT & EVENTS =====
document.addEventListener('DOMContentLoaded', () => {
    loadItems();
    renderItems();

    // Add item
    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('#itemName').value.trim();
        if (!name) return;
        createItem(name, $('#itemQuantity').value, $('#itemPrice').value, $('#itemCategory').value);
        addForm.reset();
        $('#itemQuantity').value = '1';
        $('#itemName').focus();
        renderItems();
        showToast(`"${name}" adicionado à lista!`, 'success');
    });

    // Edit item submit
    $('#editItemForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = $('#editItemId').value;
        updateItem(id, {
            name: $('#editName').value.trim(),
            quantity: parseInt($('#editQuantity').value) || 1,
            price: parsePrice($('#editPrice').value),
            category: $('#editCategory').value
        });
        closeEditModal();
        renderItems();
        showToast('Item atualizado!', 'success');
    });

    // Modal close buttons
    $('#modalCloseBtn').addEventListener('click', closeEditModal);
    $('#modalCancelBtn').addEventListener('click', closeEditModal);
    $('#confirmCloseBtn').addEventListener('click', closeConfirmModal);
    $('#confirmCancelBtn').addEventListener('click', closeConfirmModal);
    $('#confirmOkBtn').addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        closeConfirmModal();
    });

    // Close modals on overlay click
    editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });
    confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) closeConfirmModal(); });

    // Close modals on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeEditModal(); closeConfirmModal(); }
    });

    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderItems();
        });
    });

    // Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderItems();
    });

    // Clear purchased
    $('#clearPurchasedBtn').addEventListener('click', () => {
        const count = items.filter(i => i.purchased).length;
        if (count === 0) return showToast('Não há itens comprados para remover.', 'info');
        showConfirm(`Remover <strong>${count}</strong> item(ns) comprado(s)?`, () => {
            items = items.filter(i => !i.purchased);
            saveItems();
            renderItems();
            showToast(`${count} item(ns) removido(s)!`, 'success');
        });
    });

    // Clear all
    $('#clearAllBtn').addEventListener('click', () => {
        if (items.length === 0) return showToast('A lista já está vazia.', 'info');
        showConfirm(`Remover <strong>todos os ${items.length}</strong> itens da lista? Essa ação não pode ser desfeita.`, () => {
            items = [];
            saveItems();
            renderItems();
            showToast('Lista limpa!', 'success');
        });
    });
});
