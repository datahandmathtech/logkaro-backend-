import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStoredAuth();
    }, []);

    const loadStoredAuth = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('driver_token');
            const storedUser = await AsyncStorage.getItem('driver_user');
            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            }
        } catch (e) {
            console.error('Error loading stored auth:', e);
        } finally {
            setLoading(false);
        }
    };

    const login = async (identifier, password) => {
        try {
            const payload = {
                username: identifier,
                mobile: identifier,
                password: password,
            };
            const response = await api.post('/api/auth/login', payload);
            const data = response.data;

            if (data.token) {
                await AsyncStorage.setItem('driver_token', data.token);
                await AsyncStorage.setItem('driver_user', JSON.stringify(data));
                setToken(data.token);
                setUser(data);
                return { success: true, user: data };
            } else {
                return { success: false, message: 'Invalid response from server' };
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Login failed. Please check credentials.';
            return { success: false, message: msg };
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.removeItem('driver_token');
            await AsyncStorage.removeItem('driver_user');
            setToken(null);
            setUser(null);
        } catch (e) {
            console.error('Logout error:', e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
