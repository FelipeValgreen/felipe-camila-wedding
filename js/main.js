// Extracted from index.html


// TOAST NOTIFICATION SYSTEM
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-charcoal';
    toast.className = `fixed bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full text-white ${bgColor} shadow-xl z-[9999] opacity-0 transition-opacity duration-300 flex items-center gap-2 text-sm font-sans tracking-wide`;
    
    let icon = type === 'error' ? '<i class="fa-solid fa-circle-exclamation"></i>' : '<i class="fa-solid fa-circle-check"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    
    document.body.appendChild(toast);
    
    // Fade in
    setTimeout(() => toast.style.opacity = '1', 10);
    
    // Fade out
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Global alert override
window.alert = function(msg) {
    showToast(msg, msg.toLowerCase().includes('error') || msg.includes('falta') || msg.includes('favor') ? 'error' : 'success');
};


// Note: insta-scroll carousel dots removed — feed is now a horizontal flex carousel

// LIGHTBOX LOGIC
window.openLightbox = function(url, name) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxName = document.getElementById('lightbox-name');
    
    if (lightbox && lightboxImg) {
        lightboxImg.src = url;
        lightboxName.textContent = name;
        lightbox.classList.remove('hidden');
        lightbox.classList.add('flex');
        
        setTimeout(() => {
            lightbox.classList.remove('opacity-0');
        }, 50);
        document.body.style.overflow = 'hidden'; 
    }
};

window.closeLightbox = function() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.add('opacity-0');
        setTimeout(() => {
            lightbox.classList.add('hidden');
            lightbox.classList.remove('flex');
            document.body.style.overflow = ''; 
        }, 300);
    }
};
        window.addEventListener('scroll', function () {
            const rsvpSection = document.getElementById('rsvp');
            const cta = document.getElementById('rsvp-cta');

            if (rsvpSection && cta) {
                const rect = rsvpSection.getBoundingClientRect();
                const isVisible = (rect.top <= window.innerHeight) && (rect.bottom >= 0);

                // Hide CTA when RSVP section is visible
                if (isVisible) {
                    cta.style.transform = 'translateY(100%)';
                } else {
                    cta.style.transform = 'translateY(0)';
                }
            }
        });
    


        // 1. Navigation Reveal (triggered when envelope is opened)
        const nav = document.getElementById('main-nav');

        // Nav is revealed after envelope interaction
        // The envelope button in index.html calls this via DOMContentLoaded
        // We expose a helper for it
        window.revealNav = function() {
            if (nav) {
                nav.classList.remove('-translate-y-full', 'opacity-0');
                nav.classList.add('translate-y-0', 'opacity-100');
            }
            checkReveal();
        };

        // Also reveal after short delay for cases where DOMContentLoaded has passed
        setTimeout(() => {
            const overlay = document.getElementById('envelope-overlay');
            if (!overlay || overlay.style.transform === 'translateY(-100%)') {
                window.revealNav();
            }
        }, 600);

        // 2. Scroll Reveal & Sticky Nav
        const reveals = document.querySelectorAll('.reveal');
        const checkReveal = () => {
            const triggerBottom = window.innerHeight * 0.85;
            reveals.forEach(reveal => {
                const top = reveal.getBoundingClientRect().top;
                if (top < triggerBottom) reveal.classList.add('active');
            });

            // Sticky Nav Background
            if (window.scrollY > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        };
        window.addEventListener('scroll', checkReveal);

        // 3. INTERACTIVE SECTIONS LOGIC

        // Check Auth State
        async function checkAuth() {
            if (typeof window.getCurrentUser !== 'function') return;
            const user = await window.getCurrentUser();

            const authOverlay = document.getElementById('guest-auth-overlay');
            const uploaderName = document.getElementById('uploader-name');
            const photoUpload = document.getElementById('photo-upload');
            const uploadBtn = document.getElementById('upload-btn');

            if (user) {
                // User is logged in
                if (authOverlay) authOverlay.classList.add('hidden');
                if (uploaderName) {
                    uploaderName.value = user.user_metadata.full_name || user.email.split('@')[0];
                    uploaderName.disabled = false;
                }
                if (photoUpload) photoUpload.disabled = false;
                if (uploadBtn) uploadBtn.disabled = false;
            } else {
                // User is logged out (default state is locked)
            }
        }

        // Login Button Logic
        const loginGoogleBtn = document.getElementById('login-google-btn');
        const toggleEmailBtn = document.getElementById('toggle-email-btn');
        const emailForm = document.getElementById('email-auth-form');
        const loginEmailBtn = document.getElementById('login-email-btn');

        if (loginGoogleBtn) {
            loginGoogleBtn.addEventListener('click', async () => {
                loginGoogleBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Conectando...';
                await window.signInWithGoogle();
            });
        }

        if (toggleEmailBtn) {
            toggleEmailBtn.addEventListener('click', () => {
                emailForm.classList.toggle('hidden');
            });
        }

        if (loginEmailBtn) {
            loginEmailBtn.addEventListener('click', async () => {
                const email = document.getElementById('auth-email-input').value;
                if (!email) return alert('Ingresa tu correo');
                loginEmailBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
                const { error } = await window.signInWithEmail(email);
                if (error) {
                    alert('Error: ' + error.message);
                    loginEmailBtn.innerText = 'Enviar Link Mágico';
                } else {
                    alert('¡Revisa tu correo! Te enviamos un link mágico.');
                    loginEmailBtn.innerText = 'Link Enviado';
                }
            });
        }

        // Upload Logic
        const uploadBtn = document.getElementById('upload-btn');
        const photoInput = document.getElementById('photo-upload');
        const uploaderNameInput = document.getElementById('uploader-name');
        const statusMsg = document.getElementById('upload-status');
        const uploaderEmailInput = document.getElementById('uploader-email');

        if (uploadBtn) {
            uploadBtn.addEventListener('click', async () => {
                const file = photoInput.files[0];
                const name = uploaderNameInput.value;
                const email = uploaderEmailInput.value || 'No proporcionado';

                if (!file) return alert('Selecciona una foto');
                if (!name) return alert('Ingresa tu nombre');

                uploadBtn.disabled = true;
                uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subiendo...';

                const { data, error } = await window.uploadGuestPhoto(file, name, email, '');

                if (error) {
                    console.error(error);
                    alert('Error al subir: ' + error.message);
                    uploadBtn.disabled = false;
                    uploadBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up mr-2"></i> Subir Foto';
                } else {
                    // Reload gallery to show new photo
                    if (typeof loadGallery === 'function') {
                        await loadGallery();
                    }

                    // Send email notification (note: mailto only opens email client, doesn't auto-send)
                    await window.sendPhotoUploadNotification(name, email);

                    // Show thank you popup
                    statusMsg.classList.remove('hidden');
                    statusMsg.innerHTML = `
                        <div class="bg-sage-light/20 border-2 border-sage rounded-lg p-6 text-center">
                            <i class="fa-solid fa-circle-check text-5xl text-sage-dark mb-4"></i>
                            <h3 class="text-2xl font-serif text-charcoal mb-2">¡Gracias ${name}!</h3>
                            <p class="text-sage-dark mb-4">Tu foto se ha subido exitosamente. Revisa el carrusel abajo para verla.</p>
                            <p class="text-xs text-gray-500 mb-4">Nota: Para notificar a los novios, envíales un mensaje directamente.</p>
                            <button onclick="this.closest('.bg-sage-light\\/20').parentElement.classList.add('hidden')" 
                                    class="bg-charcoal text-white px-6 py-2 rounded-full hover:bg-sage transition-colors">
                                Cerrar
                            </button>
                        </div>
                    `;

                    uploadBtn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Listo';

                    // Reset form after 3 seconds
                    setTimeout(() => {
                        photoInput.value = '';
                        uploaderNameInput.value = '';
                        uploaderEmailInput.value = '';
                        uploadBtn.disabled = false;
                        uploadBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up mr-2"></i> Subir Foto';
                    }, 3000);
                }
            });
        }

        // Initialize Auth Check
        setTimeout(checkAuth, 1000);

        // A. Guest Cam Logic
        // const uploadBtn = document.getElementById('upload-btn'); // Already defined above
        // const uploadStatus = document.getElementById('upload-status'); // Already defined above
        const galleryContainer = document.getElementById('guest-gallery');

        // Load Gallery on Page Load
        // Load Gallery on Page Load (Populate Both Sections)
        async function loadGallery() {
            // 1. Target Instagram Feed (Bottom)
            const instaFeed = document.getElementById('instagram-feed');
            // 2. Target Guest Carousel (Top - Paparazzi Section)
            const guestCarousel = document.getElementById('guest-gallery');

            if (!window.supabaseClient) return;

            let allPhotos = [];

            // A. Fetch All Photos (from unified guest_photos table)
            if (typeof window.fetchGuestPhotos === 'function') {
                const response = await window.fetchGuestPhotos();
                if (response.data) {
                    allPhotos = response.data;
                }
            }

            // Sort newest first
            allPhotos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            // Helper for Deduplication
            const getUniqueData = (arr) => {
                const seenFilenames = new Set();
                return arr.filter(item => {
                    try {
                        const url = item.url;
                        const match = url.match(/guest_\d+_(.+)$/);
                        const originalName = match ? match[1] : url;
                        const key = originalName + '_' + (item.uploader_name || '');
                        if (seenFilenames.has(key)) return false;
                        seenFilenames.add(key);
                        return true;
                    } catch (e) {
                        return true;
                    }
                });
            };

            const uniqueAllData = getUniqueData(allPhotos);
            
            // Filter out QR uploads for the Instagram feed
            const instaData = allPhotos.filter(item => !item.url.includes('source=qr'));
            const uniqueInstaData = getUniqueData(instaData);

            // A. Populate Instagram Feed (Masonry Grid - B&W)
            if (instaFeed && uniqueInstaData.length > 0) {
                const existingDynamicInsta = instaFeed.querySelectorAll('.dynamic-photo');
                existingDynamicInsta.forEach(el => el.remove());

                // Limit up to 50 dynamic photos
                const slicedInstaData = uniqueInstaData.slice(0, 50);

                const instaHtml = slicedInstaData.map((photo, index) => {
                    return `
                    <div onclick="if(window.openLightbox) window.openLightbox('${photo.url}', '${(photo.uploader_name || 'Anónimo').replace(/'/g, "\\'")}')" class="dynamic-photo w-[280px] flex-shrink-0 snap-start aspect-[4/5] overflow-hidden relative group cursor-pointer bg-gray-100 shadow-sm border border-gray-100">
                        <img src="${photo.url}" 
                             class="w-full h-full object-cover grayscale opacity-90 transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0 group-hover:opacity-100" 
                             alt="Guest Photo"
                             onerror="this.closest('.dynamic-photo').remove()">
                        <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center">
                            <i class="fa-brands fa-instagram text-white/80 text-3xl font-light drop-shadow-md"></i>
                        </div>
                    </div>
                `}).join('');

                instaFeed.insertAdjacentHTML('beforeend', instaHtml);
            }

            // B. Populate Masonry Gallery (Paparazzi Grid)
            const masonryFeed = document.getElementById('masonry-gallery');
            const galleryEmpty = document.getElementById('gallery-empty');
            if (masonryFeed) {
                masonryFeed.innerHTML = '';
                if (uniqueAllData.length > 0) {
                    const masonryHtml = uniqueAllData.map(photo => {
                        return `
                        <div onclick="if(window.openLightbox) window.openLightbox('${photo.url}', '${(photo.uploader_name || 'Anónimo').replace(/'/g, "\\'")}')" class="break-inside-avoid mb-4 group relative overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer shadow-sm rounded-sm">
                            <img src="${photo.url}" 
                                 class="w-full object-cover grayscale opacity-95 group-hover:scale-[1.02] group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" 
                                 alt="Foto de Invitado"
                                 onerror="this.closest('.break-inside-avoid').remove()">
                            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between">
                                <span class="text-white text-[10px] font-sans truncate">${photo.uploader_name || 'Invitado'}</span>
                                <i class="fa-solid fa-magnifying-glass-plus text-white/80 text-[10px]"></i>
                            </div>
                        </div>
                        `;
                    }).join('');
                    masonryFeed.innerHTML = masonryHtml;
                    if (galleryEmpty) galleryEmpty.classList.add('hidden');
                } else {
                    if (galleryEmpty) galleryEmpty.classList.remove('hidden');
                }
            }
        }

        // RSVP Form Handler
        const rsvpForm = document.getElementById('rsvp-form');
        const hasPartnerCheckbox = document.getElementById('has-partner');
        const partnerSection = document.getElementById('partner-section');
        const rsvpSuccess = document.getElementById('rsvp-success');

        // Toggle partner section
        if (hasPartnerCheckbox) {
            hasPartnerCheckbox.addEventListener('change', () => {
                if (hasPartnerCheckbox.checked) {
                    partnerSection.classList.remove('hidden');
                } else {
                    partnerSection.classList.add('hidden');
                    document.getElementById('partner-name').value = '';
                    document.getElementById('partner-dietary').value = 'ninguna';
                }
            });
        }

        // Handle RSVP form submission
        if (rsvpForm) {
            rsvpForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const name = document.getElementById('rsvp-name').value;
                const whatsapp = document.getElementById('rsvp-whatsapp').value;
                const dietary = document.getElementById('dietary-restrictions').value;
                const hasPartner = hasPartnerCheckbox.checked;
                const partnerName = hasPartner ? document.getElementById('partner-name').value : '';
                const partnerDietary = hasPartner ? document.getElementById('partner-dietary').value : '';

                const submitBtn = document.getElementById('rsvp-submit-btn');
                const originalText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = 'Enviando...';

                // Send email notification using Web3Forms
                const formData = new FormData();
                formData.append('access_key', '138e83f9-894d-4a94-bee4-af9392f8ffb9');
                formData.append('subject', `Nueva Confirmación Gala: ${name}`);
                formData.append('from_name', 'Sitio Oficial Boda');
                formData.append('to_email', 'camilayfelipe.v@gmail.com');

                let message = `Invitado Principal: ${name}\nWhatsApp: ${whatsapp}\nRestricción: ${dietary}`;
                if (hasPartner) {
                    message += `\n\nAcompañante: ${partnerName}\nRestricción Acompañante: ${partnerDietary}`;
                }
                formData.append('message', message);

                // 1. Prepare Supabase Data
                const rsvpData = {
                    name,
                    email: '', // Deprecated minimal form
                    whatsapp,
                    has_partner: hasPartner,
                    partner_name: partnerName,
                    dietary_restrictions: dietary,
                    partner_dietary: partnerDietary,
                    created_at: new Date().toISOString()
                };

                // 2. Execute both actions in parallel
                try {
                    const emailPromise = fetch('https://api.web3forms.com/submit', {
                        method: 'POST',
                        body: formData
                    });

                    const dbPromise = window.saveRSVP ? window.saveRSVP(rsvpData) : Promise.resolve({ error: 'Supabase func missing' });

                    const [emailResponse, dbResult] = await Promise.allSettled([emailPromise, dbPromise]);

                    // Check functionality
                    let emailSuccess = false;
                    let dbSuccess = false;

                    if (emailResponse.status === 'fulfilled') {
                        const result = await emailResponse.value.json();
                        if (result.success) emailSuccess = true;
                        else console.error('Web3Forms Error:', result);
                    } else {
                        console.error('Web3Forms Network Error:', emailResponse.reason);
                    }

                    if (dbResult.status === 'fulfilled') {
                        if (!dbResult.value.error) dbSuccess = true;
                        else console.error('Supabase Error:', dbResult.value.error);
                    }

                    // Success Condition: At least one worked
                    if (emailSuccess || dbSuccess) {
                        rsvpForm.classList.add('hidden');
                        rsvpSuccess.classList.remove('hidden');
                        if (typeof confetti === 'function') {
                            confetti({
                                particleCount: 120,
                                spread: 70,
                                origin: { y: 0.6 }
                            });
                        }

                        // Update WhatsApp share notice button
                        const whatsappShareBtn = document.getElementById('rsvp-whatsapp-share-btn');
                        if (whatsappShareBtn) {
                            let whatsappMsg = `¡Hola! Acabo de confirmar mi asistencia en la web.\n\n`;
                            whatsappMsg += `Invitado: ${name}\n`;
                            whatsappMsg += `WhatsApp: ${whatsapp}\n`;
                            whatsappMsg += `Restricción alimentaria: ${dietary}\n`;
                            if (hasPartner) {
                                whatsappMsg += `Acompañante: ${partnerName}\n`;
                                whatsappMsg += `Restricción acompañante: ${partnerDietary}\n`;
                            }
                            whatsappShareBtn.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMsg)}`;
                        }
                    } else {
                        alert('Hubo un error al enviar tu confirmación. Por favor, intenta de nuevo.');
                    }

                } catch (error) {
                    console.error('Critical Error:', error);
                    alert('Hubo un error inesperado. Por favor, intenta de nuevo.');
                }

                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            });
        }

        // Quick WhatsApp RSVP click handler (grabs current form values)
        const whatsappQuickBtn = document.getElementById('rsvp-whatsapp-quick-btn');
        if (whatsappQuickBtn) {
            whatsappQuickBtn.addEventListener('click', (e) => {
                const name = document.getElementById('rsvp-name').value.trim();
                const whatsapp = document.getElementById('rsvp-whatsapp').value.trim();
                const dietary = document.getElementById('dietary-restrictions').value;
                const hasPartner = hasPartnerCheckbox && hasPartnerCheckbox.checked;
                const partnerName = hasPartner ? document.getElementById('partner-name').value.trim() : '';
                const partnerDietary = hasPartner ? document.getElementById('partner-dietary').value : '';

                let whatsappMsg = `¡Hola! Confirmo mi asistencia para la boda.\n\n`;
                if (name) {
                    whatsappMsg += `Invitado: ${name}\n`;
                    if (whatsapp) whatsappMsg += `WhatsApp: ${whatsapp}\n`;
                    whatsappMsg += `Restricción alimentaria: ${dietary}\n`;
                    if (hasPartner) {
                        whatsappMsg += `Acompañante: ${partnerName || 'Acompañante'}\n`;
                        whatsappMsg += `Restricción acompañante: ${partnerDietary}\n`;
                    }
                } else {
                    whatsappMsg += `Quiero confirmar mi asistencia.`;
                }

                whatsappQuickBtn.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMsg)}`;
            });
        }



        // Handle Upload
        // Guest Cam Upload
        // Guest Cam Upload
        // Guest Cam Upload Logic (Select -> Then Click Upload)
        const photoUploadInput = document.getElementById('photo-upload');
        const paparazziUploadBtn = document.getElementById('upload-btn');
        let selectedFile = null;

        if (photoUploadInput) {
            // 1. Handle Selection
            photoUploadInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    selectedFile = e.target.files[0];
                    // Optional: Update button text or show preview?
                    // For now just valid.
                }
            });
        }

        if (paparazziUploadBtn) {
            // 2. Handle Click Submit
            paparazziUploadBtn.addEventListener('click', async () => {
                const uploaderName = document.getElementById('uploader-name').value;
                const uploaderEmail = document.getElementById('uploader-email').value;
                const uploaderWhatsapp = ''; // Field not used in paparazzi form

                if (!selectedFile) {
                    // If no file selected yet, trigger the input prompt
                    // But if input is visible (as it is), we should tell them to pick one.
                    // If they just clicked "Subir Foto" without picking:
                    if (photoUploadInput.value === '') {
                        alert('Por favor selecciona una foto primero.');
                        return;
                    }
                    // Fallback if variable is lost but input has value
                    selectedFile = photoUploadInput.files[0];
                }

                if (!uploaderName) {
                    alert('Por favor ingresa tu nombre antes de subir una foto.');
                    document.getElementById('uploader-name').focus();
                    return;
                }

                // UI Loading State
                const originalContent = paparazziUploadBtn.innerHTML;
                paparazziUploadBtn.disabled = true;
                paparazziUploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Subiendo...';

                // Upload
                const { data, error } = await uploadGuestPhoto(selectedFile, uploaderName, uploaderEmail, uploaderWhatsapp);

                if (error) {
                    console.error(error);
                    alert('Error al subir la foto. Intenta de nuevo.');
                    paparazziUploadBtn.disabled = false;
                    paparazziUploadBtn.innerHTML = originalContent;
                } else {
                    alert('¡Foto subida con éxito! Gracias por compartir.');
                    paparazziUploadBtn.disabled = false;
                    paparazziUploadBtn.innerHTML = originalContent;

                    // Cleanup
                    selectedFile = null;
                    photoUploadInput.value = '';
                    document.getElementById('uploader-name').value = '';
                    document.getElementById('uploader-email').value = '';
                    if (document.getElementById('uploader-whatsapp')) document.getElementById('uploader-whatsapp').value = '';

                    // Refresh Gallery
                    if (typeof loadGallery === 'function') {
                        loadGallery();
                    }
                }
            });
        }

        // Initialize Gallery
        // Wait a bit for Supabase script to load
        setTimeout(loadGallery, 1000);


        // B. DJ Booth Form Simulation
        // The original DJ Booth simulation logic is replaced by the new D. DJ Booth Logic below.
        // Keeping the original form elements and their IDs for the new logic.

        // C. Trivia Logic


        // D. DJ Booth Logic
        async function loadSongRequests() {
            const listContainer = document.getElementById('dj-suggestions-list');
            if (!listContainer || typeof window.fetchSongRequests !== 'function') return;

            const { data, error } = await window.fetchSongRequests();
            if (error) {
                listContainer.innerHTML = '<div class="text-white/50 text-center text-xs">Error cargando lista</div>';
                return;
            }

            if (data && data.length > 0) {
                listContainer.innerHTML = data.map(req => `
                    <div class="flex justify-between items-start border-b border-white/10 pb-2 mb-2 last:border-0">
                        <div>
                            <p class="text-gold font-bold text-sm leading-tight">${req.song_name}</p>
                            <p class="text-white/60 text-xs">${req.artist_name || ''}</p>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] text-white/40 uppercase tracking-wider block">Pedido por</span>
                            <span class="text-white/80 text-xs font-handwriting">${req.requester_name}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                listContainer.innerHTML = '<div class="text-white/30 text-center text-xs italic py-4">Sé el primero en pedir una canción...</div>';
            }
        }

        async function handleSongRequest(event) {
            event.preventDefault();

            // IDs in HTML are: dj-song, dj-name
            const songInput = document.getElementById('dj-song');
            const nameInput = document.getElementById('dj-name');

            const songValue = songInput.value.trim();
            const nameValue = nameInput.value.trim();

            const btn = document.getElementById('dj-submit-btn');
            const originalBtnContent = btn.innerHTML;
            const successMsg = document.getElementById('dj-success');

            if (!songValue || !nameValue) {
                alert('Por favor completa todos los campos.');
                return;
            }

            // Split song/artist if hyphen present
            let songName = songValue;
            let artistName = '';
            if (songValue.includes(' - ')) {
                const parts = songValue.split(' - ');
                songName = parts[0].trim();
                artistName = parts[1].trim();
            } else if (songValue.includes('-')) {
                const parts = songValue.split('-');
                songName = parts[0].trim();
                artistName = parts[1].trim();
            }

            // UI Loading
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Enviando...';

            try {
                // 1. Save to Supabase (Database)
                const { error } = await window.saveSongRequest(songName, artistName, nameValue);
                if (error) throw error;

                // 2. Refresh List
                await loadSongRequests();

                // 3. Show Success
                btn.innerHTML = '<i class="fas fa-check mr-2"></i> ¡Enviado!';
                successMsg.classList.remove('opacity-0', 'pointer-events-none');

                // Reset Form
                document.getElementById('dj-form').reset();

                // Reset button and hide success after delay
                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerHTML = originalBtnContent;
                    successMsg.classList.add('opacity-0', 'pointer-events-none');
                }, 3000);

            } catch (err) {
                console.error('Error requesting song:', err);
                const errorDetails = err.message || JSON.stringify(err);
                alert('Error al enviar la solicitud: ' + errorDetails + '. Intenta de nuevo.');
                btn.disabled = false;
                btn.innerHTML = originalBtnContent;
            }
        }

        // Initialize DJ Logic
        const djForm = document.getElementById('dj-form');
        if (djForm) {
            djForm.addEventListener('submit', handleSongRequest);
            // Load initial list
            setTimeout(loadSongRequests, 1500); // Wait for Supabase init
        }

        // -----------------------------------------------------------------
        // WEDDING COUNTDOWN TIMER LOGIC
        // -----------------------------------------------------------------
        function initializeCountdown() {
            // Target date: October 23, 2026, at 17:30
            const targetDate = new Date('2026-10-23T17:30:00').getTime();

            const daysSpan = document.getElementById('countdown-days');
            const hoursSpan = document.getElementById('countdown-hours');
            const minsSpan = document.getElementById('countdown-mins');
            const secsSpan = document.getElementById('countdown-secs');

            if (!daysSpan) return; // Countdown not present on this page

            function updateTimer() {
                const now = new Date().getTime();
                const difference = targetDate - now;

                if (difference <= 0) {
                    // Wedding has started/passed
                    daysSpan.innerText = '00';
                    hoursSpan.innerText = '00';
                    minsSpan.innerText = '00';
                    secsSpan.innerText = '00';
                    clearInterval(intervalId);
                    return;
                }

                // Time calculations
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((difference % (1000 * 60)) / 1000);

                // Format leading zero
                daysSpan.innerText = days < 10 ? '0' + days : days;
                hoursSpan.innerText = hours < 10 ? '0' + hours : hours;
                minsSpan.innerText = minutes < 10 ? '0' + minutes : minutes;
                secsSpan.innerText = seconds < 10 ? '0' + seconds : seconds;
            }

            // Initial call and run interval
            updateTimer();
            const intervalId = setInterval(updateTimer, 1000);
        }

        // Initialize countdown
        initializeCountdown();


        // -----------------------------------------------------------------
        // ADD TO CALENDAR (ICS FILE GENERATION)
        // -----------------------------------------------------------------
        const addToCalendarBtn = document.getElementById('add-to-calendar-btn');
        if (addToCalendarBtn) {
            addToCalendarBtn.addEventListener('click', () => {
                const title = "Boda Felipe & Camila";
                const description = "Ceremonia Religiosa en Capilla Divina Misericordia y Gala en Centro de Eventos Arboleda Chicureo.";
                const location = "Pudahuel y Chicureo, Santiago, Chile";
                
                // ICS file format
                // Start: Oct 23, 2026, 17:30. End: Oct 24, 2026, 05:00
                const icsContent = [
                    "BEGIN:VCALENDAR",
                    "VERSION:2.0",
                    "PRODID:-//felipeycami.cl//NONSGML Wedding Invite//ES",
                    "BEGIN:VEVENT",
                    "UID:wedding-felipe-camila-2026@felipeycami.cl",
                    "DTSTAMP:20261023T173000Z",
                    "DTSTART:20261023T203000Z", // UTC translation (assuming CLST UTC-3)
                    "DTEND:20261024T080000Z",
                    `SUMMARY:${title}`,
                    `DESCRIPTION:${description}`,
                    `LOCATION:${location}`,
                    "END:VEVENT",
                    "END:VCALENDAR"
                ].join("\r\n");

                const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
                const link = document.createElement('a');
                
                if (navigator.msSaveBlob) { // IE 10+
                    navigator.msSaveBlob(blob, "boda_felipe_y_camila.ics");
                } else {
                    link.href = URL.createObjectURL(blob);
                    link.setAttribute("download", "boda_felipe_y_camila.ics");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            });
        }

    

