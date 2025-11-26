import { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/auth";
import { contentApi, campaignsApi, notificationsApi, ContentItem, Campaign } from "@/services/api";
import { Colors, ContentStates, Platforms } from "@/constants/config";

export default function DashboardScreen() {
    const { user, memberships, currentTenantId } = useAuthStore();
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalContent: 0,
        pendingApprovals: 0,
        scheduled: 0,
        published: 0,
        unreadNotifications: 0,
    });
    const [recentContent, setRecentContent] = useState<ContentItem[]>([]);

    const currentTenant = memberships.find(m => m.tenantId === currentTenantId);

    const loadData = async () => {
        try {
            const [content, unreadCount] = await Promise.all([
                contentApi.list(),
                notificationsApi.unreadCount(),
            ]);

            setRecentContent(content.slice(0, 5));
            setStats({
                totalContent: content.length,
                pendingApprovals: content.filter(c => c.state === "IN_REVIEW").length,
                scheduled: content.filter(c => c.state === "SCHEDULED").length,
                published: content.filter(c => c.state === "PUBLISHED").length,
                unreadNotifications: unreadCount,
            });
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
        }
    };

    useEffect(() => {
        loadData();
    }, [currentTenantId]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            <View style={styles.header}>
                <Text style={styles.greeting}>
                    Welcome back, {user?.name || user?.email?.split("@")[0]}!
                </Text>
                <Text style={styles.tenantName}>{currentTenant?.tenantName}</Text>
            </View>

            <View style={styles.statsGrid}>
                <StatCard
                    icon="document-text"
                    label="Total Content"
                    value={stats.totalContent}
                    color={Colors.light.primary}
                />
                <StatCard
                    icon="time"
                    label="Pending Review"
                    value={stats.pendingApprovals}
                    color={Colors.light.warning}
                />
                <StatCard
                    icon="calendar"
                    label="Scheduled"
                    value={stats.scheduled}
                    color="#3b82f6"
                />
                <StatCard
                    icon="checkmark-circle"
                    label="Published"
                    value={stats.published}
                    color={Colors.light.success}
                />
            </View>

            {stats.unreadNotifications > 0 && (
                <View style={styles.notificationBanner}>
                    <Ionicons name="notifications" size={20} color="#fff" />
                    <Text style={styles.notificationText}>
                        You have {stats.unreadNotifications} unread notification{stats.unreadNotifications !== 1 ? "s" : ""}
                    </Text>
                </View>
            )}

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Content</Text>
                {recentContent.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="document-outline" size={48} color={Colors.light.textSecondary} />
                        <Text style={styles.emptyText}>No content yet</Text>
                        <Text style={styles.emptySubtext}>Create your first piece of content</Text>
                    </View>
                ) : (
                    recentContent.map((item) => (
                        <ContentCard key={item.id} content={item} />
                    ))
                )}
            </View>
        </ScrollView>
    );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
    return (
        <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
                <Ionicons name={icon as any} size={24} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function ContentCard({ content }: { content: ContentItem }) {
    const stateInfo = ContentStates[content.state as keyof typeof ContentStates] || { label: content.state, color: "#666" };
    const platformInfo = Platforms[content.platform as keyof typeof Platforms];

    return (
        <TouchableOpacity style={styles.contentCard}>
            <View style={styles.contentHeader}>
                <View style={styles.platformBadge}>
                    {platformInfo && <Ionicons name={platformInfo.icon as any} size={16} color={platformInfo.color} />}
                    <Text style={styles.platformText}>{platformInfo?.name || content.platform}</Text>
                </View>
                <View style={[styles.stateBadge, { backgroundColor: stateInfo.color + "20" }]}>
                    <Text style={[styles.stateText, { color: stateInfo.color }]}>{stateInfo.label}</Text>
                </View>
            </View>
            <Text style={styles.contentTitle} numberOfLines={2}>
                {content.title || content.caption || "Untitled"}
            </Text>
            <Text style={styles.contentDate}>
                {new Date(content.createdAt).toLocaleDateString()}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.surface,
    },
    header: {
        padding: 20,
        backgroundColor: Colors.light.background,
    },
    greeting: {
        fontSize: 24,
        fontWeight: "bold",
        color: Colors.light.text,
    },
    tenantName: {
        fontSize: 14,
        color: Colors.light.textSecondary,
        marginTop: 4,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        padding: 10,
        gap: 10,
    },
    statCard: {
        flex: 1,
        minWidth: "45%",
        backgroundColor: Colors.light.background,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
    },
    statIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    statValue: {
        fontSize: 28,
        fontWeight: "bold",
        color: Colors.light.text,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        marginTop: 4,
    },
    notificationBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.light.primary,
        margin: 10,
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    notificationText: {
        color: "#fff",
        fontWeight: "500",
    },
    section: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: Colors.light.text,
        marginBottom: 12,
    },
    emptyState: {
        alignItems: "center",
        padding: 40,
        backgroundColor: Colors.light.background,
        borderRadius: 12,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: "500",
        color: Colors.light.text,
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.light.textSecondary,
        marginTop: 4,
    },
    contentCard: {
        backgroundColor: Colors.light.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
    },
    contentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    platformBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    platformText: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        fontWeight: "500",
    },
    stateBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    stateText: {
        fontSize: 12,
        fontWeight: "600",
    },
    contentTitle: {
        fontSize: 16,
        fontWeight: "500",
        color: Colors.light.text,
        marginBottom: 4,
    },
    contentDate: {
        fontSize: 12,
        color: Colors.light.textSecondary,
    },
});
