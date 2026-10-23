// js/feature/upload.js

document.addEventListener('DOMContentLoaded', () => {
    const cameraInput = document.getElementById('camera-input');
    const galleryInput = document.getElementById('gallery-input');
    const nameInput = document.getElementById('guest-name-input');
    const greeting = document.getElementById('guest-greeting');
    const queueContainer = document.getElementById('upload-queue');
    const queueList = document.getElementById('queue-list');

    // 1. Session and URL Params setup
    const urlParams = new URLSearchParams(window.location.search);
    const guestToken = urlParams.get('guest') || urlParams.get('t');
    
    // Generate simple Session ID for this browser session
    let sessionId = sessionStorage.getItem('fc_session_id');
    if (!sessionId) {
        sessionId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
        sessionStorage.setItem('fc_session_id', sessionId);
    }

    if (guestToken) {
        // We can prettify the token (e.g. "familia-perez" -> "Familia Perez") or leave it tracking
        // Let's autofill name input if we have a readable token
        let prettyName = guestToken.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        nameInput.value = prettyName;
        greeting.classList.remove('hidden');
    }

    // Keep the identity out of the landing until a guest selects photographs.
    const identity = nameInput?.closest('.wedding-identity-field');
    const uploadHint = document.querySelector('.wedding-upload-hint');
    let selectedFiles = null;
    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.id = 'confirm-photo-upload';
    confirmButton.textContent = 'Subir las fotos seleccionadas';
    confirmButton.className = 'wedding-action';
    confirmButton.style.cssText = 'width:100%;min-height:56px;margin:16px 0;font-size:18px';
    confirmButton.hidden = true;
    identity?.insertAdjacentElement('afterend', confirmButton);
    const savedName = localStorage.getItem('fc_guest_name');
    if (!nameInput.value && savedName) nameInput.value = savedName;
    if (identity) identity.hidden = true;
    confirmButton.addEventListener('click', () => {
        if (!selectedFiles?.length) return;
        if (!nameInput.value.trim()) {
            nameInput.focus();
            nameInput.setCustomValidity('Escribe tu nombre para identificar las fotos.');
            nameInput.reportValidity();
            return;
        }
        nameInput.setCustomValidity('');
        localStorage.setItem('fc_guest_name', nameInput.value.trim());
        const files = selectedFiles;
        selectedFiles = null;
        confirmButton.hidden = true;
        handleFiles(files);
    });
    nameInput?.addEventListener('input', () => nameInput.setCustomValidity(''));
    function chooseFiles(files) {
        if (!files?.length) return;
        selectedFiles = Array.from(files);
        if (identity) identity.hidden = false;
        if (uploadHint) uploadHint.textContent = selectedFiles.length + ' foto(s) seleccionada(s). Confirma tu nombre para compartirlas.';
        confirmButton.hidden = false;
        identity?.scrollIntoView({behavior:'smooth',block:'center'});
        if (!nameInput.value.trim()) nameInput.focus({preventScroll:true});
    }

    // Capture Metadata
    const metadata = {
        device_type: /Mobile|Android|iP(ad|hone)/.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
        browser: navigator.appName,
        user_agent: navigator.userAgent
    };

    // Use a custom Toast system or build a simple block
    function showUploadToast(msg) {
        // Fallback or use standard logic from main.js if included
        if (typeof showToast === 'function') {
            showToast(msg);
        } else {
            alert(msg);
        }
    }

    let pendingCount = 0;
    let successfulCount = 0;
    let failedCount = 0;

    const escapeHtml = value => String(value).replace(/[&<>"\x27]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","\x27":"&#39;"}[char]));

    // Handle File Selection
    function handleFiles(files) {
        if (!files || files.length === 0) return;
        
        const guestName = nameInput.value.trim();
        if (!guestName) {
            showUploadToast("¡Por favor ingresa tu nombre primero para saber quién nos comparte la foto!", "error");
            cameraInput.value = '';
            galleryInput.value = '';
            nameInput.focus();
            return;
        }

        const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (validFiles.length === 0) {
            showUploadToast("Ninguno de los archivos seleccionados es una imagen válida.");
            return;
        }

        if (validFiles.length !== files.length) showUploadToast("Algunos archivos no eran imágenes y se omitieron.");
        pendingCount += validFiles.length;

        const queueTitle = document.getElementById('queue-title');
        if (queueTitle) queueTitle.textContent = `Subiendo ${pendingCount} foto${pendingCount === 1 ? "" : "s"}…`;
        const viewBtn = document.getElementById('view-photos-btn');
        if (viewBtn) viewBtn.classList.add('hidden');

        queueContainer.classList.remove('hidden');

        validFiles.forEach((file, index) => {
            // Create UI Item
            const itemId = `upload-${Date.now()}-${index}`;
            const itemHtml = `
                <div id="${itemId}" class="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-all">
                    <div class="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img id="preview-${itemId}" src="" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-grow text-left">
                        <p class="text-sm font-bold text-dark truncate w-40">${escapeHtml(file.name)}</p>
                        <div class="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                            <div id="progress-${itemId}" class="bg-gold h-1.5 rounded-full" style="width: 10%"></div>
                        </div>
                    </div>
                    <div id="status-${itemId}" class="text-gold text-xl"><i class="fa-solid fa-spinner fa-spin"></i></div>
                </div>
            `;
            queueList.insertAdjacentHTML('afterbegin', itemHtml);

            // Set Preview
            const reader = new FileReader();
            reader.onload = (e) => {
                const prev = document.getElementById(`preview-${itemId}`);
                if (prev) prev.src = e.target.result;
            };
            reader.readAsDataURL(file);

            // Compress and Upload
            if (typeof Compressor === "undefined") {
                uploadToSupabase(file, file.name, guestName, itemId);
                return;
            }
            new Compressor(file, {
                quality: 0.8,
                maxWidth: 1920,
                maxHeight: 1920,
                success(compressedResult) {
                    uploadToSupabase(compressedResult, file.name, guestName, itemId);
                },
                error(err) {
                    // Compression failed (e.g. unsupported format): upload the original instead of failing.
                    console.warn('Compression error, uploading original:', err);
                    uploadToSupabase(file, file.name, guestName, itemId);
                },
            });
        });

        // Reset inputs
        cameraInput.value = '';
        galleryInput.value = '';
    }

    function onUploadFinished(itemId, isSuccess) {
        pendingCount = Math.max(0, pendingCount - 1);
        if (isSuccess) {
            successfulCount++;
        } else {
            failedCount++;
            const statusIcon = document.getElementById(`status-${itemId}`);
            const progressBar = document.getElementById(`progress-${itemId}`);
            if (progressBar) progressBar.classList.replace('bg-gold', 'bg-red-500');
            if (statusIcon) statusIcon.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-red-500"></i>`;
        }

        if (pendingCount > 0) {
            const queueTitle = document.getElementById("queue-title");
            if (queueTitle) queueTitle.textContent = `Quedan ${pendingCount} foto${pendingCount === 1 ? "" : "s"} por subir…`;
        }
        if (pendingCount === 0) {
            const queueTitle = document.getElementById('queue-title');
            const viewBtn = document.getElementById('view-photos-btn');

            if (failedCount > 0 && successfulCount === 0) {
                if (queueTitle) queueTitle.textContent = 'No pudimos subir tus fotos. Revisa tu conexión y vuelve a elegirlas para intentarlo otra vez.';
                if (viewBtn) viewBtn.classList.add('hidden');
            } else if (failedCount > 0 && successfulCount > 0) {
                if (queueTitle) queueTitle.textContent = 'Subida completada con algunas observaciones.';
                if (viewBtn) viewBtn.classList.remove('hidden');
            } else {
                if (queueTitle) queueTitle.textContent = '¡Subida Exitosa! 🎉';
                if (viewBtn) viewBtn.classList.remove('hidden');
            }
        }
    }

    async function uploadToSupabase(fileBlob, originalFilename, guestName, itemId) {
        const progressBar = document.getElementById(`progress-${itemId}`);
        const statusIcon = document.getElementById(`status-${itemId}`);

        if (typeof supabaseClient === 'undefined' && !window.supabaseClient) {
            console.error("Supabase client is not loaded or missing.");
            onUploadFinished(itemId, false);
            return;
        }
        
        const client = typeof supabaseClient !== 'undefined' ? supabaseClient : window.supabaseClient;

        try {
            if (progressBar) progressBar.style.width = '30%';

            const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now();
            const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" })[fileBlob.type] || "jpg";
            const storagePath = `guest_uploads/guest_${uniqueId}.${extension}`;

            // 1. Storage Upload
            const { data: storageData, error: storageError } = await client.storage
                .from('wedding-photos')
                .upload(storagePath, fileBlob, {
                    contentType: fileBlob.type,
                    upsert: false
                });

            if (storageError) throw storageError;
            if (progressBar) progressBar.style.width = '70%';

            // 2. Get Public URL
            const { data: { publicUrl } } = client.storage
                .from('wedding-photos')
                .getPublicUrl(storagePath);

            // 3. Save to guest_photos
            const finalUrl = publicUrl.includes('?') ? publicUrl + '&source=qr' : publicUrl + '?source=qr';

            const { error: dbError } = await client
                .from('guest_photos')
                .insert([{
                    url: finalUrl,
                    uploader_name: guestName
                }]);

            if (dbError) throw dbError;

            // Success Updates
            if (progressBar) {
                progressBar.style.width = '100%';
                progressBar.classList.replace('bg-gold', 'bg-green-500');
            }
            if (statusIcon) statusIcon.innerHTML = `<i class="fa-solid fa-circle-check text-green-500"></i>`;
            
            onUploadFinished(itemId, true);

            // Keep successful items visible so guests can confirm what was uploaded.
            /* Auto hide after 5 seconds to keep queue clean
            setTimeout(() => {
                const el = document.getElementById(itemId);
                if (el) {
                    el.style.opacity = '0';
                    setTimeout(() => el.remove(), 300);
                }
            }, 5000); */

        } catch (error) {
            console.error('Upload Failed:', error);
            onUploadFinished(itemId, false);
        }
    }

    // Attach Listeners
    cameraInput.addEventListener('change', (e) => chooseFiles(e.target.files));
    galleryInput.addEventListener('change', (e) => chooseFiles(e.target.files));
});
