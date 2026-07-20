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
                    cta.style.transform = 'translateY(200%)';
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
                        await loadGallery(true);
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
        let galleryPhotosCache = null; 
        let currentActiveFilter = 'civil';

        const DEFAULT_PHOTOS = [
            { url: 'images/uploaded_image_3_1764298805324.jpg', uploader_name: 'Felipe & Camila', event_type: 'civil', album: 'Nuestro civil', created_at: '2025-05-10T12:00:00Z' },
            { url: 'images/uploaded_image_4_1764298805324.jpg', uploader_name: 'Felipe & Camila', event_type: 'civil', album: 'Nuestro civil', created_at: '2025-05-10T12:05:00Z' },
            { url: 'images/insta_wedding_selfie.jpg', uploader_name: 'Felipe & Camila', event_type: 'civil', album: 'Nuestro civil', created_at: '2025-05-10T12:10:00Z' },
            { url: 'images/insta_formal_selfie.jpg', uploader_name: 'Felipe & Camila', event_type: 'civil', album: 'Nuestro civil', created_at: '2025-05-10T12:15:00Z' },
            { url: 'images/insta_formal_group.jpg', uploader_name: 'Felipe & Camila', event_type: 'civil', album: 'Nuestro civil', created_at: '2025-05-10T12:20:00Z' },
            { url: 'images/new_story_1.jpg', uploader_name: 'Felipe & Camila', event_type: 'preparativos', album: 'Preparativos', created_at: '2026-01-15T15:00:00Z' },
            { url: 'images/new_story_2.jpg', uploader_name: 'Felipe & Camila', event_type: 'preparativos', album: 'Preparativos', created_at: '2026-02-20T16:00:00Z' },
            { url: 'images/new_story_3.jpg', uploader_name: 'Felipe & Camila', event_type: 'preparativos', album: 'Preparativos', created_at: '2026-03-10T17:00:00Z' },
            { url: 'images/iglesia_bw.jpg', uploader_name: 'Felipe & Camila', event_type: 'iglesia', album: 'Iglesia 2026', created_at: '2026-07-01T10:00:00Z' },
            { url: 'images/guest_example_1.jpg', uploader_name: 'Familia', event_type: 'general', album: 'Invitados', created_at: '2026-07-20T14:00:00Z' },
            { url: 'images/guest_example_2.jpg', uploader_name: 'Amigos', event_type: 'general', album: 'Invitados', created_at: '2026-07-20T14:10:00Z' },
            { url: 'images/guest_example_3.jpg', uploader_name: 'Colegas', event_type: 'general', album: 'Invitados', created_at: '2026-07-20T14:20:00Z' }
        ];

        async function loadGallery(forceRefresh = false) {
            const instaFeed = document.getElementById('instagram-feed');
            const masonryFeed = document.getElementById('masonry-gallery');
            const galleryEmpty = document.getElementById('gallery-empty');

            // 1. Fetch from Supabase if not cached or forceRefresh is true
            if (forceRefresh || !galleryPhotosCache) {
                let dbPhotos = [];
                if (window.supabaseClient && typeof window.fetchGuestPhotos === 'function') {
                    try {
                        const response = await window.fetchGuestPhotos();
                        if (response.data) {
                            dbPhotos = response.data.map(p => ({
                                url: p.url,
                                uploader_name: p.uploader_name || 'Invitado',
                                event_type: p.event_type || 'general',
                                album: p.album || 'Invitados',
                                created_at: p.created_at || new Date().toISOString()
                            }));
                        }
                    } catch (err) {
                        console.error('Error loading photos from Supabase:', err);
                    }
                }

                // Merge and deduplicate
                const allMerged = [...dbPhotos, ...DEFAULT_PHOTOS];
                const seenUrls = new Set();
                const uniquePhotos = allMerged.filter(photo => {
                    if (seenUrls.has(photo.url)) return false;
                    seenUrls.add(photo.url);
                    return true;
                });

                // Sort newest first
                uniquePhotos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                galleryPhotosCache = uniquePhotos;
            }

            const photos = galleryPhotosCache;

            // 2. Filter photos for Masonry Grid
            let filteredPhotos = photos;
            if (currentActiveFilter !== 'all') {
                filteredPhotos = photos.filter(p => {
                    if (currentActiveFilter === 'civil') return p.event_type === 'civil';
                    if (currentActiveFilter === 'preparativos') return p.event_type === 'preparativos';
                    if (currentActiveFilter === 'iglesia') return p.event_type === 'iglesia';
                    if (currentActiveFilter === 'invitados') {
                        return p.event_type === 'general' || p.event_type === 'invitados' || p.album === 'Invitados';
                    }
                    return true;
                });
            }

            // 3. Populate Instagram Feed (Show Civil + Guest photos in bottom slider)
            if (instaFeed) {
                const existingDynamicInsta = instaFeed.querySelectorAll('.dynamic-photo');
                existingDynamicInsta.forEach(el => el.remove());

                // Show up to 24 photos
                const slicedInsta = photos.filter(p => p.event_type === 'civil' || p.event_type === 'general').slice(0, 24);
                const instaHtml = slicedInsta.map(photo => `
                    <div onclick="if(window.openLightbox) window.openLightbox('${photo.url}', '${(photo.uploader_name || 'Anónimo').replace(/'/g, "\\'")}')" class="dynamic-photo w-[280px] flex-shrink-0 snap-start aspect-[4/5] overflow-hidden relative group cursor-pointer bg-gray-100 shadow-sm border border-gray-100">
                        <img src="${photo.url}" 
                             class="w-full h-full object-cover grayscale opacity-90 transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0 group-hover:opacity-100" 
                             alt="Foto de Boda"
                             loading="lazy"
                             onerror="this.closest('.dynamic-photo').remove()">
                        <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center">
                            <i class="fa-brands fa-instagram text-white/80 text-3xl font-light drop-shadow-md"></i>
                        </div>
                    </div>
                `).join('');
                instaFeed.insertAdjacentHTML('beforeend', instaHtml);
            }

            // 4. Populate Masonry Grid (Main Gallery)
            if (masonryFeed) {
                masonryFeed.innerHTML = '';
                if (filteredPhotos.length > 0) {
                    const masonryHtml = filteredPhotos.map(photo => `
                        <div onclick="if(window.openLightbox) window.openLightbox('${photo.url}', '${(photo.uploader_name || 'Anónimo').replace(/'/g, "\\'")}')" class="break-inside-avoid mb-4 group relative overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer shadow-sm rounded-sm">
                            <img src="${photo.url}" 
                                 class="w-full object-cover grayscale opacity-95 group-hover:scale-[1.02] group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" 
                                 alt="Foto de Boda"
                                 loading="lazy"
                                 onerror="this.closest('.break-inside-avoid').remove()">
                            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between">
                                <span class="text-white text-[10px] font-sans truncate">${photo.uploader_name || 'Invitado'}</span>
                                <i class="fa-solid fa-magnifying-glass-plus text-white/80 text-[10px]"></i>
                            </div>
                        </div>
                    `).join('');
                    masonryFeed.innerHTML = masonryHtml;
                    if (galleryEmpty) galleryEmpty.classList.add('hidden');
                } else {
                    if (galleryEmpty) galleryEmpty.classList.remove('hidden');
                }
            }
        }

        // Setup Filter Click Handlers
        const filterBtns = document.querySelectorAll('.gallery-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filterValue = btn.dataset.filter;
                currentActiveFilter = filterValue;

                // Update active buttons styling
                filterBtns.forEach(b => {
                    b.classList.remove('bg-charcoal', 'text-white');
                    b.classList.add('text-gray-500');
                });
                btn.classList.add('bg-charcoal', 'text-white');
                btn.classList.remove('text-gray-500');

                // Reload without network request
                loadGallery(false);
            });
        });

        // -----------------------------------------------------------------
        // RSVP SYSTEM (CODES & PERSONAL AUTOFILL FLOW)
        // -----------------------------------------------------------------
        const rsvpForm = document.getElementById('rsvp-form');
        const rsvpSuccess = document.getElementById('rsvp-success');
        const rsvpCodeStep = document.getElementById('rsvp-code-step');
        const rsvpFormStep = document.getElementById('rsvp-form-step');
        
        const rsvpCodeInput = document.getElementById('rsvp-code-input');
        const rsvpValidateBtn = document.getElementById('rsvp-validate-code-btn');
        const rsvpCodeError = document.getElementById('rsvp-code-error');
        
        const rsvpGreeting = document.getElementById('rsvp-greeting');
        const rsvpFirstnameInput = document.getElementById('rsvp-firstname');
        const rsvpLastnameInput = document.getElementById('rsvp-lastname');
        const rsvpPassesInput = document.getElementById('rsvp-passes');
        const rsvpWhatsappInput = document.getElementById('rsvp-whatsapp');
        const rsvpDietarySelect = document.getElementById('rsvp-dietary-select');
        const rsvpDietaryDetailInput = document.getElementById('rsvp-dietary-detail');
        const rsvpDietaryDetailSection = document.getElementById('rsvp-dietary-details-section');
        const rsvpBackToCodeBtn = document.getElementById('rsvp-back-to-code-btn');

        // Configurable Phone Number of the Bride and Groom (replace with real number, e.g. 56912345678)
        const NOVIOS_PHONE = '56912345678'; 

        // Local Fallback Guest Codes for testing or demo purposes
        const GUEST_CODES_FALLBACK = {
            "FAM2026": { first_name: "Juan", last_name: "Valverde", passes: 4 },
            "AMI2026": { first_name: "Camila", last_name: "Andrade", passes: 2 },
            "VIP2026": { first_name: "Felipe", last_name: "Mendoza", passes: 1 },
            "COLE2026": { first_name: "Sofía", last_name: "Castro", passes: 3 }
        };

        // Code Validation Handler
        async function validateInvitationCode() {
            if (!rsvpCodeInput) return;
            const code = rsvpCodeInput.value.toUpperCase().trim();
            if (!code) return;

            rsvpValidateBtn.disabled = true;
            rsvpValidateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Validando...';

            let guestData = null;

            // 1. Try querying Supabase
            if (typeof window.getGuestByCode === 'function') {
                try {
                    const { data, error } = await window.getGuestByCode(code);
                    if (data && !error) {
                        guestData = {
                            first_name: data.first_name || data.nombre || '',
                            last_name: data.last_name || data.apellido || '',
                            passes: data.passes !== undefined ? data.passes : (data.pases !== undefined ? data.pases : 1)
                        };
                    }
                } catch (err) {
                    console.error('Supabase fetch failed, trying local fallback:', err);
                }
            }

            // 2. Try local fallback dictionary if not found in database
            if (!guestData) {
                if (GUEST_CODES_FALLBACK[code]) {
                    guestData = GUEST_CODES_FALLBACK[code];
                }
            }

            rsvpValidateBtn.disabled = false;
            rsvpValidateBtn.innerHTML = 'Validar Código';

            if (guestData) {
                // Populate fields
                rsvpFirstnameInput.value = guestData.first_name;
                rsvpLastnameInput.value = guestData.last_name;
                rsvpPassesInput.value = guestData.passes;
                rsvpGreeting.innerHTML = `¡Hola ${guestData.first_name} ${guestData.last_name}!`;
                
                // Show form and hide code screen
                if (rsvpCodeError) rsvpCodeError.classList.add('hidden');
                if (rsvpCodeStep) rsvpCodeStep.classList.add('hidden');
                if (rsvpFormStep) rsvpFormStep.classList.remove('hidden');
            } else {
                if (rsvpCodeError) rsvpCodeError.classList.remove('hidden');
            }
        }

        if (rsvpValidateBtn) {
            rsvpValidateBtn.addEventListener('click', validateInvitationCode);
        }
        if (rsvpCodeInput) {
            rsvpCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') validateInvitationCode();
            });
        }

        // Back to Code Screen Button
        if (rsvpBackToCodeBtn) {
            rsvpBackToCodeBtn.addEventListener('click', () => {
                if (rsvpFormStep) rsvpFormStep.classList.add('hidden');
                if (rsvpCodeStep) rsvpCodeStep.classList.remove('hidden');
                if (rsvpCodeInput) rsvpCodeInput.value = '';
                if (rsvpCodeError) rsvpCodeError.classList.add('hidden');
            });
        }

        // Toggle dietary specification input visibility
        if (rsvpDietarySelect) {
            rsvpDietarySelect.addEventListener('change', () => {
                if (rsvpDietarySelect.value === 'Alergias') {
                    if (rsvpDietaryDetailSection) rsvpDietaryDetailSection.classList.remove('hidden');
                } else {
                    if (rsvpDietaryDetailSection) rsvpDietaryDetailSection.classList.add('hidden');
                    if (rsvpDietaryDetailInput) rsvpDietaryDetailInput.value = '';
                }
            });
        }

        // Handle Form Submit
        if (rsvpForm) {
            rsvpForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const firstName = rsvpFirstnameInput.value;
                const lastName = rsvpLastnameInput.value;
                const passes = rsvpPassesInput.value;
                const whatsapp = rsvpWhatsappInput.value.trim();
                
                let isAttending = true;
                const attendanceRadios = document.getElementsByName('rsvp-attendance');
                for (const radio of attendanceRadios) {
                    if (radio.checked && radio.value === 'no') {
                        isAttending = false;
                    }
                }

                // Determine dietary restriction string
                let dietary = 'Ninguna';
                if (isAttending) {
                    if (rsvpDietarySelect.value === 'Alergias') {
                        dietary = rsvpDietaryDetailInput.value.trim() || 'Alergias';
                    } else {
                        dietary = rsvpDietarySelect.value;
                    }
                } else {
                    dietary = 'NO ASISTIRÁ';
                }

                const submitBtn = document.getElementById('rsvp-submit-btn');
                const originalText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = 'Procesando...';

                // WhatsApp message generation
                let whatsappMsg = '';
                if (isAttending) {
                    whatsappMsg = `¡Hola! Confirmo mi asistencia a la boda. Soy ${firstName} ${lastName}. Mi restricción alimentaria es: ${dietary}.`;
                } else {
                    whatsappMsg = `¡Hola! Lamentablemente no podré asistir a la boda. Soy ${firstName} ${lastName}.`;
                }
                const whatsappUrl = `https://wa.me/${NOVIOS_PHONE}?text=${encodeURIComponent(whatsappMsg)}`;

                // Send email notification using Web3Forms
                const formData = new FormData();
                formData.append('access_key', '138e83f9-894d-4a94-bee4-af9392f8ffb9');
                formData.append('subject', `Confirmación Boda (${isAttending ? 'SÍ' : 'NO'}): ${firstName} ${lastName}`);
                formData.append('from_name', 'Sitio Oficial Boda');
                formData.append('to_email', 'camilayfelipe.v@gmail.com');

                let message = `Nombre: ${firstName} ${lastName}\n`;
                message += `Pases Asignados: ${passes}\n`;
                message += `Asistencia: ${isAttending ? 'SÍ, asistirá' : 'NO asistirá'}\n`;
                message += `Restricción Alimentaria: ${dietary}\n`;
                message += `WhatsApp: ${whatsapp}`;
                formData.append('message', message);

                const rsvpData = {
                    name: `${firstName} ${lastName}`,
                    email: '',
                    whatsapp,
                    has_partner: false,
                    partner_name: '',
                    dietary_restrictions: dietary,
                    partner_dietary: '',
                    created_at: new Date().toISOString()
                };

                try {
                    // Send notification email
                    const emailPromise = fetch('https://api.web3forms.com/submit', {
                        method: 'POST',
                        body: formData
                    });

                    // Save confirmation to Supabase
                    const dbPromise = window.saveRSVP ? window.saveRSVP(rsvpData) : Promise.resolve({ error: 'Supabase func missing' });

                    // Execute both in parallel
                    await Promise.allSettled([emailPromise, dbPromise]);

                    // Fire Confetti on success
                    if (typeof confetti === 'function') {
                        confetti({
                            particleCount: 120,
                            spread: 70,
                            origin: { y: 0.6 }
                        });
                    }

                    // Show success screen and configure whatsapp button
                    if (rsvpFormStep) rsvpFormStep.classList.add('hidden');
                    if (rsvpSuccess) rsvpSuccess.classList.remove('hidden');

                    const whatsappShareBtn = document.getElementById('rsvp-whatsapp-share-btn');
                    if (whatsappShareBtn) {
                        whatsappShareBtn.href = whatsappUrl;
                    }

                    // Open WhatsApp automatically
                    window.open(whatsappUrl, '_blank');

                } catch (error) {
                    console.error('RSVP submission error:', error);
                    // Fallback to open WhatsApp anyway
                    window.open(whatsappUrl, '_blank');
                }

                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
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
                        loadGallery(true);
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
                const description = "Ceremonia Religiosa en el Santuario de la Divina Misericordia y Gala en Centro de Eventos Arboleda Chicureo.";
                const location = "Santuario de la Divina Misericordia (Colina) y Centro de Eventos Arboleda (Chicureo), Chile";
                
                // ICS file format
                // Start: Oct 23, 2026, 17:50. End: Oct 24, 2026, 05:00
                const icsContent = [
                    "BEGIN:VCALENDAR",
                    "VERSION:2.0",
                    "PRODID:-//felipeycami.cl//NONSGML Wedding Invite//ES",
                    "BEGIN:VEVENT",
                    "UID:wedding-felipe-camila-2026@felipeycami.cl",
                    "DTSTAMP:20261023T175000Z",
                    "DTSTART:20261023T205000Z", // UTC translation (assuming CLST UTC-3)
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

    

