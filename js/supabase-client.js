
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
async function saveTriviaResult(score, answers, userId = null, guestName = null) {
    if (!supabaseClient) return { error: 'Supabase not initialized' };

    const { data, error } = await supabaseClient
        .from('trivia_results')
        .insert([
            { score, answers, user_id: userId, guest_name: guestName }
        ]);

    if (error) {
        console.error('Error saving trivia result:', error);
        return { error };
    }

    return { data };
}

// Helper function to save RSVP
async function saveRSVP(rsvpData) {
    if (!supabaseClient) return { error: 'Supabase not initialized' };

    const { data, error } = await supabaseClient
        .from('rsvp_guests')
        .insert([rsvpData]);

    if (error) {
        console.error('Error saving RSVP:', error);
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
        .order('created_at', { ascending: true })
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
        // Use Web3Forms free API for email notifications
        const formData = new FormData();
        formData.append('access_key', '138e83f9-894d-4a94-bee4-af9392f8ffb9'); // You'll need to get this from web3forms.com
        formData.append('subject', `Nueva foto subida por ${uploaderName}`);
        formData.append('from_name', 'Felipe y Camila - Sitio Web');
        formData.append('to_email', 'felipevalverde5673@gmail.com');
        formData.append('message', `${uploaderName} (${email}) acaba de subir una foto en la sección "A través de tus ojos".\n\nRevisa las fotos en: ${window.location.origin}/#guest-paparazzi`);

        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            console.log('Email notification sent successfully');
            return { success: true };
        } else {
            console.error('Failed to send email:', result);
            return { error: result.message };
        }
    } catch (error) {
        console.error('Error sending notification:', error);
        return { error };
    }
}

// Helper function to save Song Request
async function saveSongRequest(songName, artistName, requesterName) {
    // Only check client if not simulating (although current codebase doesn't have simulation toggle here)
    if (!supabaseClient) return { error: 'Supabase not initialized' };

    const { data, error } = await supabaseClient
        .from('song_requests')
        .insert([
            {
                song_name: songName,
                // Changed from 'artist' to 'artist_name' to be safe/standard
                artist_name: artistName || '',
                requester_name: requesterName
            }
        ]);

    if (error) {
        console.error('Error saving song request (Supabase):', error);
        return { error };
    }

    return { data };
}

// Helper function to fetch song requests
async function fetchSongRequests() {
    if (!supabaseClient) return { error: 'Supabase not initialized' };

    const { data, error } = await supabaseClient
        .from('song_requests')
        .select('*')
        .order('created_at', { ascending: false }) // Newest first
        .limit(50);

    if (error) {
        console.error('Error fetching song requests:', error);
        return { error };
    }

    return { data };
}

// Expose functions globally
window.uploadGuestPhoto = uploadGuestPhoto;
window.saveTriviaResult = saveTriviaResult;
window.saveRSVP = saveRSVP;
window.fetchGuestPhotos = fetchGuestPhotos;
window.saveSongRequest = saveSongRequest;
window.fetchSongRequests = fetchSongRequests;
window.signInWithGoogle = signInWithGoogle;
window.signInWithEmail = signInWithEmail;
window.getCurrentUser = getCurrentUser;
window.sendPhotoUploadNotification = sendPhotoUploadNotification;
window.supabaseClient = supabaseClient; // Expose client for direct access if needed
