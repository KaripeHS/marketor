import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/config";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors.light.primary,
                tabBarInactiveTintColor: Colors.light.textSecondary,
                tabBarStyle: {
                    backgroundColor: Colors.light.background,
                    borderTopColor: Colors.light.border,
                },
                headerStyle: {
                    backgroundColor: Colors.light.background,
                },
                headerTintColor: Colors.light.text,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="content"
                options={{
                    title: "Content",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="document-text-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="campaigns"
                options={{
                    title: "Campaigns",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="megaphone-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="analytics"
                options={{
                    title: "Analytics",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="bar-chart-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="approvals"
                options={{
                    title: "Approvals",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="checkmark-circle-outline" size={size} color={color} />
                    ),
                    href: null, // Hide from tab bar, accessible via navigation
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: "Inbox",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="notifications-outline" size={size} color={color} />
                    ),
                    href: null, // Hide from tab bar, accessible via navigation
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="settings-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
