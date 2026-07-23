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

    // Mobile Navigation Drawer Toggle & Accessibility Controls
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.nav-mobile-link');

    function closeMobileMenu() {
        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
            mobileMenu.classList.add('hidden');
            if (mobileMenuBtn) {
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                mobileMenuBtn.focus();
            }
        }
    }

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
            mobileMenuBtn.setAttribute('aria-expanded', String(!isExpanded));
            mobileMenu.classList.toggle('hidden');
        });

        mobileLinks.forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMobileMenu();
        });

        document.addEventListener('click', (e) => {
            if (!mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                closeMobileMenu();
            }
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

    // 5. Unified Web RSVP Submission & Direct Registration
    const rsvpForm = document.getElementById('rsvp-form');
    const rsvpSuccess = document.getElementById('rsvp-success');
    const rsvpFormStep = document.getElementById('rsvp-form-step');
    const rsvpSubmitBtn = document.getElementById('rsvp-submit-btn');
    
    const rsvpFirstnameInput = document.getElementById('rsvp-firstname');
    const rsvpLastnameInput = document.getElementById('rsvp-lastname');
    const rsvpWhatsappInput = document.getElementById('rsvp-whatsapp');
    const rsvpWebsiteField = document.getElementById('rsvp-website-field');
    const rsvpDietarySelect = document.getElementById('rsvp-dietary-select');
    const rsvpDietaryDetailInput = document.getElementById('rsvp-dietary-detail');
    const rsvpDietaryDetailSection = document.getElementById('rsvp-dietary-details-section');

    const attendanceRadios = document.getElementsByName('rsvp-attendance');
    const dietaryFlagGroup = document.getElementById('rsvp-dietary-flag-group');

    let currentRSVPId = localStorage.getItem('rsvp_id') || null;
    let currentManageToken = localStorage.getItem('rsvp_manage_token') || null;
    let isExplicitUpdateMode = false;

    // Page Load Safe RSVP Restoration via action=read
    async function restoreRSVPSessionOnLoad() {
        if (!currentRSVPId || !currentManageToken) return;

        try {
            const response = await fetch('/api/rsvp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'read',
                    rsvp_id: currentRSVPId,
                    manage_token: currentManageToken
                })
            });

            const data = await response.json();
            if (response.ok && data.ok && data.rsvp) {
                const rsvp = data.rsvp;
                if (rsvpFirstnameInput) rsvpFirstnameInput.value = rsvp.first_name || '';
                if (rsvpLastnameInput) rsvpLastnameInput.value = rsvp.last_name || '';
                if (rsvpWhatsappInput) rsvpWhatsappInput.value = rsvp.phone_e164 || '';

                for (const radio of attendanceRadios) {
                    radio.checked = (radio.value === rsvp.attendance_status);
                }
                handleAttendanceChange();

                if (rsvp.attendance_status === 'attending' && rsvp.dietary_type && rsvpDietarySelect) {
                    rsvpDietarySelect.value = rsvp.dietary_type;
                    if (rsvp.dietary_detail && rsvpDietaryDetailInput) {
                        rsvpDietaryDetailInput.value = rsvp.dietary_detail;
                    }
                }

                // Show summary state
                const summaryName = document.getElementById('summary-name');
                const summaryAttendance = document.getElementById('summary-attendance');
                const summaryDietary = document.getElementById('summary-dietary');
                const summaryDietaryRow = document.getElementById('summary-dietary-row');

                if (summaryName) summaryName.textContent = `${rsvp.first_name} ${rsvp.last_name}`;
                let attendanceLabel = 'Sí, asistiré';
                if (rsvp.attendance_status === 'not_attending') attendanceLabel = 'No podré asistir';
                if (rsvp.attendance_status === 'pending') attendanceLabel = 'Todavía no puedo confirmar';
                if (summaryAttendance) summaryAttendance.textContent = attendanceLabel;

                if (rsvp.attendance_status === 'attending') {
                    if (summaryDietaryRow) summaryDietaryRow.classList.remove('hidden');
                    if (summaryDietary) summaryDietary.textContent = rsvp.dietary_detail || rsvp.dietary_type || 'Ninguna';
                } else {
                    if (summaryDietaryRow) summaryDietaryRow.classList.add('hidden');
                }

                if (rsvpFormStep) rsvpFormStep.classList.add('hidden');
                if (rsvpSuccess) rsvpSuccess.classList.remove('hidden');
                rsvpCompleted = true;
                isExplicitUpdateMode = true;
                updateCtaVisibility();
            } else {
                // Verification failed -> clear stale tokens
                currentRSVPId = null;
                currentManageToken = null;
                localStorage.removeItem('rsvp_id');
                localStorage.removeItem('rsvp_manage_token');
            }
        } catch (e) {
            console.warn('RSVP session restore warning:', e);
        }
    }
    restoreRSVPSessionOnLoad();

    function handleAttendanceChange() {
        let selectedValue = 'attending';
        for (const radio of attendanceRadios) {
            if (radio.checked) {
                selectedValue = radio.value;
            }
        }

        if (selectedValue === 'attending') {
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

    if (rsvpForm) {
        rsvpForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const firstName = rsvpFirstnameInput.value.trim();
            const lastName = rsvpLastnameInput.value.trim();
            const rawPhone = rsvpWhatsappInput.value.trim();
            const honeypot = rsvpWebsiteField ? rsvpWebsiteField.value : '';

            if (firstName.length < 2) {
                showToast('Ingresa un nombre válido (mínimo 2 caracteres).', 'error');
                rsvpFirstnameInput.focus();
                return;
            }

            if (lastName.length < 2) {
                showToast('Ingresa un apellido válido (mínimo 2 caracteres).', 'error');
                rsvpLastnameInput.focus();
                return;
            }

            const isLeadingPlus = rawPhone.startsWith('+');
            const phoneRest = isLeadingPlus ? rawPhone.slice(1) : rawPhone;
            const hasLetters = /[a-zA-Z]/.test(rawPhone);
            const hasInvalidChars = /[^0-9\s().-]/.test(phoneRest);
            const hasMultiplePlus = (rawPhone.match(/\+/g) || []).length > 1;
            const digitsOnly = rawPhone.replace(/[^\d]/g, '');

            if (hasLetters || hasInvalidChars || hasMultiplePlus || digitsOnly.length < 8 || digitsOnly.length > 15) {
                showToast('Ingresa un número de teléfono válido (entre 8 y 15 dígitos).', 'error');
                rsvpWhatsappInput.focus();
                return;
            }

            let attendanceStatus = 'attending';
            for (const radio of attendanceRadios) {
                if (radio.checked) {
                    attendanceStatus = radio.value;
                }
            }

            let dietary = 'Ninguna';
            let dietaryDetail = '';

            if (attendanceStatus === 'attending') {
                if (rsvpDietarySelect.value === 'Alergias' || rsvpDietarySelect.value === 'Otra') {
                    const detail = rsvpDietaryDetailInput.value.trim();
                    if (!detail || detail.length < 2 || detail.toLowerCase() === 'alergias' || detail.toLowerCase() === 'otra') {
                        showToast('Por favor especifica el detalle de tu restricción alimentaria.', 'error');
                        rsvpDietaryDetailInput.focus();
                        return;
                    }
                    dietary = detail;
                    dietaryDetail = detail;
                } else {
                    dietary = rsvpDietarySelect.value;
                }
            }

            if (rsvpSubmitBtn) {
                rsvpSubmitBtn.disabled = true;
                rsvpSubmitBtn.textContent = 'Guardando...';
            }

            try {
                const isUpdate = Boolean(isExplicitUpdateMode && currentRSVPId && currentManageToken);
                const payload = {
                    action: isUpdate ? 'update' : 'create',
                    first_name: firstName,
                    last_name: lastName,
                    phone: rawPhone,
                    attendance_status: attendanceStatus,
                    dietary_type: attendanceStatus === 'attending' ? rsvpDietarySelect.value : null,
                    dietary_detail: attendanceStatus === 'attending' ? dietaryDetail : null,
                    website: honeypot
                };

                if (isUpdate) {
                    payload.rsvp_id = currentRSVPId;
                    payload.manage_token = currentManageToken;
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const response = await fetch('/api/rsvp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                const data = await response.json();

                if (!response.ok || !data.ok) {
                    const msg = 'No pudimos guardar tu respuesta. Intenta nuevamente o escríbenos por WhatsApp.';
                    showToast(msg, 'error');
                    if (rsvpSubmitBtn) {
                        rsvpSubmitBtn.disabled = false;
                        rsvpSubmitBtn.textContent = isUpdate ? 'Guardar cambios' : 'Registrar mi respuesta';
                    }
                    return;
                }

                if (data.rsvp_id && data.manage_token) {
                    currentRSVPId = data.rsvp_id;
                    currentManageToken = data.manage_token;
                    localStorage.setItem('rsvp_id', currentRSVPId);
                    localStorage.setItem('rsvp_manage_token', currentManageToken);
                }

                const summaryName = document.getElementById('summary-name');
                const summaryAttendance = document.getElementById('summary-attendance');
                const summaryDietary = document.getElementById('summary-dietary');
                const summaryDietaryRow = document.getElementById('summary-dietary-row');

                if (summaryName) summaryName.textContent = `${firstName} ${lastName}`;
                let attendanceLabel = 'Sí, asistiré';
                if (attendanceStatus === 'not_attending') attendanceLabel = 'No podré asistir';
                if (attendanceStatus === 'pending') attendanceLabel = 'Aún no estoy seguro/a';
                if (summaryAttendance) summaryAttendance.textContent = attendanceLabel;
                
                if (attendanceStatus === 'attending') {
                    if (summaryDietaryRow) summaryDietaryRow.classList.remove('hidden');
                    if (summaryDietary) summaryDietary.textContent = dietary;
                } else {
                    if (summaryDietaryRow) summaryDietaryRow.classList.add('hidden');
                }

                if (rsvpFormStep) rsvpFormStep.classList.add('hidden');
                if (rsvpSuccess) rsvpSuccess.classList.remove('hidden');

                showToast(isUpdate ? 'Tu respuesta fue actualizada.' : 'Tu respuesta quedó registrada.', 'success');

                rsvpCompleted = true;
                isExplicitUpdateMode = true;
                updateCtaVisibility();

            } catch (err) {
                console.error('RSVP API fetch error:', err);
                showToast('No pudimos guardar tu respuesta. Intenta nuevamente o escríbenos por WhatsApp.', 'error');
            } finally {
                if (rsvpSubmitBtn) {
                    rsvpSubmitBtn.disabled = false;
                    rsvpSubmitBtn.textContent = isExplicitUpdateMode ? 'Guardar cambios' : 'Registrar mi respuesta';
                }
            }
        });
    }

    // RSVP Edit Button
    const editBtn = document.getElementById('rsvp-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            rsvpCompleted = false;
            isExplicitUpdateMode = true;
            if (rsvpSubmitBtn) rsvpSubmitBtn.textContent = 'Guardar cambios';
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
            isExplicitUpdateMode = false;
            currentRSVPId = null;
            currentManageToken = null;
            localStorage.removeItem('rsvp_id');
            localStorage.removeItem('rsvp_manage_token');

            if (rsvpForm) rsvpForm.reset();
            handleAttendanceChange();
            if (rsvpSubmitBtn) rsvpSubmitBtn.textContent = 'Registrar mi respuesta';
            if (rsvpSuccess) rsvpSuccess.classList.add('hidden');
            if (rsvpFormStep) rsvpFormStep.classList.remove('hidden');
            if (rsvpForm) rsvpForm.scrollIntoView({ behavior: 'smooth' });
            updateCtaVisibility();
        });
    }


    // Fetch Public Config for WhatsApp option
    async function loadPublicConfig() {
        try {
            const res = await fetch('/api/public-config');
            if (res.ok) {
                const cfg = await res.json();
                const waTab = document.getElementById('rsvp-tab-wa');
                const waSuccessSupport = document.getElementById('rsvp-success-wa-support');
                const footerWaSupport = document.getElementById('footer-wa-support');

                const targetNumber = cfg.wedding_whatsapp_number || '56981393436';
                const confirmUrl = `https://wa.me/${targetNumber}?text=${encodeURIComponent('Hola, soy [nombre y apellido]. Quiero confirmar mi asistencia al matrimonio de Felipe y Camila del 23 de octubre de 2026.')}`;
                const supportUrl = `https://wa.me/${targetNumber}`;

                if (waTab) {
                    waTab.href = confirmUrl;
                    waTab.target = '_blank';
                    waTab.rel = 'noopener noreferrer';
                }
                if (waSuccessSupport) {
                    waSuccessSupport.href = supportUrl;
                    waSuccessSupport.target = '_blank';
                    waSuccessSupport.rel = 'noopener noreferrer';
                }
                if (footerWaSupport) {
                    footerWaSupport.href = supportUrl;
                    footerWaSupport.target = '_blank';
                    footerWaSupport.rel = 'noopener noreferrer';
                }
            }
        } catch (e) {
            console.warn('Public config fetch warning:', e);
        }
    }
    loadPublicConfig();



    // Safe Image Creation Helper with error fallback & objectPosition (Section 9 compliant)
    function createSafeImage(item, fallbackAlt, extraClasses = '') {
        const img = document.createElement('img');
        img.alt = item.alt || fallbackAlt;
        img.loading = item.loading || 'lazy';
        img.decoding = 'async';
        if (item.fetchPriority) img.fetchPriority = item.fetchPriority;
        if (item.width) img.width = item.width;
        if (item.height) img.height = item.height;
        if (item.srcset) img.srcset = item.srcset;
        if (item.sizes) img.sizes = item.sizes || '(max-width: 768px) 84vw, (max-width: 1024px) 65vw, 440px';
        if (item.objectPosition) img.style.objectPosition = item.objectPosition;
        img.className = `w-full h-full object-cover transition-opacity duration-300 ${extraClasses}`;
        
        img.onerror = () => {
            console.warn('Image failed to load in category:', fallbackAlt);
            img.style.display = 'none';
            const parent = img.parentElement;
            if (parent) {
                const fallback = document.createElement('div');
                fallback.className = 'w-full h-full flex items-center justify-center bg-cream/50 text-muted/50 text-xs font-sans italic p-4 text-center';
                fallback.textContent = 'Fotografía no disponible';
                parent.appendChild(fallback);
            }
        };

        // Assign src as the very last property
        img.src = item.src;
        return img;
    }

    // Progressive Gallery Loading using IntersectionObserver
    let historiaLoaded = false;
    let civilLoaded = false;
    let sharedLoaded = false;

    async function loadHistoriaSection() {
        if (historiaLoaded) return;
        historiaLoaded = true;
        try {
            const res = await fetch('js/hero_story.json');
            if (res.ok) {
                const data = await res.json();
                const historiaGrid = document.getElementById('historia-grid');
                if (historiaGrid && data.historia) {
                    historiaGrid.innerHTML = '';
                    data.historia.forEach((item) => {
                        const div = document.createElement('div');
                        div.className = 'aspect-[4/3] overflow-hidden bg-cream border border-dark/10 shadow-sm rounded-sm';
                        const img = createSafeImage(item, 'Recuerdo de nuestra historia');
                        div.appendChild(img);
                        historiaGrid.appendChild(div);
                    });
                }
            }
        } catch (e) {
            console.error('Error loading historia section:', e);
        }
    }

    async function loadCivilSection() {
        if (civilLoaded) return;
        civilLoaded = true;
        try {
            const res = await fetch('js/civil_featured.json');
            if (res.ok) {
                const data = await res.json();
                const civilRail = document.getElementById('civil-rail');
                if (civilRail && Array.isArray(data)) {
                    civilRail.innerHTML = '';
                    data.forEach((item) => {
                        const div = document.createElement('div');
                        div.className = 'rail-item overflow-hidden bg-light border border-dark/10 rounded-sm';
                        const img = createSafeImage(item, 'Momento del matrimonio civil');
                        div.appendChild(img);
                        civilRail.appendChild(div);
                    });
                    setupRail('civil-rail', 'civil-prev-btn', 'civil-next-btn', 'civil-counter');
                }
            }
        } catch (e) {
            console.error('Error loading civil section:', e);
        }
    }

    async function loadSharedSection() {
        if (sharedLoaded) return;
        sharedLoaded = true;
        try {
            const res = await fetch('js/guest_shared.json');
            if (res.ok) {
                const data = await res.json();
                const sharedRail = document.getElementById('shared-rail');
                if (sharedRail && Array.isArray(data)) {
                    sharedRail.innerHTML = '';
                    data.forEach((item) => {
                        const div = document.createElement('div');
                        div.className = 'rail-item overflow-hidden bg-cream border border-dark/10 rounded-sm';
                        const img = createSafeImage(item, 'Fotografía compartida durante la celebración');
                        div.appendChild(img);
                        sharedRail.appendChild(div);
                    });
                    setupRail('shared-rail', 'shared-prev-btn', 'shared-next-btn', 'shared-counter');
                }
            }
        } catch (e) {
            console.error('Error loading shared section:', e);
        }
    }

    function initLazyGalleryObservers() {
        if (!('IntersectionObserver' in window)) {
            // Fallback for browsers without IntersectionObserver
            loadHistoriaSection();
            loadCivilSection();
            loadSharedSection();
            return;
        }

        const observerOptions = { rootMargin: '300px 0px', threshold: 0.01 };

        const historiaElem = document.getElementById('historia');
        if (historiaElem) {
            const obs = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    loadHistoriaSection();
                    obs.disconnect();
                }
            }, observerOptions);
            obs.observe(historiaElem);
        }

        const civilElem = document.getElementById('nuestro-civil');
        if (civilElem) {
            const obs = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    loadCivilSection();
                    obs.disconnect();
                }
            }, observerOptions);
            obs.observe(civilElem);
        }

        const sharedElem = document.getElementById('galeria-compartidas');
        if (sharedElem) {
            const obs = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    loadSharedSection();
                    obs.disconnect();
                }
            }, observerOptions);
            obs.observe(sharedElem);
        }
    }

    // Attach IntersectionObservers only after DOM is ready
    if ('requestIdleCallback' in window) {
        requestIdleCallback(initLazyGalleryObservers);
    } else {
        setTimeout(initLazyGalleryObservers, 1500);
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
            if (!rail.children[0]) return;
            const itemWidth = rail.children[0].getBoundingClientRect().width + 24;
            const currentIndex = Math.min(Math.round(rail.scrollLeft / itemWidth) + 1, totalItems);
            if (counter) counter.textContent = `${String(currentIndex).padStart(2, '0')} / ${String(totalItems).padStart(2, '0')}`;
        }

        rail.addEventListener('scroll', updateCounter, { passive: true });

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
            if (!rail.children[0]) return;
            const itemWidth = rail.children[0].getBoundingClientRect().width + 24;
            if (e.key === 'ArrowRight') {
                rail.scrollBy({ left: itemWidth, behavior: 'smooth' });
            } else if (e.key === 'ArrowLeft') {
                rail.scrollBy({ left: -itemWidth, behavior: 'smooth' });
            }
        });

        updateCounter();
    }

});

