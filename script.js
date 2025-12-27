const storage = chrome.storage.sync;
let allPrompts = [];
let editingId = null;

document.addEventListener('DOMContentLoaded', () => {
loadPrompts();
setupTabs();
setupEventListeners();
});

function setupTabs() {
document.querySelectorAll('.tab').forEach(tab => {
tab.addEventListener('click', () => {
document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
tab.classList.add('active');
const tabName = tab.dataset.tab;
document.getElementById('addSection').classList.toggle('hidden', tabName !== 'add');
document.getElementById('librarySection').classList.toggle('hidden', tabName !== 'library');
});
});
}

function setupEventListeners() {
document.getElementById('saveBtn').addEventListener('click', savePrompt);
document.getElementById('searchInput').addEventListener('input', handleSearch);
document.getElementById('exportBtn').addEventListener('click', exportData);
document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', importData);
}

function savePrompt() {
const folder = document.getElementById('folderInput').value.trim() || "General";
const title = document.getElementById('titleInput').value.trim();
const text = document.getElementById('promptInput').value.trim();

if (!title || !text) {
alert("Please fill in both title and prompt");
return;
}

storage.get({ prompts: [] }, (res) => {
let updated;
if (editingId) {
updated = res.prompts.map(p => p.id === editingId ? { ...p, folder, title, text } : p);
editingId = null;
document.getElementById('saveBtnText').textContent = "Save Prompt";
} else {
updated = [...res.prompts, { folder, title, text, id: Date.now() }];
}
storage.set({ prompts: updated }, () => {
loadPrompts();
clearForm();
showSuccess();
});
});
}

function clearForm() {
document.getElementById('folderInput').value = '';
document.getElementById('titleInput').value = '';
document.getElementById('promptInput').value = '';
}

function showSuccess() {
const btn = document.getElementById('saveBtn');
const originalHTML = btn.innerHTML;
btn.innerHTML = '<span>✅</span><span>Saved!</span>';
btn.style.background = '#10b981';
setTimeout(() => {
btn.innerHTML = originalHTML;
btn.style.background = '';
}, 1500);
}

function loadPrompts() {
storage.get({ prompts: [] }, (res) => {
allPrompts = res.prompts;
renderPrompts(allPrompts);
updateCount();
});
}

function renderPrompts(prompts) {
const container = document.getElementById('promptsList');
container.innerHTML = '';

if (prompts.length === 0) {
container.innerHTML = `
<div class="empty-state">
<div class="empty-icon">📭</div>
<div class="empty-text">No prompts saved yet</div>
</div>
`;
return;
}

const grouped = prompts.reduce((acc, p) => {
acc[p.folder] = acc[p.folder] || [];
acc[p.folder].push(p);
return acc;
}, {});

for (const folder in grouped) {
const section = document.createElement('div');
section.className = 'folder-section';
section.innerHTML = `<div class="folder-title">📁 ${folder}</div>`;

grouped[folder].forEach(item => {
const preview = item.text.length > 100 ? item.text.substring(0, 100) + '...' : item.text;
const div = document.createElement('div');
div.className = 'prompt-item';
div.innerHTML = `
<div class="prompt-header">
<div class="prompt-title">${escapeHtml(item.title)}</div>
</div>
<div class="prompt-preview">${escapeHtml(preview)}</div>
<div class="prompt-actions">
<button class="btn-icon btn-copy" data-id="${item.id}">📋 Copy</button>
<button class="btn-icon btn-edit" data-id="${item.id}">✏️ Edit</button>
<button class="btn-icon btn-delete" data-id="${item.id}">🗑️</button>
</div>
`;
section.appendChild(div);
});
container.appendChild(section);
}

setupItemActions();
}

function escapeHtml(text) {
const div = document.createElement('div');
div.textContent = text;
return div.innerHTML;
}

function setupItemActions() {
document.querySelectorAll('.btn-copy').forEach(btn => {
btn.addEventListener('click', (e) => {
const id = Number(e.currentTarget.dataset.id);
const prompt = allPrompts.find(p => p.id === id);
navigator.clipboard.writeText(prompt.text);
e.currentTarget.innerHTML = '✅ Copied!';
setTimeout(() => e.currentTarget.innerHTML = '📋 Copy', 1500);
});
});

document.querySelectorAll('.btn-edit').forEach(btn => {
btn.addEventListener('click', (e) => {
const id = Number(e.currentTarget.dataset.id);
const prompt = allPrompts.find(p => p.id === id);
document.getElementById('folderInput').value = prompt.folder === "General" ? "" : prompt.folder;
document.getElementById('titleInput').value = prompt.title;
document.getElementById('promptInput').value = prompt.text;
editingId = id;
document.getElementById('saveBtnText').textContent = "Update Prompt";
document.querySelectorAll('.tab')[0].click();
});
});

document.querySelectorAll('.btn-delete').forEach(btn => {
btn.addEventListener('click', (e) => {
if (!confirm("Delete this prompt?")) return;
const id = Number(e.currentTarget.dataset.id);
storage.get({ prompts: [] }, (res) => {
const filtered = res.prompts.filter(p => p.id !== id);
storage.set({ prompts: filtered }, loadPrompts);
});
});
});
}

function handleSearch(e) {
const query = e.target.value.toLowerCase();
const filtered = query ? allPrompts.filter(p =>
p.title.toLowerCase().includes(query) ||
p.text.toLowerCase().includes(query) ||
p.folder.toLowerCase().includes(query)
) : allPrompts;
renderPrompts(filtered);
}

function updateCount() {
const count = allPrompts.length;
document.getElementById('totalCount').textContent = `${count} prompt${count !== 1 ? 's' : ''}`;
}

function exportData() {
storage.get({ prompts: [] }, (res) => {
const blob = new Blob([JSON.stringify(res.prompts, null, 2)], {type: "application/json"});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `prompts_${new Date().toISOString().split('T')[0]}.json`;
a.click();
URL.revokeObjectURL(url);
});
}

function importData(e) {
const file = e.target.files[0];
if (!file) return;
const reader = new FileReader();
reader.onload = (ev) => {
try {
const data = JSON.parse(ev.target.result);
if (!Array.isArray(data)) {
alert("Invalid file format");
return;
}
storage.get({ prompts: [] }, (res) => {
const merged = [...res.prompts, ...data];
storage.set({ prompts: merged }, () => {
loadPrompts();
alert(`Successfully imported ${data.length} prompt${data.length !== 1 ? 's' : ''}`);
});
});
} catch (err) {
alert("Invalid file format");
}
};
reader.readAsText(file);
e.target.value = '';
}