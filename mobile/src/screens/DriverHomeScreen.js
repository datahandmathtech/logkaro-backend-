import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Alert,
    SafeAreaView,
    Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../config/api';
import {
    Car,
    Clock,
    LogOut,
    CheckCircle,
    Calendar,
    Wallet,
    Droplets,
    LayoutDashboard,
    AlertTriangle,
    Shield
} from 'lucide-react-native';

export default function DriverHomeScreen({ navigation }) {
    const { user, logout } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/api/driver/dashboard');
            setDashboardData(res.data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboard();
    };

    const handleAirCheck = async () => {
        try {
            await api.post('/api/driver/air-check');
            Alert.alert('Air Check Recorded', 'Tyre air pressure check recorded successfully!');
            fetchDashboard();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Could not record air check');
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return '--:--';
        try {
            const d = new Date(isoString);
            return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch {
            return '--:--';
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#0284c7" />
                <Text style={styles.loadingText}>Loading Driver Portal...</Text>
            </SafeAreaView>
        );
    }

    const attendance = dashboardData?.todayAttendance;
    const isPunchedIn = !!attendance?.punchIn?.time;
    const isPunchedOut = !!attendance?.punchOut?.time;
    const onDuty = isPunchedIn && !isPunchedOut;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284c7" />}
            >
                {/* ── Top Header ── */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.logoBadge}>
                            <Car size={18} color="#0284c7" />
                        </View>
                        <View>
                            <View style={styles.nameRow}>
                                <Text style={styles.driverName}>{user?.name || 'Driver'}</Text>
                                <View style={styles.onlineDot} />
                            </View>
                            <Text style={styles.companyName}>{user?.company?.name || 'LogKaro Fleet'}</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
                        <LogOut size={16} color="#f43f5e" />
                    </TouchableOpacity>
                </View>

                {/* ── Quick Action Pills (Fuel, Parking, Air Check) ── */}
                {onDuty && (
                    <View style={styles.actionPillsRow}>
                        <TouchableOpacity
                            style={[styles.pill, { backgroundColor: 'rgba(2, 132, 199, 0.15)', borderColor: 'rgba(2, 132, 199, 0.4)' }]}
                            onPress={() => Alert.alert('Log Fuel', 'Fuel log screen')}
                            activeOpacity={0.7}
                        >
                            <Droplets size={14} color="#38bdf8" />
                            <Text style={[styles.pillText, { color: '#38bdf8' }]}>Log Fuel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.pill, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)' }]}
                            onPress={() => Alert.alert('Parking', 'Parking slip entry')}
                            activeOpacity={0.7}
                        >
                            <Car size={14} color="#fbbf24" />
                            <Text style={[styles.pillText, { color: '#fbbf24' }]}>Parking</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.pill, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)' }]}
                            onPress={handleAirCheck}
                            activeOpacity={0.7}
                        >
                            <CheckCircle size={14} color="#34d399" />
                            <Text style={[styles.pillText, { color: '#34d399' }]}>Air Check</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Punch In / Punch Out Status Tracker ── */}
                <View style={styles.trackerGrid}>
                    {/* Punch In Box */}
                    <View style={[styles.trackerBox, isPunchedIn && styles.trackerBoxActiveGreen]}>
                        {isPunchedIn && <View style={[styles.statusIndicator, { backgroundColor: '#10b981' }]} />}
                        <Text style={styles.trackerLabel}>START DUTY</Text>
                        <Text style={[styles.trackerValue, isPunchedIn && { color: '#10b981' }]}>
                            {isPunchedIn ? formatTime(attendance.punchIn.time) : '--:--'}
                        </Text>
                    </View>

                    {/* Punch Out Box */}
                    <View style={[styles.trackerBox, isPunchedOut && styles.trackerBoxActiveRed]}>
                        {isPunchedOut && <View style={[styles.statusIndicator, { backgroundColor: '#f43f5e' }]} />}
                        <Text style={styles.trackerLabel}>END DUTY</Text>
                        <Text style={[styles.trackerValue, isPunchedOut && { color: '#f43f5e' }]}>
                            {isPunchedOut ? formatTime(attendance.punchOut.time) : '--:--'}
                        </Text>
                    </View>
                </View>

                {/* ── Navigation Tabs ── */}
                <View style={styles.tabsRow}>
                    <TouchableOpacity style={[styles.tabBtn, styles.tabBtnActive]}>
                        <LayoutDashboard size={18} color="#ffffff" />
                        <Text style={[styles.tabBtnText, { color: '#ffffff' }]}>Today Duty</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.tabBtn}
                        onPress={() => navigation.navigate('UpcomingRides')}
                    >
                        <Calendar size={18} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.tabBtnText}>Upcoming</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.tabBtn}
                        onPress={() => navigation.navigate('SalaryLedger')}
                    >
                        <Wallet size={18} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.tabBtnText}>Salary</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Duty State Hero Card ── */}
                {onDuty ? (
                    <View style={styles.heroCardOnDuty}>
                        <View style={styles.carCircle}>
                            <Car size={32} color="#10b981" />
                        </View>
                        <Text style={styles.heroTitle}>You are On Duty</Text>
                        <Text style={styles.heroSubtitle}>Drive safely! Close duty when trips are completed.</Text>

                        <TouchableOpacity
                            style={styles.endDutyBtn}
                            onPress={() => Alert.alert('End Duty', 'Submit report and complete duty')}
                            activeOpacity={0.8}
                        >
                            <LogOut size={18} color="#ffffff" style={{ marginRight: 8 }} />
                            <Text style={styles.endDutyBtnText}>SUBMIT REPORTS & END DUTY</Text>
                        </TouchableOpacity>
                    </View>
                ) : isPunchedOut ? (
                    <View style={styles.heroCardCompleted}>
                        <CheckCircle size={44} color="#10b981" style={{ marginBottom: 12 }} />
                        <Text style={styles.heroTitle}>Duty Completed for Today</Text>
                        <Text style={styles.heroSubtitle}>Your daily attendance and expenses have been submitted.</Text>
                    </View>
                ) : (
                    <View style={styles.heroCardStart}>
                        <View style={[styles.carCircle, { backgroundColor: 'rgba(2, 132, 199, 0.15)', borderColor: 'rgba(2, 132, 199, 0.3)' }]}>
                            <Car size={32} color="#0284c7" />
                        </View>
                        <Text style={styles.heroTitle}>Start Your Daily Duty</Text>
                        <Text style={styles.heroSubtitle}>Select vehicle, capture meter reading and photos to begin.</Text>

                        <TouchableOpacity
                            style={styles.startDutyBtn}
                            onPress={() => Alert.alert('Start Duty', 'Punch In and photo verification')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.startDutyBtnText}>PUNCH IN & START DUTY</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Assigned Vehicle Card ── */}
                {dashboardData?.vehicle && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>ASSIGNED VEHICLE</Text>
                        <Text style={styles.infoValue}>
                            {dashboardData.vehicle.carNumber} ({dashboardData.vehicle.model || 'Commercial Taxi'})
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#080c14',
    },
    centerContainer: {
        flex: 1,
        backgroundColor: '#080c14',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: 'rgba(255,255,255,0.7)',
        marginTop: 12,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logoBadge: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: 'rgba(2, 132, 199, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    driverName: {
        fontSize: 16,
        fontWeight: '900',
        color: '#ffffff',
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10b981',
    },
    companyName: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '700',
        marginTop: 2,
    },
    logoutBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(244, 63, 94, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(244, 63, 94, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionPillsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    pill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    pillText: {
        fontSize: 12,
        fontWeight: '800',
    },
    trackerGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    trackerBox: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 14,
        padding: 12,
        position: 'relative',
    },
    trackerBoxActiveGreen: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    trackerBoxActiveRed: {
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        borderColor: 'rgba(244, 63, 94, 0.3)',
    },
    statusIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    trackerLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: 4,
    },
    trackerValue: {
        fontSize: 18,
        fontWeight: '900',
        color: 'rgba(255, 255, 255, 0.3)',
    },
    tabsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        padding: 4,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        marginBottom: 16,
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 4,
    },
    tabBtnActive: {
        backgroundColor: '#0284c7',
    },
    tabBtnText: {
        fontSize: 11,
        fontWeight: '800',
        color: 'rgba(255, 255, 255, 0.6)',
    },
    heroCardOnDuty: {
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.25)',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
    },
    heroCardStart: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
    },
    heroCardCompleted: {
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        marginBottom: 16,
    },
    carCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderWidth: 1.5,
        borderColor: 'rgba(16, 185, 129, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    heroTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#ffffff',
        marginBottom: 6,
    },
    heroSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20,
    },
    endDutyBtn: {
        backgroundColor: '#e11d48',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
    },
    endDutyBtnText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    startDutyBtn: {
        backgroundColor: '#0284c7',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
    },
    startDutyBtnText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '900',
    },
    infoCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 14,
        padding: 14,
    },
    infoLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '800',
        color: '#38bdf8',
    },
});
