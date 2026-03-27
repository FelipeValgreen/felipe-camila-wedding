
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mwumnywbvjxekskfrlms.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fd17si3WzUC2EgAqCeczAg_Gy3HW-n-'; // Using the one found in code

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listFiles() {
  const { data, error } = await supabase
    .storage
    .from('wedding-photos')
    .list();

  if (error) {
    console.error('Error listing files:', error);
  } else {
    console.log('Files in root:', data);
  }
  
  const { data: folderData, error: folderError } = await supabase
    .storage
    .from('wedding-photos')
    .list('guest_uploads');

    if (folderError) {
        console.error('Error listing folder files:', folderError);
      } else {
        console.log('Files in guest_uploads:', folderData);
      }
}

listFiles();
