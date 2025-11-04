// src/services/supabase.js - DÙNG TOKEN TỪ FLASK
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vcqhwonimqsubvqymgjx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjcWh3b25pbXFzdWJ2cXltZ2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMzY0NzYsImV4cCI6MjA3NzcxMjQ3Nn0.ri6wGW7s7CszDol0Gcx5EJ2_eZKUoZ4gSasjefPiwU0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const storageService = {
  // Upload với token từ Flask
  uploadAvatar: async (file, userId) => {
    try {
      console.log('📁 Uploading with Flask JWT token...');
      
      // Lấy token từ localStorage (token từ Flask)
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Không tìm thấy token');
      }

      console.log('🔐 Using token:', token.substring(0, 20) + '...');

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload với custom headers chứa token
      const { data, error } = await supabase.storage
        .from('user-assets')
        .upload(filePath, file, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

      if (error) {
        console.error('❌ Upload error:', error);
        throw new Error(`Upload thất bại: ${error.message}`);
      }

      console.log('✅ Upload successful');

      // Lấy public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-assets')
        .getPublicUrl(filePath);

      return publicUrl;

    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
  }
};