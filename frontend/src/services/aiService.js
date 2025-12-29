import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

export async function predictTutorRate(experience, subject) {
  try {
    const res = await api.post('/predict-price/', { experience, subject });
    // Support both response formats from backend
    const price = res.data?.suggested_price ?? res.data?.suggested_rate ?? null;
    if (price === null) {
      console.warn('[predictTutorRate] No price returned from backend:', res.data);
    }
    return typeof price === 'number' ? price : (price ? Number(price) : null);
  } catch (err) {
    const backendData = err?.response?.data;
    const msg = backendData?.message || backendData?.detail;
    const error = new Error(msg || 'Failed to predict tutor rate. Please try again.');
    if (backendData) error.backend = backendData;
    throw error;
  }
}
