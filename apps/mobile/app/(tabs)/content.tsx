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
import { router } from "expo-router";
import { contentApi, ContentItem } from "@/services/api";
import { Colors, ContentStates, Platforms } from "@/constants/config";

type FilterState = "all" | "DRAFT" | "IN_REVIEW" | "APPROVED" | "SCHEDULED" | "PUBLISHED";

export default function ContentScreen() {
    const [content, setContent] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterState>("all");

    const loadContent = async () => {
        try {
            const params = filter === "all" ? {} : { state: filter };
            const data = await contentApi.list(params);
            setContent(data);
        } catch (error) {
            console.error("Failed to load content:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadContent();
    }, [filter]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadContent();
        setRefreshing(false);
    }, [filter]);

    const filters: { key: FilterState; label: string }[] = [
        { key: "all", label: "All" },
        { key: "DRAFT", label: "Drafts" },
        { key: "IN_REVIEW", label: "Review" },
        { key: "APPROVED", label: "Approved" },
        { key: "SCHEDULED", label: "Scheduled" },
        { key: "PUBLISHED", label: "Published" },
    ];

    const renderItem = ({ item }: { item: ContentItem }) => {
        const stateInfo = ContentStates[item.state as keyof typeof ContentStates] || { label: item.state, color: "#666" };
        const platformInfo = Platforms[item.platform as keyof typeof Platforms];

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/content/${item.id}`)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.platformBadge}>
                        {platformInfo && (
                            <Ionicons name={platformInfo.icon as any} size={16} color={platformInfo.color} />
                        )}
                        <Text style={styles.platformText}>{platformInfo?.name || item.platform}</Text>
                    </View>
                    <View style={[styles.stateBadge, { backgroundColor: stateInfo.color + "20" }]}>
                        <Text style={[styles.stateText, { color: stateInfo.color }]}>{stateInfo.label}</Text>
                    </View>
                </View>

                <Text style={styles.title} numberOfLines={2}>
                    {item.title || item.caption || "Untitled content"}
                </Text>

                <View style={styles.cardFooter}>
                    <Text style={styles.format}>{item.format}</Text>
                    <Text style={styles.date}>
                        {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                </View>

                {item.scheduledAt && (
                    <View style={styles.scheduledBanner}>
                        <Ionicons name="calendar" size={14} color={Colors.light.primary} />
                        <Text style={styles.scheduledText}>
                            Scheduled: {new Date(item.scheduledAt).toLocaleString()}
                        </Text>
                    </View>
                )}
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
            <View style={styles.filtersContainer}>
                <FlatList
                    horizontal
                    data={filters}
                    keyExtractor={(item) => item.key}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filters}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterButton,
                                filter === item.key && styles.filterButtonActive,
                            ]}
                            onPress={() => setFilter(item.key)}
                        >
                            <Text
                                style={[
                                    styles.filterText,
                                    filter === item.key && styles.filterTextActive,
                                ]}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            <FlatList
                data={content}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="document-outline" size={64} color={Colors.light.textSecondary} />
                        <Text style={styles.emptyTitle}>No content found</Text>
                        <Text style={styles.emptyText}>
                            {filter === "all"
                                ? "Create your first piece of content"
                                : `No ${filter.toLowerCase().replace("_", " ")} content`}
                        </Text>
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
    filtersContainer: {
        backgroundColor: Colors.light.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    filters: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.light.surface,
        marginRight: 8,
    },
    filterButtonActive: {
        backgroundColor: Colors.light.primary,
    },
    filterText: {
        fontSize: 14,
        color: Colors.light.textSecondary,
        fontWeight: "500",
    },
    filterTextActive: {
        color: "#fff",
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
        fontSize: 12,
        fontWeight: "500",
        color: Colors.light.textSecondary,
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
    title: {
        fontSize: 16,
        fontWeight: "500",
        color: Colors.light.text,
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    format: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        backgroundColor: Colors.light.surface,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    date: {
        fontSize: 12,
        color: Colors.light.textSecondary,
    },
    scheduledBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.light.border,
    },
    scheduledText: {
        fontSize: 12,
        color: Colors.light.primary,
        fontWeight: "500",
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
