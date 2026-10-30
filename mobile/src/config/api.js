import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default Local Machine IP for Expo / React Native device testing
export const BASE_URL = 'http://192.168.1.38:5005';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 20000,
});

api.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem('driver_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (e) {
            console.error('Failed to get token from storage', e);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
