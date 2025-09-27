require('dotenv').config();
const { Resend } = require('resend');

async function manageResendKeys() {
  console.log('🔑 Resend API Key Management Utility');
  console.log('=====================================');
  
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.log('❌ RESEND_API_KEY not found in environment variables');
    console.log('Please add RESEND_API_KEY to your .env file');
    return;
  }
  
  const resend = new Resend(apiKey);
  
  try {
    console.log('\n📋 Current API Keys:');
    const keys = await resend.apiKeys.list();
    
    if (keys.data && keys.data.length > 0) {
      keys.data.forEach((key, index) => {
        console.log(`${index + 1}. ${key.name}`);
        console.log(`   ID: ${key.id}`);
        console.log(`   Created: ${new Date(key.created_at).toLocaleDateString()}`);
        console.log(`   Last Used: ${key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}`);
        console.log('');
      });
    } else {
      console.log('No API keys found');
    }
    
    // Example of how to create a new key (commented out for safety)
    /*
    console.log('\n🔧 Creating new API key...');
    const newKey = await resend.apiKeys.create({
      name: 'Virello Food Production Key',
      permission: 'full_access'
    });
    console.log('✅ New API key created:', newKey.data?.id);
    */
    
    // Example of how to remove a key (commented out for safety)
    /*
    console.log('\n🗑️ Removing API key...');
    await resend.apiKeys.remove('key-id-here');
    console.log('✅ API key removed');
    */
    
    console.log('\n💡 To create or remove keys, uncomment the relevant sections in this script');
    console.log('⚠️  Always be careful when managing API keys in production!');
    
  } catch (error) {
    console.error('❌ Error managing API keys:', error.message);
  }
}

// Command line argument handling
const command = process.argv[2];

switch (command) {
  case 'list':
    manageResendKeys();
    break;
  case 'create':
    console.log('To create a new API key, uncomment the creation section in the script');
    break;
  case 'remove':
    console.log('To remove an API key, uncomment the removal section in the script');
    break;
  default:
    console.log('Usage: node manage-resend-keys.js [list|create|remove]');
    console.log('  list   - List all API keys');
    console.log('  create - Create a new API key (uncomment code)');
    console.log('  remove - Remove an API key (uncomment code)');
    manageResendKeys();
}
