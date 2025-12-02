
// Supabase Configuration
const SUPABASE_URL = 'https://mwumnywbvjxekskfrlms.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fd17si3WzUC2EgAqCeczAg_Gy3HW-n-';

// Initialize the Supabase client
// Ensure the Supabase JS library is loaded before this script
let supabaseClient;

if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized');
} else {
    console.error('Supabase JS library not found. Make sure to include the CDN script.');
}

// Helper function to upload a photo
async function uploadGuestPhoto(file, uploaderName, email, whatsapp) {
    if (!supabaseClient) {
        console.error('Supabase client not initialized');
        return { error: 'Supabase not initialized' };
    }

    try {
        const fileName = `guest_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

        // 1. Upload image to Storage
        const { data: storageData, error: storageError } = await supabaseClient.storage
            .from('wedding-photos')
            .upload(fileName, file);

        if (storageError) throw storageError;

        // 2. Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
            .from('wedding-photos')
            .getPublicUrl(fileName);

        // 3. Save metadata to Database (only url and uploader_name)
        const { data: dbData, error: dbError } = await supabaseClient
            .from('guest_photos')
            .insert([
                {
                    url: publicUrl,
                    uploader_name: uploaderName
                    // Note: email is only used for notification, not stored in DB
                }
            ]);

        if (dbError) throw dbError;

        return { data: { publicUrl, ...dbData }, error: null };
    } catch (error) {
        console.error('Error uploading photo:', error);
        return { data: null, error };
    }
}

// Helper function to save trivia results
async function saveTriviaResult(score, answers, userId = null) {
    if (!supabaseClient) return { error: 'Supabase not initialized' };

    const { data, error } = await supabaseClient
        .from('trivia_results')
        .insert([
            { score, answers, user_id: userId }
        ]);

    if (error) {
        console.error('Error saving trivia result:', error);
        return { error };
    }

    return { data };
}

// Helper function to fetch guest photos
async function fetchGuestPhotos() {
    if (!supabaseClient) return { error: 'Supabase not initialized' };

    const { data, error } = await supabaseClient
        .from('guest_photos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching photos:', error);
        return { error };
    }

    return { data };
}

// Auth Functions
async function signInWithGoogle() {
    if (!supabaseClient) return { error: 'Supabase not initialized' };
    // Use current origin to avoid localhost issues
    const redirectUrl = `${window.location.origin}/#guest-paparazzi`;
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: redirectUrl
        }
    });
    return { data, error };
}

async function signInWithEmail(email) {
    if (!supabaseClient) return { error: 'Supabase not initialized' };
    const redirectUrl = `${window.location.origin}/#guest-paparazzi`;
    const { data, error } = await supabaseClient.auth.signInWithOtp({
        email: email,
        options: {
            emailRedirectTo: redirectUrl
        }
    });
    return { data, error };
}

async function getCurrentUser() {
    if (!supabaseClient) return null;
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
}

// Send email notification when photo is uploaded
async function sendPhotoUploadNotification(uploaderName, email) {
    try {
        // Send email to couple using mailto (client-side)
        const subject = encodeURIComponent(`Nueva foto subida por ${uploaderName}`);
        const body = encodeURIComponent(`${uploaderName} (${email}) acaba de subir una foto en la sección "A través de tus ojos".\n\nRevisa las fotos en tu panel de administración.`);
        const mailtoLink = `mailto:felipevalverde5673@gmail.com?subject=${subject}&body=${body}`;

        // Open mailto in a hidden iframe to avoid navigation
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = mailtoLink;
        document.body.appendChild(iframe);
        setTimeout(() => document.body.removeChild(iframe), 1000);

        return { success: true };
    } catch (error) {
        console.error('Error sending notification:', error);
        return { error };
    }
}

// Expose functions globally
window.uploadGuestPhoto = uploadGuestPhoto;
window.saveTriviaResult = saveTriviaResult;
window.fetchGuestPhotos = fetchGuestPhotos;
window.signInWithGoogle = signInWithGoogle;
window.signInWithEmail = signInWithEmail;
window.getCurrentUser = getCurrentUser;
window.sendPhotoUploadNotification = sendPhotoUploadNotification;
window.supabaseClient = supabaseClient; // Expose client for direct access if needed
