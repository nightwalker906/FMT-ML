/**
 * Test script to verify real-time learning goals updates trigger recommendation refresh
 * 
 * Run in browser console while logged in to dashboard:
 * fetch('/test-real-time-updates.ts').then(r => r.text()).then(eval)
 */

import { createClient } from '@/utils/supabase/client';

async function test_real_time_updates() {
  const supabase = createClient();
  
  // Get logged-in user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ Not logged in');
    return;
  }
  
  console.log(`✅ Testing real-time updates for user: ${user.id}`);
  
  // Get current learning goals
  const { data: student } = await supabase
    .from('students')
    .select('learning_goals')
    .eq('profile_id', user.id)
    .single();
    
  if (!student) {
    console.error('❌ No student profile found');
    return;
  }
  
  const originalGoals = student.learning_goals || [];
  console.log('📝 Original learning goals:', originalGoals);
  
  // Simulate updating learning goals
  const testGoals = ['New test goal for computer science', 'Linear algebra'];
  console.log('🔄 Pushing new learning goals:', testGoals);
  
  const { error } = await supabase
    .from('students')
    .update({ learning_goals: testGoals })
    .eq('profile_id', user.id);
    
  if (error) {
    console.error('❌ Failed to update goals:', error);
    return;
  }
  
  console.log('✅ Learning goals updated in database');
  console.log('⏳ Waiting 2 seconds for real-time subscription callback...');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('✅ Check console for [Dashboard] logs - should see "Learning goals changed" message');
  console.log('✅ SmartRecommendations should have refetched with new goals');
  
  // Restore original
  await supabase
    .from('students')
    .update({ learning_goals: originalGoals })
    .eq('profile_id', user.id);
    
  console.log('🔄 Restored original learning goals');
}

test_real_time_updates().catch(console.error);
