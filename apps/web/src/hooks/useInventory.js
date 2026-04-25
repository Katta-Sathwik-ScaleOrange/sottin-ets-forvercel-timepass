import { useState, useEffect } from 'react';
import api from '@/lib/api';

export function useInventory(shiftId, year, month) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shiftId || !year || !month) return;
    setLoading(true);
    api.get(`/inventory/${shiftId}/${year}/${month}`)
      .then(setInventory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [shiftId, year, month]);

  return { inventory, loading };
}
