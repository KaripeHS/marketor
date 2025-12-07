import { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    TextInput,
    Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { campaignsApi, Campaign, contentApi, ContentItem } from "@/services/api";
import { Colors } from "@/constants/config";

const CampaignStatusColors: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: "#22c55e20", text: "#22c55e" },
    PAUSED: { bg: "#f59e0b20", text: "#f59e0b" },
    DRAFT: { bg: "#64748b20", text: "#64748b" },
    COMPLETED: { bg: "#3b82f620", text: "#3b82f6" },
};

export default function CampaignsScreen() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [contentCounts, setContentCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCampaignName, setNewCampaignName] = useState("");
    const [creating, setCreating] = useState(false);

    const loadCampaigns = async () => {
        try {
            const [campaignsData, contentData] = await Promise.all([
                campaignsApi.list(),
                contentApi.list(),
            ]);
            setCampaigns(campaignsData);

            // Count content per campaign
            const counts: Record<string, number> = {};
            contentData.forEach((item: ContentItem) => {
                counts[item.campaignId] = (counts[item.campaignId] || 0) + 1;
            });
            setContentCounts(counts);
        } catch (error) {
            console.error("Failed to load campaigns:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCampaigns();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadCampaigns();
        setRefreshing(false);
    }, []);

    const handleCreateCampaign = async () => {
        if (!newCampaignName.trim()) {
            Alert.alert("Error", "Please enter a campaign name");
            return;
        }

        setCreating(true);
        try {
            await campaignsApi.create({ name: newCampaignName.trim() });
            setShowCreateModal(false);
            setNewCampaignName("");
            loadCampaigns();
            Alert.alert("Success", "Campaign created successfully");
        } catch (error) {
            Alert.alert("Error", "Failed to create campaign");
        } finally {
            setCreating(false);
        }
    };

    const renderItem = ({ item }: { item: Campaign }) => {
        const statusColors = CampaignStatusColors[item.status] || CampaignStatusColors.DRAFT;
        const contentCount = contentCounts[item.id] || 0;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/campaign/${item.id}`)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="megaphone" size={24} color={Colors.light.primary} />
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                        <Text style={[styles.statusText, { color: statusColors.text }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>

                <Text style={styles.campaignName}>{item.name}</Text>

                <View style={styles.cardFooter}>
                    <View style={styles.stat}>
                        <Ionicons name="document-text-outline" size={16} color={Colors.light.textSecondary} />
                        <Text style={styles.statText}>{contentCount} content items</Text>
                    </View>
                    <View style={styles.stat}>
                        <Ionicons name="calendar-outline" size={16} color={Colors.light.textSecondary} />
                        <Text style={styles.statText}>
                            {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                <View style={styles.arrowContainer}>
                    <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
                </View>
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
            <FlatList
                data={campaigns}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="megaphone-outline" size={64} color={Colors.light.textSecondary} />
                        <Text style={styles.emptyTitle}>No campaigns yet</Text>
                        <Text style={styles.emptyText}>
                            Create your first campaign to organize your content
                        </Text>
                        <TouchableOpacity
                            style={styles.createButton}
                            onPress={() => setShowCreateModal(true)}
                        >
                            <Ionicons name="add" size={20} color="#fff" />
                            <Text style={styles.createButtonText}>Create Campaign</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {campaigns.length > 0 && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => setShowCreateModal(true)}
                >
                    <Ionicons name="add" size={28} color="#fff" />
                </TouchableOpacity>
            )}

            {/* Create Campaign Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowCreateModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                            <Text style={styles.modalCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>New Campaign</Text>
                        <TouchableOpacity
                            onPress={handleCreateCampaign}
                            disabled={creating || !newCampaignName.trim()}
                        >
                            {creating ? (
                                <ActivityIndicator size="small" color={Colors.light.primary} />
                            ) : (
                                <Text
                                    style={[
                                        styles.modalCreate,
                                        !newCampaignName.trim() && styles.modalCreateDisabled,
                                    ]}
                                >
                                    Create
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalContent}>
                        <Text style={styles.inputLabel}>Campaign Name</Text>
                        <TextInput
                            style={styles.input}
                            value={newCampaignName}
                            onChangeText={setNewCampaignName}
                            placeholder="e.g., Summer Product Launch"
                            placeholderTextColor={Colors.light.textSecondary}
                            autoFocus
                        />
                    </View>
                </View>
            </Modal>
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
        position: "relative",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.light.primary + "20",
        alignItems: "center",
        justifyContent: "center",
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
    },
    campaignName: {
        fontSize: 18,
        fontWeight: "600",
        color: Colors.light.text,
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: "row",
        gap: 16,
    },
    stat: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    statText: {
        fontSize: 13,
        color: Colors.light.textSecondary,
    },
    arrowContainer: {
        position: "absolute",
        right: 16,
        top: "50%",
        marginTop: -10,
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
        marginTop: 8,
        textAlign: "center",
        paddingHorizontal: 40,
    },
    createButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        marginTop: 24,
    },
    createButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },
    fab: {
        position: "absolute",
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.light.primary,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: Colors.light.surface,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: Colors.light.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    modalCancel: {
        fontSize: 16,
        color: Colors.light.textSecondary,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: "600",
        color: Colors.light.text,
    },
    modalCreate: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.light.primary,
    },
    modalCreateDisabled: {
        color: Colors.light.textSecondary,
    },
    modalContent: {
        padding: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.light.textSecondary,
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: Colors.light.background,
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        color: Colors.light.text,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
});
