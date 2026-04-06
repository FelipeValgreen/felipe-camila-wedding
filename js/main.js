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


        const instaScroll = document.getElementById('insta-scroll');
        const dots = document.querySelectorAll('#instagram .rounded-full'); // Select dots within Instagram section

        if (instaScroll && dots.length === 2) {
            instaScroll.addEventListener('scroll', () => {
                const scrollPosition = instaScroll.scrollLeft;
                const width = instaScroll.clientWidth;
                const index = Math.round(scrollPosition / width);

                // Update dots
                if (index === 0) {
                    dots[0].classList.remove('bg-gray-300');
                    dots[0].classList.add('bg-charcoal');
                    dots[1].classList.remove('bg-charcoal');
                    dots[1].classList.add('bg-gray-300');
                } else {
                    dots[0].classList.remove('bg-charcoal');
                    dots[0].classList.add('bg-gray-300');
                    dots[1].classList.remove('bg-gray-300');
                    dots[1].classList.add('bg-charcoal');
                }
            });
        }
    

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
    


        // 1. Cinematic Intro & Navigation Reveal
        const overlay = document.getElementById('cinematic-fade');
        const body = document.body;
        const nav = document.getElementById('main-nav');

        document.addEventListener('DOMContentLoaded', () => {
            // Wait slightly then fade out full white screen
            setTimeout(() => {
                if(overlay) overlay.style.opacity = '0';
                if(nav) {
                    nav.classList.remove('-translate-y-full', 'opacity-0');
                    nav.classList.add('translate-y-0', 'opacity-100');
                }
                checkReveal(); // Trigger reveal for Hero section
            }, 500);
        });

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

                // Limit exactly to 8 dynamic photos (9 total with the static prompt)
                const slicedInstaData = uniqueInstaData.slice(0, 8);

                const instaHtml = slicedInstaData.map((photo, index) => {
                    // Create an asymmetrical layout natively in CSS Grid
                    let layoutClass = "aspect-square";
                    if (index === 0) layoutClass = "col-span-2 row-span-2 aspect-auto border-0";
                    else if (index === 4) layoutClass = "col-span-2 aspect-[2/1] border-0";

                    return `
                    <div onclick="if(window.openLightbox) window.openLightbox('${photo.url}', '${(photo.uploader_name || 'Anónimo').replace(/'/g, "\\'")}')" class="dynamic-photo ${layoutClass} overflow-hidden relative group cursor-pointer bg-gray-100">
                        <img src="${photo.url}" 
                             class="w-full h-full object-cover grayscale opacity-90 transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0 group-hover:opacity-100" 
                             alt="Guest Photo"
                             onerror="this.closest('.dynamic-photo').remove()">
                        <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center">
                            <i class="fa-brands fa-instagram text-white/80 text-xl font-light"></i>
                        </div>
                    </div>
                `}).join('');

                instaFeed.insertAdjacentHTML('beforeend', instaHtml);
            }

            // B. Populate Guest Carousel has been removed.
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
                    } else {
                        alert('Hubo un error al enviar tu confirmación. Por favor, intenta de nuevo.');
                    }

                } catch (error) {
                    console.error('Critical Error:', error);
                    alert('Hubo un error inesperado. Por favor, intenta de nuevo.');
                }

                submitBtn.disabled = false;
                submitBtn.innerHTML = 'De ahí somos!';
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
                const uploaderWhatsapp = document.getElementById('uploader-whatsapp').value;

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
                    document.getElementById('uploader-whatsapp').value = '';

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
            const listContainer = document.getElementById('song-requests-list');
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
                            <p class="text-white/60 text-xs">${req.artist || ''}</p>
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

            // IDs in HTML are: dj-song, (no artist input in HTML?), dj-name
            // Wait, looking at HTML (Line 1125 in previous snippet):
            // <input type="text" id="dj-song" ... > placeholder="Ej: Dancing Queen - ABBA"
            // <input type="text" id="dj-name" ... >
            // So there is NO separate artist input. The placeholder implies "Song - Artist".
            // My previous script (Step 511 view) tried getting 'song-name', 'artist-name' which don't exist in HTML.

            const songInput = document.getElementById('dj-song');
            const nameInput = document.getElementById('dj-name');

            const songValue = songInput.value;
            const nameValue = nameInput.value;

            // Split song/artist if hyphen present? Optional but nice.
            // For now just save full string as song_name.

            const btn = document.getElementById('dj-submit-btn');
            const originalBtnContent = btn.innerHTML;
            const successMsg = document.getElementById('dj-success');

            if (!songValue || !nameValue) {
                alert('Por favor completa todos los campos.');
                return;
            }

            // UI Loading
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Enviando...';

            try {
                // 1. Save to Supabase (Database)
                // We pass songValue as songName. Artist empty.
                const { error } = await window.saveSongRequest(songValue, '', nameValue);
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

    

