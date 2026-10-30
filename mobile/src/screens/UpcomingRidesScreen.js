import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Linking,
    SafeAreaView
} from 'react-native';
import api from '../config/api';
import { Calendar, Phone, ArrowLeft, Clock, MapPin, User } from 'lucide-react-native';

export default function UpcomingRidesScreen({ navigation }) {
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRides();
    }, []);

    const fetchRides = async () => {
        try {
            const today = new Date();
            const monthParam = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const res = await api.get(`/api/driver/upcoming-rides?month=${monthParam}`);
            if (res.data && Array.isArray(res.data.rides)) {
                setRides(res.data.rides);
            }
        } catch (error) {
            console.error('Error fetching upcoming rides:', error);
        } finally {
            setLoading(false);
        }
    };

    const callGuest = (phone) => {
        if (!phone) return;
        Linking.openURL(`tel:${phone}`);
    };

    const renderRideItem = ({ item }) => (
        <View style={styles.rideCard}>
            <View style={styles.cardHeader}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.isToday ? '● TODAY' : 'UPCOMING'}</Text>
                </View>
                <Text style={styles.dateTimeText}>
                    {item.dateFormatted} • {item.time}
                </Text>
            </View>

            <View style={styles.clientRow}>
                <User size={16} color="#38bdf8" />
                <Text style={styles.clientName}>{item.clientName || 'Guest'}</Text>
            </View>

            <View style={styles.detailRow}>
                <MapPin size={14} color="#fbbf24" />
                <Text style={styles.detailText}>Duty: {item.duty || 'Local / Outstation'}</Text>
            </View>

            {item.mobileNumber && (
                <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => callGuest(item.mobileNumber)}
                    activeOpacity={0.8}
                >
                    <Phone size={15} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.callButtonText}>CALL GUEST ({item.mobileNumber})</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={20} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Upcoming Rides</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#0284c7" />
                </View>
            ) : rides.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Calendar size={48} color="rgba(255,255,255,0.2)" style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyTitle}>No Upcoming Rides</Text>
                    <Text style={styles.emptySubtitle}>You have no assigned rides for this period.</Text>
                </View>
            ) : (
                <FlatList
                    data={rides}
                    keyExtractor={(item, index) => item._id || String(index)}
                    renderItem={renderRideItem}
                    contentContainerStyle={styles.listContent}
                />
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
        padding: 24,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
    },
    listContent: {
        padding: 16,
        gap: 12,
    },
    rideCard: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    badge: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeText: {
        color: '#34d399',
        fontSize: 10,
        fontWeight: '900',
    },
    dateTimeText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '700',
    },
    clientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    clientName: {
        fontSize: 16,
        fontWeight: '900',
        color: '#ffffff',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    detailText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
    },
    callButton: {
        backgroundColor: '#10b981',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
    },
    callButtonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '900',
    },
});
