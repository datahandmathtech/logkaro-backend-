import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    SafeAreaView
} from 'react-native';
import api from '../config/api';
import { Wallet, ArrowLeft, Calendar, ArrowUpRight, ArrowDownRight, Award } from 'lucide-react-native';

export default function SalaryLedgerScreen({ navigation }) {
    const [ledger, setLedger] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLedger();
    }, []);

    const fetchLedger = async () => {
        try {
            const today = new Date();
            const res = await api.get(`/api/driver/ledger?month=${today.getMonth() + 1}&year=${today.getFullYear()}`);
            setLedger(res.data);
        } catch (error) {
            console.error('Error fetching ledger:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={20} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Salary & Duties</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#0284c7" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Hero Net Payout Card */}
                    <View style={styles.heroCard}>
                        <Text style={styles.heroLabel}>ESTIMATED NET SALARY</Text>
                        <Text style={styles.heroAmount}>
                            ₹{Number(ledger?.netSalary || ledger?.totalDue || 0).toLocaleString('en-IN')}
                        </Text>
                        <View style={styles.statusPill}>
                            <Text style={styles.statusPillText}>CURRENT MONTH STATUS</Text>
                        </View>
                    </View>

                    {/* Breakdown Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>DUTY DAYS</Text>
                            <Text style={[styles.statValue, { color: '#38bdf8' }]}>
                                {ledger?.dutyDays || ledger?.totalDuties || 0}
                            </Text>
                            <Text style={styles.statSub}>Days on duty</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>BASE WAGE/SALARY</Text>
                            <Text style={[styles.statValue, { color: '#ffffff' }]}>
                                ₹{Number(ledger?.baseSalary || ledger?.salary || 0).toLocaleString('en-IN')}
                            </Text>
                            <Text style={styles.statSub}>Fixed/Daily</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>DA & NIGHTS</Text>
                            <Text style={[styles.statValue, { color: '#fbbf24' }]}>
                                ₹{Number(ledger?.allowanceTotal || ledger?.totalDA || 0).toLocaleString('en-IN')}
                            </Text>
                            <Text style={styles.statSub}>Allowances</Text>
                        </View>

                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>ADVANCES / EMI</Text>
                            <Text style={[styles.statValue, { color: '#f43f5e' }]}>
                                -₹{Number(ledger?.advancesDeducted || ledger?.totalAdvances || 0).toLocaleString('en-IN')}
                            </Text>
                            <Text style={styles.statSub}>Deductions</Text>
                        </View>
                    </View>

                    {/* Information Note */}
                    <View style={styles.noteBox}>
                        <Text style={styles.noteText}>
                            ℹ️ Final monthly payout calculations and approvals are finalized by company admin at the end of each billing cycle.
                        </Text>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#080c14',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#ffffff',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        padding: 16,
    },
    heroCard: {
        backgroundColor: 'rgba(2, 132, 199, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(2, 132, 199, 0.3)',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
    },
    heroLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    heroAmount: {
        fontSize: 32,
        fontWeight: '900',
        color: '#38bdf8',
        marginBottom: 12,
    },
    statusPill: {
        backgroundColor: 'rgba(2, 132, 199, 0.25)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusPillText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#38bdf8',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        width: '48%',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 14,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 2,
    },
    statSub: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '600',
    },
    noteBox: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    noteText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 18,
    },
});
