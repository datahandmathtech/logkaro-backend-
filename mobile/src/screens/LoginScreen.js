import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Lock, Phone, User, ShieldCheck } from 'lucide-react-native';

export default function LoginScreen() {
    const { login } = useAuth();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!identifier.trim() || !password.trim()) {
            setError('Please enter Mobile/Username and Password');
            return;
        }
        setError('');
        setLoading(true);
        const result = await login(identifier.trim(), password);
        setLoading(false);
        if (!result.success) {
            setError(result.message || 'Login failed');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <View style={styles.iconCircle}>
                        <ShieldCheck size={40} color="#0284c7" />
                    </View>
                    <Text style={styles.title}>LogKaro Driver</Text>
                    <Text style={styles.subtitle}>Mobile Fleet App for Drivers</Text>
                </View>

                <View style={styles.card}>
                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>MOBILE NUMBER / USERNAME</Text>
                        <View style={styles.inputWrapper}>
                            <Phone size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter mobile or username"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={identifier}
                                onChangeText={setIdentifier}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>PASSWORD</Text>
                        <View style={styles.inputWrapper}>
                            <Lock size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter password"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>LOGIN TO DRIVER APP</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Secure Driver Portal • Android & iOS Native</Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#080c14',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(2, 132, 199, 0.12)',
        borderWidth: 1.5,
        borderColor: 'rgba(2, 132, 199, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: '#ffffff',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 6,
        fontWeight: '600',
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        padding: 24,
    },
    errorBox: {
        backgroundColor: 'rgba(244, 63, 94, 0.15)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(244, 63, 94, 0.3)',
        padding: 12,
        marginBottom: 16,
    },
    errorText: {
        color: '#f43f5e',
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 18,
    },
    label: {
        fontSize: 11,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 14,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 48,
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '600',
    },
    button: {
        backgroundColor: '#0284c7',
        borderRadius: 14,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        shadowColor: '#0284c7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    footer: {
        marginTop: 32,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '600',
    },
});
