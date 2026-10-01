const extensionSelect = document.querySelector('#extension');
const previewKindWrap = document.querySelector('#preview-kind-wrap');
const previewKindSelect = document.querySelector('#preview-kind');
const codeInput = document.querySelector('#code');
const languageLabel = document.querySelector('#language-label');
const charCount = document.querySelector('#char-count');
const status = document.querySelector('#status');
const previewButton = document.querySelector('#preview-button');
const uploadButton = document.querySelector('#upload-button');
const confirmUploadButton = document.querySelector('#confirm-upload-button');
const editButton = document.querySelector('#edit-button');
const previewPanel = document.querySelector('#preview-panel');
const previewFrame = document.querySelector('#preview-frame');
const resultPanel = document.querySelector('#result-panel');
const rawLink = document.querySelector('#raw-link');
const copyButton = document.querySelector('#copy-button');

let reviewedCode = null;
let reviewedExtension = null;
let savedUrl = '';

function selectedKind() {
  return extensionSelect.value || previewKindSelect.value;
}

function setStatus(message, type = '') {
  status.textContent = message;
  status.className = `status ${type}`.trim();
}

function updateForm() {
  const ext = extensionSelect.value;
  previewKindWrap.hidden = Boolean(ext);
  languageLabel.textContent = ext ? ({ html: 'HTML', css: 'CSS', js: 'JavaScript' })[ext] : 'Plain text';
  charCount.textContent = `${codeInput.value.length.toLocaleString('id-ID')} karakter`;
  uploadButton.disabled = !codeInput.value.trim();
  if (reviewedCode !== null && (reviewedCode !== codeInput.value || reviewedExtension !== ext)) {
    reviewedCode = null;
    previewPanel.hidden = true;
    setStatus('Kode berubah. Buat preview baru sebelum upload.');
  }
}

function previewDocument(code, kind) {
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">`;
  if (kind === 'html') {
    return `<!doctype html><html><head>${csp}<meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;padding:12px;color:#222}</style></head><body>${code}</body></html>`;
  }
  if (kind === 'css') {
    const safeCss = code.replace(/<\/style/gi, '<\\/style');
    return `<!doctype html><html><head>${csp}<meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;padding:18px;color:#222}.sample{padding:18px;border:1px solid #bbb;border-radius:8px}.sample p{margin-bottom:0}</style><style>${safeCss}</style></head><body><main class="sample"><strong>Contoh elemen</strong><p>Gunakan CSS untuk mengubah tampilan konten ini.</p><button class="demo-button">Tombol contoh</button></main></body></html>`;
  }
  if (kind === 'js') {
    const encoded = btoa(unescape(encodeURIComponent(code)));
    return `<!doctype html><html><head>${csp}<meta charset="utf-8"><style>body{font:14px system-ui,sans-serif;padding:14px;color:#222}#console{margin-top:12px;padding:10px;background:#f2f4f7;border-radius:5px;white-space:pre-wrap;font:12px monospace}</style></head><body><div id="app">Area preview JavaScript</div><pre id="console">Console preview siap.</pre><script>const originalLog=console.log;const out=document.querySelector('#console');console.log=(...args)=>{out.textContent+='\\n'+args.map(String).join(' ')};const code=decodeURIComponent(escape(atob('${encoded}')));try{(new Function(code))()}catch(e){out.textContent+='\\n'+e.name+': '+e.message}</script></body></html>`;
  }
  return '';
}

function showPreview() {
  const code = codeInput.value;
  if (!code.trim()) {
    setStatus('Tempel kode terlebih dahulu.', 'error');
    codeInput.focus();
    return;
  }
  const kind = selectedKind();
  if (!kind) {
    setStatus('Pilih jenis kode untuk membuat preview HTML, CSS, atau JavaScript.', 'error');
    return;
  }
  previewFrame.srcdoc = previewDocument(code, kind);
  reviewedCode = code;
  reviewedExtension = extensionSelect.value;
  previewPanel.hidden = false;
  resultPanel.hidden = true;
  setStatus('Periksa preview, lalu lanjutkan upload jika sudah sesuai.', 'success');
  previewPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function uploadPaste() {
  const code = codeInput.value;
  const ext = extensionSelect.value;
  if (!code.trim()) return setStatus('Tempel kode terlebih dahulu.', 'error');
  if (selectedKind() && (reviewedCode !== code || reviewedExtension !== ext)) {
    return showPreview();
  }

  uploadButton.disabled = true;
  confirmUploadButton.disabled = true;
  setStatus('Menyimpan paste...');
  try {
    const response = await fetch('/api/pastes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, extension: ext })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Paste gagal disimpan.');
    savedUrl = result.url;
    rawLink.href = savedUrl;
    rawLink.textContent = savedUrl;
    resultPanel.hidden = false;
    previewPanel.hidden = true;
    setStatus(`Berhasil disimpan sebagai ${result.id}.`, 'success');
    resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    setStatus(error.message, 'error');
    confirmUploadButton.disabled = false;
    uploadButton.disabled = !codeInput.value.trim();
  }
}

extensionSelect.addEventListener('change', () => {
  reviewedCode = null;
  previewPanel.hidden = true;
  updateForm();
  setStatus('Ekstensi diperbarui. Periksa preview sebelum upload.');
});
previewKindSelect.addEventListener('change', updateForm);
codeInput.addEventListener('input', updateForm);
previewButton.addEventListener('click', showPreview);
uploadButton.addEventListener('click', uploadPaste);
confirmUploadButton.addEventListener('click', uploadPaste);
editButton.addEventListener('click', () => {
  previewPanel.hidden = true;
  setStatus('Silakan lanjutkan mengedit kode.');
  codeInput.focus();
});
copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(savedUrl);
    copyButton.textContent = 'Tersalin ✓';
    setTimeout(() => { copyButton.textContent = 'Salin URL'; }, 1800);
  } catch {
    setStatus('Browser tidak mengizinkan salin otomatis. Silakan salin URL secara manual.', 'error');
  }
});
codeInput.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') showPreview();
  if (event.key === 'Tab') {
    event.preventDefault();
    const start = codeInput.selectionStart;
    const end = codeInput.selectionEnd;
    codeInput.setRangeText('  ', start, end, 'end');
    updateForm();
  }
});

updateForm();
