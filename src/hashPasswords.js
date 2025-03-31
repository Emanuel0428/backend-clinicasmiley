const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Key must be provided in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);


const hashPasswords = async () => {
  try {

    const { data: users, error } = await supabase.from('Usuarios').select('*');
    if (error) {
      throw new Error(`Error fetching users: ${error.message}`);
    }

    if (!users || users.length === 0) {
      console.log('No users found in the Usuarios table.');
      return;
    }

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.clave, 10);
      const { error: updateError } = await supabase
        .from('Usuarios')
        .update({ clave: hashedPassword })
        .eq('id_user', user.id_user);

      if (updateError) {
        console.error(`Error updating password for user ${user.usuario}: ${updateError.message}`);
        continue;
      }

      console.log(`Successfully hashed and updated password for user: ${user.usuario}`);
    }

    console.log('All passwords have been hashed and updated successfully.');
  } catch (err) {
    console.error('Error during password hashing process:', err.message);
  }
};

hashPasswords();