import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth";
import { Colors } from "@/constants/config";

export default function SettingsScreen() {
    const { user, memberships, currentTenantId, logout, setTenant } = useAuthStore();
    const currentTenant = memberships.find(m => m.tenantId === currentTenantId);

    const handleLogout = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    style: "destructive",
                    onPress: async () => {
                        await logout();
                        router.replace("/(auth)/login");
                    },
                },
            ]
        );
    };

    const handleSwitchTenant = () => {
        if (memberships.length <= 1) {
            Alert.alert("Info", "You only have access to one workspace");
            return;
        }

        Alert.alert(
            "Switch Workspace",
            "Select a workspace:",
            memberships.map(m => ({
                text: m.tenantName,
                onPress: () => setTenant(m.tenantId),
            }))
        );
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.profileSection}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
                    </Text>
                </View>
                <Text style={styles.userName}>{user?.name || "User"}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Workspace</Text>
                <TouchableOpacity style={styles.menuItem} onPress={handleSwitchTenant}>
                    <View style={styles.menuLeft}>
                        <Ionicons name="business-outline" size={22} color={Colors.light.text} />
                        <View style={styles.menuTextContainer}>
                            <Text style={styles.menuText}>Current Workspace</Text>
                            <Text style={styles.menuSubtext}>{currentTenant?.tenantName}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
                </TouchableOpacity>

                <View style={styles.menuItem}>
                    <View style={styles.menuLeft}>
                        <Ionicons name="shield-checkmark-outline" size={22} color={Colors.light.text} />
                        <View style={styles.menuTextContainer}>
                            <Text style={styles.menuText}>Role</Text>
                            <Text style={styles.menuSubtext}>{currentTenant?.role || "Member"}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preferences</Text>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuLeft}>
                        <Ionicons name="notifications-outline" size={22} color={Colors.light.text} />
                        <Text style={styles.menuText}>Notifications</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuLeft}>
                        <Ionicons name="moon-outline" size={22} color={Colors.light.text} />
                        <Text style={styles.menuText}>Appearance</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Support</Text>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuLeft}>
                        <Ionicons name="help-circle-outline" size={22} color={Colors.light.text} />
                        <Text style={styles.menuText}>Help Center</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuLeft}>
                        <Ionicons name="document-text-outline" size={22} color={Colors.light.text} />
                        <Text style={styles.menuText}>Terms of Service</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuLeft}>
                        <Ionicons name="lock-closed-outline" size={22} color={Colors.light.text} />
                        <Text style={styles.menuText}>Privacy Policy</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color={Colors.light.error} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.version}>Version 1.0.0</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.surface,
    },
    profileSection: {
        alignItems: "center",
        padding: 24,
        backgroundColor: Colors.light.background,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.light.primary,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#fff",
    },
    userName: {
        fontSize: 20,
        fontWeight: "600",
        color: Colors.light.text,
    },
    userEmail: {
        fontSize: 14,
        color: Colors.light.textSecondary,
        marginTop: 4,
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: Colors.light.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginLeft: 16,
        marginBottom: 8,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: Colors.light.background,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    menuLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    menuTextContainer: {
        marginLeft: 0,
    },
    menuText: {
        fontSize: 16,
        color: Colors.light.text,
    },
    menuSubtext: {
        fontSize: 13,
        color: Colors.light.textSecondary,
        marginTop: 2,
    },
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.light.background,
        paddingVertical: 16,
        gap: 8,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.light.error,
    },
    version: {
        textAlign: "center",
        fontSize: 12,
        color: Colors.light.textSecondary,
        marginTop: 24,
        marginBottom: 40,
    },
});
