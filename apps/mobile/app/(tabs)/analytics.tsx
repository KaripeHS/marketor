import { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
    Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { analyticsApi, AnalyticsOverview, PlatformMetrics } from "@/services/api";
import { Colors, Platforms } from "@/constants/config";

type Period = "7d" | "30d" | "90d";

export default function AnalyticsScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState<Period>("30d");
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics[]>([]);

    const loadData = async () => {
        try {
            const [overviewData, platforms] = await Promise.all([
                analyticsApi.getOverview(period),
                analyticsApi.getPlatforms(period),
            ]);
            setOverview(overviewData);
            setPlatformMetrics(platforms);
        } catch (error) {
            console.error("Failed to load analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [period]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [period]);

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const getTrendIcon = (value: number) => {
        if (value > 0) return { name: "trending-up", color: Colors.light.success };
        if (value < 0) return { name: "trending-down", color: Colors.light.error };
        return { name: "remove", color: Colors.light.textSecondary };
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* Period Selector */}
            <View style={styles.periodSelector}>
                {(["7d", "30d", "90d"] as Period[]).map((p) => (
                    <TouchableOpacity
                        key={p}
                        style={[styles.periodButton, period === p && styles.periodButtonActive]}
                        onPress={() => setPeriod(p)}
                    >
                        <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                            {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {overview && (
                <>
                    {/* Overview Stats */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Overview</Text>
                        <View style={styles.statsGrid}>
                            <MetricCard
                                icon="eye"
                                label="Total Views"
                                value={formatNumber(overview.metrics.totalViews)}
                                trend={overview.trend.views}
                                color={Colors.light.primary}
                            />
                            <MetricCard
                                icon="heart"
                                label="Total Likes"
                                value={formatNumber(overview.metrics.totalLikes)}
                                trend={overview.trend.likes}
                                color="#ef4444"
                            />
                            <MetricCard
                                icon="chatbubble"
                                label="Comments"
                                value={formatNumber(overview.metrics.totalComments)}
                                color="#3b82f6"
                            />
                            <MetricCard
                                icon="share-social"
                                label="Shares"
                                value={formatNumber(overview.metrics.totalShares)}
                                color="#22c55e"
                            />
                        </View>
                    </View>

                    {/* Key Metrics */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Key Metrics</Text>
                        <View style={styles.keyMetrics}>
                            <View style={styles.keyMetricCard}>
                                <View style={styles.keyMetricHeader}>
                                    <Ionicons name="people" size={24} color={Colors.light.primary} />
                                    <Text style={styles.keyMetricLabel}>Followers Gained</Text>
                                </View>
                                <Text style={styles.keyMetricValue}>
                                    +{formatNumber(overview.metrics.followersGained)}
                                </Text>
                            </View>

                            <View style={styles.keyMetricCard}>
                                <View style={styles.keyMetricHeader}>
                                    <Ionicons name="pulse" size={24} color={Colors.light.success} />
                                    <Text style={styles.keyMetricLabel}>Engagement Rate</Text>
                                </View>
                                <View style={styles.engagementContainer}>
                                    <Text style={styles.keyMetricValue}>
                                        {overview.metrics.engagementRate.toFixed(2)}%
                                    </Text>
                                    <View style={styles.trendBadge}>
                                        <Ionicons
                                            name={getTrendIcon(overview.trend.engagement).name as any}
                                            size={14}
                                            color={getTrendIcon(overview.trend.engagement).color}
                                        />
                                        <Text
                                            style={[
                                                styles.trendText,
                                                { color: getTrendIcon(overview.trend.engagement).color },
                                            ]}
                                        >
                                            {Math.abs(overview.trend.engagement).toFixed(1)}%
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </>
            )}

            {/* Platform Performance */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Platform Performance</Text>
                {platformMetrics.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="bar-chart-outline" size={48} color={Colors.light.textSecondary} />
                        <Text style={styles.emptyText}>No platform data yet</Text>
                    </View>
                ) : (
                    platformMetrics.map((platform) => (
                        <PlatformCard key={platform.platform} data={platform} />
                    ))
                )}
            </View>
        </ScrollView>
    );
}

function MetricCard({
    icon,
    label,
    value,
    trend,
    color,
}: {
    icon: string;
    label: string;
    value: string;
    trend?: number;
    color: string;
}) {
    return (
        <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: color + "20" }]}>
                <Ionicons name={icon as any} size={20} color={color} />
            </View>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
            {trend !== undefined && (
                <View style={styles.trendIndicator}>
                    <Ionicons
                        name={trend >= 0 ? "arrow-up" : "arrow-down"}
                        size={12}
                        color={trend >= 0 ? Colors.light.success : Colors.light.error}
                    />
                    <Text
                        style={[
                            styles.trendValue,
                            { color: trend >= 0 ? Colors.light.success : Colors.light.error },
                        ]}
                    >
                        {Math.abs(trend).toFixed(1)}%
                    </Text>
                </View>
            )}
        </View>
    );
}

function PlatformCard({ data }: { data: PlatformMetrics }) {
    const platformInfo = Platforms[data.platform as keyof typeof Platforms] || {
        name: data.platform,
        icon: "globe-outline",
        color: "#666",
    };

    return (
        <View style={styles.platformCard}>
            <View style={styles.platformHeader}>
                <View style={styles.platformInfo}>
                    <Ionicons
                        name={platformInfo.icon as any}
                        size={24}
                        color={platformInfo.color}
                    />
                    <Text style={styles.platformName}>{platformInfo.name}</Text>
                </View>
                <View style={styles.engagementBadge}>
                    <Text style={styles.engagementText}>
                        {data.engagementRate.toFixed(2)}% engagement
                    </Text>
                </View>
            </View>

            <View style={styles.platformStats}>
                <View style={styles.platformStat}>
                    <Ionicons name="eye-outline" size={16} color={Colors.light.textSecondary} />
                    <Text style={styles.platformStatValue}>{data.views.toLocaleString()}</Text>
                    <Text style={styles.platformStatLabel}>Views</Text>
                </View>
                <View style={styles.platformStat}>
                    <Ionicons name="heart-outline" size={16} color={Colors.light.textSecondary} />
                    <Text style={styles.platformStatValue}>{data.likes.toLocaleString()}</Text>
                    <Text style={styles.platformStatLabel}>Likes</Text>
                </View>
                <View style={styles.platformStat}>
                    <Ionicons name="chatbubble-outline" size={16} color={Colors.light.textSecondary} />
                    <Text style={styles.platformStatValue}>{data.comments.toLocaleString()}</Text>
                    <Text style={styles.platformStatLabel}>Comments</Text>
                </View>
                <View style={styles.platformStat}>
                    <Ionicons name="share-outline" size={16} color={Colors.light.textSecondary} />
                    <Text style={styles.platformStatValue}>{data.shares.toLocaleString()}</Text>
                    <Text style={styles.platformStatLabel}>Shares</Text>
                </View>
            </View>
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
    periodSelector: {
        flexDirection: "row",
        backgroundColor: Colors.light.background,
        padding: 12,
        gap: 8,
    },
    periodButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: Colors.light.surface,
        alignItems: "center",
    },
    periodButtonActive: {
        backgroundColor: Colors.light.primary,
    },
    periodText: {
        fontSize: 14,
        fontWeight: "500",
        color: Colors.light.textSecondary,
    },
    periodTextActive: {
        color: "#fff",
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: Colors.light.text,
        marginBottom: 12,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    metricCard: {
        width: (Dimensions.get("window").width - 48) / 2 - 5,
        backgroundColor: Colors.light.background,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
    },
    metricIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: Colors.light.text,
    },
    metricLabel: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        marginTop: 4,
    },
    trendIndicator: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        marginTop: 6,
    },
    trendValue: {
        fontSize: 12,
        fontWeight: "500",
    },
    keyMetrics: {
        gap: 12,
    },
    keyMetricCard: {
        backgroundColor: Colors.light.background,
        borderRadius: 12,
        padding: 16,
    },
    keyMetricHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
    },
    keyMetricLabel: {
        fontSize: 14,
        color: Colors.light.textSecondary,
    },
    keyMetricValue: {
        fontSize: 32,
        fontWeight: "bold",
        color: Colors.light.text,
    },
    engagementContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    trendBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: Colors.light.surface,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    trendText: {
        fontSize: 12,
        fontWeight: "500",
    },
    platformCard: {
        backgroundColor: Colors.light.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    platformHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    platformInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    platformName: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.light.text,
    },
    engagementBadge: {
        backgroundColor: Colors.light.surface,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    engagementText: {
        fontSize: 12,
        color: Colors.light.textSecondary,
        fontWeight: "500",
    },
    platformStats: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    platformStat: {
        alignItems: "center",
        gap: 4,
    },
    platformStatValue: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.light.text,
    },
    platformStatLabel: {
        fontSize: 11,
        color: Colors.light.textSecondary,
    },
    emptyState: {
        alignItems: "center",
        padding: 40,
        backgroundColor: Colors.light.background,
        borderRadius: 12,
    },
    emptyText: {
        fontSize: 14,
        color: Colors.light.textSecondary,
        marginTop: 12,
    },
});
