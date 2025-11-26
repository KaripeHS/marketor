import { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { notificationsApi, Notification } from "@/services/api";
import { Colors } from "@/constants/config";

const NotificationIcons: Record<string, string> = {
    APPROVAL_REQUESTED: "document-text",
    APPROVAL_APPROVED: "checkmark-circle",
    APPROVAL_REJECTED: "close-circle",
    REVISION_REQUESTED: "create",
    COMMENT_ADDED: "chatbubble",
    MENTION: "at",
    PUBLISH_SUCCESS: "rocket",
    PUBLISH_FAILED: "warning",
    SYSTEM: "information-circle",
};

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadNotifications = async () => {
        try {
            const data = await notificationsApi.list();
            setNotifications(data);
        } catch (error) {
            console.error("Failed to load notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadNotifications();
        setRefreshing(false);
    }, []);

    const handleMarkRead = async (notification: Notification) => {
        if (notification.readAt) return;

        try {
            await notificationsApi.markRead(notification.id);
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notification.id
                        ? { ...n, readAt: new Date().toISOString() }
                        : n
                )
            );
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationsApi.markAllRead();
            setNotifications(prev =>
                prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
            );
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    const unreadCount = notifications.filter(n => !n.readAt).length;

    const renderItem = ({ item }: { item: Notification }) => {
        const isUnread = !item.readAt;
        const iconName = NotificationIcons[item.type] || "notifications";

        return (
            <TouchableOpacity
                style={[styles.card, isUnread && styles.cardUnread]}
                onPress={() => handleMarkRead(item)}
            >
                <View style={[styles.iconContainer, isUnread && styles.iconContainerUnread]}>
                    <Ionicons
                        name={iconName as any}
                        size={20}
                        color={isUnread ? Colors.light.primary : Colors.light.textSecondary}
                    />
                </View>
                <View style={styles.content}>
                    <Text style={[styles.title, isUnread && styles.titleUnread]}>
                        {item.title}
                    </Text>
                    <Text style={styles.body} numberOfLines={2}>
                        {item.body}
                    </Text>
                    <Text style={styles.date}>
                        {formatDate(item.createdAt)}
                    </Text>
                </View>
                {isUnread && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {unreadCount > 0 && (
                <View style={styles.header}>
                    <Text style={styles.unreadText}>{unreadCount} unread</Text>
                    <TouchableOpacity onPress={handleMarkAllRead}>
                        <Text style={styles.markAllText}>Mark all as read</Text>
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="notifications-off-outline" size={64} color={Colors.light.textSecondary} />
                        <Text style={styles.emptyTitle}>No notifications</Text>
                        <Text style={styles.emptyText}>You're all caught up!</Text>
                    </View>
                }
            />
        </View>
    );
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.surface,
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: Colors.light.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    unreadText: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.light.text,
    },
    markAllText: {
        fontSize: 14,
        color: Colors.light.primary,
        fontWeight: "500",
    },
    list: {
        padding: 16,
    },
    card: {
        flexDirection: "row",
        backgroundColor: Colors.light.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        alignItems: "flex-start",
    },
    cardUnread: {
        backgroundColor: Colors.light.primary + "08",
        borderLeftWidth: 3,
        borderLeftColor: Colors.light.primary,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.light.surface,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    iconContainerUnread: {
        backgroundColor: Colors.light.primary + "20",
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: "500",
        color: Colors.light.text,
        marginBottom: 4,
    },
    titleUnread: {
        fontWeight: "600",
    },
    body: {
        fontSize: 13,
        color: Colors.light.textSecondary,
        lineHeight: 18,
        marginBottom: 6,
    },
    date: {
        fontSize: 12,
        color: Colors.light.textSecondary,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.light.primary,
        marginLeft: 8,
        marginTop: 4,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: Colors.light.text,
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: Colors.light.textSecondary,
        marginTop: 4,
    },
});
