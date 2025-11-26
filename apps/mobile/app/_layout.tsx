import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/store/auth";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const { isLoading, loadAuth } = useAuthStore();

    useEffect(() => {
        loadAuth().finally(() => {
            SplashScreen.hideAsync();
        });
    }, []);

    if (isLoading) {
        return null;
    }

    return (
        <>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
            </Stack>
            <StatusBar style="auto" />
        </>
    );
}
