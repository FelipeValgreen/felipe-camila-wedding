
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
async function uploadGuestPhoto(file, uploaderName) {
    if (!supabaseClient) return { error: 'Supabase not initialized' };

    const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    const filePath = `guest_uploads/${fileName}`;

    // 1. Upload to Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('wedding-photos')
        .upload(filePath, file);

    if (uploadError) {
        console.error('Error uploading photo:', uploadError);
        return { error: uploadError };
    }

    // 2. Get Public URL
    const { data: { publicUrl } } = supabaseClient.storage
        .from('wedding-photos')
        .getPublicUrl(filePath);

    // 3. Save Metadata to Database
    const { data: dbData, error: dbError } = await supabaseClient
        .from('guest_photos')
        .insert([
            { url: publicUrl, uploader_name: uploaderName }
        ]);

    if (dbError) {
        console.error('Error saving metadata:', dbError);
        return { error: dbError };
    }

    return { data: { publicUrl, ...dbData } };
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

// Expose functions globally
window.uploadGuestPhoto = uploadGuestPhoto;
window.saveTriviaResult = saveTriviaResult;
window.fetchGuestPhotos = fetchGuestPhotos;
