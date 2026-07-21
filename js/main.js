// Minimal, Clean JavaScript Bundle — Felipe & Camila (23.10.26)

document.addEventListener('DOMContentLoaded', () => {

    // 1. Toast Notification System
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        const bgColor = type === 'error' ? 'bg-red-700' : 'bg-dark';
        toast.className = `fixed bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full text-light ${bgColor} shadow-xl z-[9999] opacity-0 transition-opacity duration-300 flex items-center gap-2 text-xs font-sans tracking-wide border border-gold/30`;
        
        const icon = type === 'error' ? '<i class="fa-solid fa-circle-exclamation"></i>' : '<i class="fa-solid fa-circle-check"></i>';
        toast.innerHTML = `${icon} <span>${message}</span>`;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.style.opacity = '1', 10);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // 2. Umbral Opening Interaction
    const openBtn = document.getElementById('open-btn');
    const overlay = document.getElementById('envelope-overlay');
    const nav = document.getElementById('main-nav');
    const body = document.body;

    function revealNav() {
        if (nav) {
            nav.classList.remove('-translate-y-full', 'opacity-0');
            nav.classList.add('translate-y-0', 'opacity-100');
        }
    }

    if (openBtn && overlay) {
        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            overlay.style.transform = 'translateY(-100%)';
            setTimeout(() => {
                body.classList.remove('locked');
                revealNav();
            }, 800);
        });
    }

    // Nav Scroll Handling
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50 && nav) {
            nav.classList.add('bg-light/95', 'shadow-sm');
        }
    });

    // 3. Countdown Timer Logic
    const cdDays = document.getElementById('cd-days');
    const cdHours = document.getElementById('cd-hours');
    const cdMinutes = document.getElementById('cd-minutes');
    const cdSeconds = document.getElementById('cd-seconds');
    const countdownContainer = document.getElementById('countdown-container');

    const eventDate = new Date('2026-10-23T17:50:00-03:00').getTime();

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = eventDate - now;

        if (distance < 0) {
            if (countdownContainer) {
                countdownContainer.innerHTML = '<p class="font-serif text-2xl text-gold font-normal tracking-wide">Hoy celebramos.</p>';
            }
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        if (cdDays) cdDays.textContent = String(days).padStart(2, '0');
        if (cdHours) cdHours.textContent = String(hours).padStart(2, '0');
        if (cdMinutes) cdMinutes.textContent = String(minutes).padStart(2, '0');
        if (cdSeconds) cdSeconds.textContent = String(seconds).padStart(2, '0');
    }

    if (cdDays) {
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    // 4. Floating CTA Logic
    const rsvpCta = document.getElementById('rsvp-cta');
    const rsvpSection = document.getElementById('rsvp');
    let rsvpCompleted = false;

    function updateCtaVisibility() {
        if (!rsvpCta || !rsvpSection) return;
        if (rsvpCompleted) {
            rsvpCta.style.transform = 'translateY(200%)';
            return;
        }

        const rect = rsvpSection.getBoundingClientRect();
        const isRsvpVisible = (rect.top <= window.innerHeight * 0.8) && (rect.bottom >= window.innerHeight * 0.2);

        if (isRsvpVisible) {
            rsvpCta.style.transform = 'translateY(200%)';
        } else {
            rsvpCta.style.transform = 'translateY(0)';
        }
    }

    window.addEventListener('scroll', updateCtaVisibility);

    // 5. RSVP Logic & Honest Messaging
    const rsvpForm = document.getElementById('rsvp-form');
    const rsvpSuccess = document.getElementById('rsvp-success');
    const rsvpFormStep = document.getElementById('rsvp-form-step');
    
    const rsvpFirstnameInput = document.getElementById('rsvp-firstname');
    const rsvpLastnameInput = document.getElementById('rsvp-lastname');
    const rsvpWhatsappInput = document.getElementById('rsvp-whatsapp');
    const rsvpDietarySelect = document.getElementById('rsvp-dietary-select');
    const rsvpDietaryDetailInput = document.getElementById('rsvp-dietary-detail');
    const rsvpDietaryDetailSection = document.getElementById('rsvp-dietary-details-section');

    const NOVIOS_PHONE = '56981393436'; 
    const attendanceRadios = document.getElementsByName('rsvp-attendance');
    const dietaryFlagGroup = document.getElementById('rsvp-dietary-flag-group');

    function handleAttendanceChange() {
        let isAttending = true;
        for (const radio of attendanceRadios) {
            if (radio.checked && radio.value === 'no') {
                isAttending = false;
            }
        }

        if (isAttending) {
            if (dietaryFlagGroup) dietaryFlagGroup.classList.remove('hidden');
            if (rsvpDietarySelect && (rsvpDietarySelect.value === 'Alergias' || rsvpDietarySelect.value === 'Otra')) {
                if (rsvpDietaryDetailSection) rsvpDietaryDetailSection.classList.remove('hidden');
                if (rsvpDietaryDetailInput) rsvpDietaryDetailInput.required = true;
            }
        } else {
            if (dietaryFlagGroup) dietaryFlagGroup.classList.add('hidden');
            if (rsvpDietaryDetailSection) rsvpDietaryDetailSection.classList.add('hidden');
            if (rsvpDietaryDetailInput) {
                rsvpDietaryDetailInput.required = false;
                rsvpDietaryDetailInput.value = '';
            }
        }
    }

    for (const radio of attendanceRadios) {
        radio.addEventListener('change', handleAttendanceChange);
    }

    if (rsvpDietarySelect) {
        rsvpDietarySelect.addEventListener('change', () => {
            if (rsvpDietarySelect.value === 'Alergias' || rsvpDietarySelect.value === 'Otra') {
                if (rsvpDietaryDetailSection) rsvpDietaryDetailSection.classList.remove('hidden');
                if (rsvpDietaryDetailInput) {
                    rsvpDietaryDetailInput.required = true;
                    rsvpDietaryDetailInput.placeholder = "Ej: alergia al maní, intolerancia a la lactosa u otra indicación.";
                }
            } else {
                if (rsvpDietaryDetailSection) rsvpDietaryDetailSection.classList.add('hidden');
                if (rsvpDietaryDetailInput) {
                    rsvpDietaryDetailInput.required = false;
                    rsvpDietaryDetailInput.value = '';
                }
            }
        });
    }

    // Clipboard Copy Helper
    function runFallbackCopy(text, resolve, reject) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            const successful = document.execCommand('copy');
            textarea.remove();
            if (successful) resolve();
            else reject(new Error('Fallback copy command failed'));
        } catch (err) {
            textarea.remove();
            reject(err);
        }
    }

    function copyTextToClipboard(text) {
        return new Promise((resolve, reject) => {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text)
                    .then(resolve)
                    .catch(() => runFallbackCopy(text, resolve, reject));
            } else {
                runFallbackCopy(text, resolve, reject);
            }
        });
    }

    if (rsvpForm) {
        rsvpForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const firstName = rsvpFirstnameInput.value.trim();
            const lastName = rsvpLastnameInput.value.trim();
            const whatsapp = rsvpWhatsappInput.value.trim();
            
            let isAttending = true;
            for (const radio of attendanceRadios) {
                if (radio.checked && radio.value === 'no') {
                    isAttending = false;
                }
            }

            let dietary = 'Ninguna';
            if (isAttending) {
                if (rsvpDietarySelect.value === 'Alergias' || rsvpDietarySelect.value === 'Otra') {
                    const detail = rsvpDietaryDetailInput.value.trim();
                    if (!detail || detail.toLowerCase() === 'alergias' || detail.toLowerCase() === 'otra') {
                        showToast('Por favor cuéntanos el detalle de tu restricción alimentaria.', 'error');
                        rsvpDietaryDetailInput.focus();
                        return;
                    }
                    dietary = detail;
                } else {
                    dietary = rsvpDietarySelect.value;
                }
            }

            let whatsappMsg = '';
            if (isAttending) {
                whatsappMsg = `Hola, soy ${firstName} ${lastName}. Confirmo mi asistencia al matrimonio de Felipe y Camila el 23 de octubre de 2026. Mi restricción alimentaria es: ${dietary}. Mi WhatsApp de contacto es: ${whatsapp}.`;
            } else {
                whatsappMsg = `Hola, soy ${firstName} ${lastName}. Lamentablemente no podré asistir al matrimonio de Felipe y Camila el 23 de octubre de 2026. Mi WhatsApp de contacto es: ${whatsapp}.`;
            }

            const whatsappUrl = `https://wa.me/${NOVIOS_PHONE}?text=${encodeURIComponent(whatsappMsg)}`;

            const summaryName = document.getElementById('summary-name');
            const summaryWhatsapp = document.getElementById('summary-whatsapp');
            const summaryAttendance = document.getElementById('summary-attendance');
            const summaryDietary = document.getElementById('summary-dietary');
            const summaryDietaryRow = document.getElementById('summary-dietary-row');

            if (summaryName) summaryName.textContent = `${firstName} ${lastName}`;
            if (summaryWhatsapp) summaryWhatsapp.textContent = whatsapp;
            if (summaryAttendance) summaryAttendance.textContent = isAttending ? 'Sí, asistiré' : 'No podré asistir';
            
            if (isAttending) {
                if (summaryDietaryRow) summaryDietaryRow.classList.remove('hidden');
                if (summaryDietary) summaryDietary.textContent = dietary;
            } else {
                if (summaryDietaryRow) summaryDietaryRow.classList.add('hidden');
            }

            const whatsappShareBtn = document.getElementById('rsvp-whatsapp-share-btn');
            if (whatsappShareBtn) whatsappShareBtn.href = whatsappUrl;

            const copyBtn = document.getElementById('rsvp-copy-msg-btn');
            if (copyBtn) {
                copyBtn.onclick = () => {
                    copyTextToClipboard(whatsappMsg).then(() => {
                        showToast('Respuesta copiada al portapapeles', 'success');
                    }).catch(() => {
                        showToast('No se pudo copiar automáticamente', 'error');
                    });
                };
            }

            if (rsvpFormStep) rsvpFormStep.classList.add('hidden');
            if (rsvpSuccess) rsvpSuccess.classList.remove('hidden');

            rsvpCompleted = true;
            updateCtaVisibility();
        });
    }

    // RSVP Edit Button
    const editBtn = document.getElementById('rsvp-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            rsvpCompleted = false;
            if (rsvpSuccess) rsvpSuccess.classList.add('hidden');
            if (rsvpFormStep) rsvpFormStep.classList.remove('hidden');
            updateCtaVisibility();
        });
    }

    // RSVP Another Button
    const anotherBtn = document.getElementById('rsvp-another-btn');
    if (anotherBtn) {
        anotherBtn.addEventListener('click', () => {
            rsvpCompleted = false;
            if (rsvpForm) rsvpForm.reset();
            handleAttendanceChange();
            if (rsvpSuccess) rsvpSuccess.classList.add('hidden');
            if (rsvpFormStep) rsvpFormStep.classList.remove('hidden');
            if (rsvpForm) rsvpForm.scrollIntoView({ behavior: 'smooth' });
            updateCtaVisibility();
        });
    }

    // 6. Curated Photo Loading Logic
    async function loadCuratedPhotos() {
        try {
            // Load Hero & Historia
            const heroStoryRes = await fetch('js/hero_story.json');
            if (heroStoryRes.ok) {
                const heroStoryData = await heroStoryRes.json();
                
                // Set Hero image if present
                if (heroStoryData.hero && heroStoryData.hero.length > 0) {
                    const heroImg = document.getElementById('hero-img');
                    if (heroImg) heroImg.src = heroStoryData.hero[0].src;
                }

                // Render Historia images (4 photos)
                const historiaGrid = document.getElementById('historia-grid');
                if (historiaGrid && heroStoryData.historia) {
                    historiaGrid.innerHTML = '';
                    heroStoryData.historia.forEach((item) => {
                        const div = document.createElement('div');
                        div.className = 'aspect-[4/3] overflow-hidden bg-cream border border-dark/10 shadow-sm rounded-sm';
                        div.innerHTML = `<img src="${item.src}" alt="${item.alt || 'Nuestra historia'}" loading="lazy" decoding="async" class="w-full h-full object-cover">`;
                        historiaGrid.appendChild(div);
                    });
                }
            }

            // Load Civil Rail (8 photos)
            const civilRes = await fetch('js/civil_featured.json');
            if (civilRes.ok) {
                const civilData = await civilRes.json();
                const civilRail = document.getElementById('civil-rail');
                if (civilRail && Array.isArray(civilData)) {
                    civilRail.innerHTML = '';
                    civilData.forEach((item) => {
                        const div = document.createElement('div');
                        div.className = 'rail-item overflow-hidden bg-light border border-dark/10 rounded-sm';
                        div.innerHTML = `<img src="${item.src}" alt="${item.alt || 'Nuestro civil'}" loading="lazy" decoding="async" class="w-full h-full object-cover">`;
                        civilRail.appendChild(div);
                    });
                    setupRail('civil-rail', 'civil-prev-btn', 'civil-next-btn', 'civil-counter');
                }
            }

            // Load Shared Rail (8 photos)
            const sharedRes = await fetch('js/guest_shared.json');
            if (sharedRes.ok) {
                const sharedData = await sharedRes.json();
                const sharedRail = document.getElementById('shared-rail');
                if (sharedRail && Array.isArray(sharedData)) {
                    sharedRail.innerHTML = '';
                    sharedData.forEach((item) => {
                        const div = document.createElement('div');
                        div.className = 'rail-item overflow-hidden bg-cream border border-dark/10 rounded-sm';
                        div.innerHTML = `<img src="${item.src}" alt="${item.alt || 'Fotos compartidas'}" loading="lazy" decoding="async" class="w-full h-full object-cover">`;
                        sharedRail.appendChild(div);
                    });
                    setupRail('shared-rail', 'shared-prev-btn', 'shared-next-btn', 'shared-counter');
                }
            }
        } catch (e) {
            console.error('Error loading curated photos:', e);
        }
    }

    // 7. Setup Rail Helper
    function setupRail(railId, prevBtnId, nextBtnId, counterId) {
        const rail = document.getElementById(railId);
        const prevBtn = document.getElementById(prevBtnId);
        const nextBtn = document.getElementById(nextBtnId);
        const counter = document.getElementById(counterId);

        if (!rail || rail.children.length === 0) return;

        const totalItems = rail.children.length;

        function updateCounter() {
            const itemWidth = rail.children[0].getBoundingClientRect().width + 24;
            const currentIndex = Math.min(Math.round(rail.scrollLeft / itemWidth) + 1, totalItems);
            if (counter) counter.textContent = `${String(currentIndex).padStart(2, '0')} / ${String(totalItems).padStart(2, '0')}`;
        }

        rail.addEventListener('scroll', updateCounter);

        if (nextBtn) {
            nextBtn.onclick = () => {
                const itemWidth = rail.children[0].getBoundingClientRect().width + 24;
                rail.scrollBy({ left: itemWidth, behavior: 'smooth' });
            };
        }

        if (prevBtn) {
            prevBtn.onclick = () => {
                const itemWidth = rail.children[0].getBoundingClientRect().width + 24;
                rail.scrollBy({ left: -itemWidth, behavior: 'smooth' });
            };
        }

        rail.addEventListener('keydown', (e) => {
            const itemWidth = rail.children[0].getBoundingClientRect().width + 24;
            if (e.key === 'ArrowRight') {
                rail.scrollBy({ left: itemWidth, behavior: 'smooth' });
            } else if (e.key === 'ArrowLeft') {
                rail.scrollBy({ left: -itemWidth, behavior: 'smooth' });
            }
        });

        updateCounter();
    }

    loadCuratedPhotos();

});
