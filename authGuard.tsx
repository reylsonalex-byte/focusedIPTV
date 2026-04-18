import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '../services/firebaseConfig';

export function useAuthGuard() {

  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, (user) => {

      if (!user) {
        // 🚨 não logado → manda pro login
        router.replace('/login');
      } else {
        // ✅ logado → libera app
        router.replace('/planos');
      }

      setLoading(false);
    });

    return unsubscribe;

  }, []);

  return { loading };
}