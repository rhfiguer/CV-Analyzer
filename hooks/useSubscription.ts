
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export const useSubscriptionStatus = () => {
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkStatus = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      setIsPremium(false);
      setStatus(null);
      setLoading(false);
      return;
    }

    console.log("🕵️‍♂️ [AUTH-CHECK] Usuario ID:", user.id);
    console.log("🕵️‍♂️ [DB-CHECK] Consultando tabla 'subscriptions'...");

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', user.id)
        .in('status', ['active', 'on_trial'])
        .maybeSingle();

      if (error) throw error;

      console.log("💎 [PREMIUM-STATUS] Estado en DB:", data?.status || 'none');
      
      const isActive = data?.status === 'active' || data?.status === 'on_trial';
      setIsPremium(isActive);
      setStatus(data?.status || null);
    } catch (err) {
      console.error("❌ [SUBSCRIPTION-ERROR]:", err);
      // Fallback a perfiles para compatibilidad
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', user.id)
          .single();
        
        setIsPremium(!!profile?.is_premium);
      } catch (profileErr) {
        console.error("❌ [PROFILE-ERROR]:", profileErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    checkStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        checkStatus();
      } else if (event === 'SIGNED_OUT') {
        setIsPremium(false);
        setStatus(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isPremium, status, loading, refresh: checkStatus };
};
