import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import DriverHomeScreen from '../screens/DriverHomeScreen';
import UpcomingRidesScreen from '../screens/UpcomingRidesScreen';
import SalaryLedgerScreen from '../screens/SalaryLedgerScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#080c14', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#0284c7" />
            </View>
        );
    }

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#080c14' },
                animation: 'slide_from_right'
            }}
        >
            {!user ? (
                <Stack.Screen name="Login" component={LoginScreen} />
            ) : (
                <>
                    <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
                    <Stack.Screen name="UpcomingRides" component={UpcomingRidesScreen} />
                    <Stack.Screen name="SalaryLedger" component={SalaryLedgerScreen} />
                </>
            )}
        </Stack.Navigator>
    );
}
