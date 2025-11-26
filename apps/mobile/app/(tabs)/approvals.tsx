import { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { contentApi, approvalsApi, ContentItem } from "@/services/api";
import { Colors, ContentStates, Platforms } from "@/constants/config";

export default function ApprovalsScreen() {
    const [pendingContent, setPendingContent] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadPendingApprovals = async () => {
        try {
            const content = await contentApi.list({ state: "IN_REVIEW" });
            setPendingContent(content);
        } catch (error) {
            console.error("Failed to load pending approvals:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPendingApprovals();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadPendingApprovals();
        setRefreshing(false);
    }, []);

    const handleApprove = async (item: ContentItem) => {
        Alert.alert(
            "Approve Content",
            "Are you sure you want to approve this content?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Approve",
                    style: "default",
                    onPress: async () => {
                        setActionLoading(item.id);
                        try {
                            await approvalsApi.approve(item.id);
                            setPendingContent(prev => prev.filter(c => c.id !== item.id));
                            Alert.alert("Success", "Content approved successfully");
                        } catch (error) {
                            Alert.alert("Error", "Failed to approve content");
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    };

    const handleReject = async (item: ContentItem) => {
        Alert.prompt(
            "Reject Content",
            "Please provide a reason for rejection:",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reject",
                    style: "destructive",
                    onPress: async (comment) => {
                        if (!comment?.trim()) {
                            Alert.alert("Error", "Please provide a reason");
                            return;
                        }
                        setActionLoading(item.id);
                        try {
                            await approvalsApi.reject(item.id, comment);
                            setPendingContent(prev => prev.filter(c => c.id !== item.id));
                            Alert.alert("Done", "Content rejected");
                        } catch (error) {
                            Alert.alert("Error", "Failed to reject content");
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ],
            "plain-text"
        );
    };

    const renderItem = ({ item }: { item: ContentItem }) => {
        const platformInfo = Platforms[item.platform as keyof typeof Platforms];
        const isLoading = actionLoading === item.id;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.platformBadge}>
                        {platformInfo && (
                            <Ionicons name={platformInfo.icon as any} size={18} color={platformInfo.color} />
                        )}
                        <Text style={styles.platformText}>{platformInfo?.name || item.platform}</Text>
                    </View>
                    <Text style={styles.format}>{item.format}</Text>
                </View>

                <Text style={styles.title} numberOfLines={2}>
                    {item.title || item.caption || "Untitled content"}
                </Text>

                {item.caption && (
                    <Text style={styles.caption} numberOfLines={3}>
                        {item.caption}
                    </Text>
                )}

                {item.hashtags && item.hashtags.length > 0 && (
                    <Text style={styles.hashtags} numberOfLines={1}>
                        {item.hashtags.map(h => `#${h}`).join(" ")}
                    </Text>
                )}

                <Text style={styles.date}>
                    Created {new Date(item.createdAt).toLocaleDateString()}
                </Text>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.button, styles.rejectButton]}
                        onPress={() => handleReject(item)}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color={Colors.light.error} />
                        ) : (
                            <>
                                <Ionicons name="close-circle" size={20} color={Colors.light.error} />
                                <Text style={[styles.buttonText, { color: Colors.light.error }]}>Reject</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.approveButton]}
                        onPress={() => handleApprove(item)}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                <Text style={[styles.buttonText, { color: "#fff" }]}>Approve</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
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
            <FlatList
                data={pendingContent}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="checkmark-done-circle" size={64} color={Colors.light.success} />
                        <Text style={styles.emptyTitle}>All caught up!</Text>
                        <Text style={styles.emptyText}>No pending approvals</Text>
                    </View>
                }
            />
        </View>
    );
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
    list: {
        padding: 16,
    },
    card: {
        backgroundColor: Colors.light.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    platformBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    platformText: {
        fontSize: 14,
        fontWeight: "500",
        color: Colors.light.text,
    },
    format: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        backgroundColor: Colors.light.surface,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        color: Colors.light.text,
        marginBottom: 8,
    },
    caption: {
        fontSize: 14,
        color: Colors.light.textSecondary,
        marginBottom: 8,
        lineHeight: 20,
    },
    hashtags: {
        fontSize: 12,
        color: Colors.light.primary,
        marginBottom: 8,
    },
    date: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        marginBottom: 16,
    },
    actions: {
        flexDirection: "row",
        gap: 12,
    },
    button: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 8,
        gap: 6,
    },
    rejectButton: {
        backgroundColor: Colors.light.error + "10",
        borderWidth: 1,
        borderColor: Colors.light.error + "30",
    },
    approveButton: {
        backgroundColor: Colors.light.success,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: "600",
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
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
