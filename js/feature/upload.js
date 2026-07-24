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

        pendingCount += validFiles.length;

        const queueTitle = document.getElementById('queue-title');
        if (queueTitle) queueTitle.innerHTML = 'Subiendo...';
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
                        <p class="text-xs font-bold text-charcoal truncate w-40">${file.name}</p>
                        <div class="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                            <div id="progress-${itemId}" class="bg-sage h-1.5 rounded-full" style="width: 10%"></div>
                        </div>
                    </div>
                    <div id="status-${itemId}" class="text-sage text-xl"><i class="fa-solid fa-spinner fa-spin"></i></div>
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
            new Compressor(file, {
                quality: 0.8,
                maxWidth: 1920,
                maxHeight: 1920,
                success(compressedResult) {
                    uploadToSupabase(compressedResult, file.name, guestName, itemId);
                },
                error(err) {
                    console.error('Compression error:', err);
                    onUploadFinished(itemId, false);
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
            if (progressBar) progressBar.classList.replace('bg-sage', 'bg-red-500');
            if (statusIcon) statusIcon.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-red-500"></i>`;
        }

        if (pendingCount === 0) {
            const queueTitle = document.getElementById('queue-title');
            const viewBtn = document.getElementById('view-photos-btn');

            if (failedCount > 0 && successfulCount === 0) {
                if (queueTitle) queueTitle.innerHTML = 'Error en la subida. Revisa los detalles arriba.';
                if (viewBtn) viewBtn.classList.add('hidden');
            } else if (failedCount > 0 && successfulCount > 0) {
                if (queueTitle) queueTitle.innerHTML = 'Subida completada con algunas observaciones.';
                if (viewBtn) viewBtn.classList.remove('hidden');
            } else {
                if (queueTitle) queueTitle.innerHTML = '¡Subida Exitosa! 🎉';
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
            const extension = originalFilename.split('.').pop() || 'jpg';
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
                progressBar.classList.replace('bg-sage', 'bg-green-500');
            }
            if (statusIcon) statusIcon.innerHTML = `<i class="fa-solid fa-check-circle text-green-500"></i>`;
            
            onUploadFinished(itemId, true);

            // Auto hide after 5 seconds to keep queue clean
            setTimeout(() => {
                const el = document.getElementById(itemId);
                if (el) {
                    el.style.opacity = '0';
                    setTimeout(() => el.remove(), 300);
                }
            }, 5000);

        } catch (error) {
            console.error('Upload Failed:', error);
            onUploadFinished(itemId, false);
        }
    }

    // Attach Listeners
    cameraInput.addEventListener('change', (e) => handleFiles(e.target.files));
    galleryInput.addEventListener('change', (e) => handleFiles(e.target.files));
});
