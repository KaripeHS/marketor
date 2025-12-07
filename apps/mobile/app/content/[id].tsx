import { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { contentApi, ContentItem } from "@/services/api";
import { Colors, ContentStates, Platforms } from "@/constants/config";

export default function ContentDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [content, setContent] = useState<ContentItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editedCaption, setEditedCaption] = useState("");
    const [editedTitle, setEditedTitle] = useState("");

    useEffect(() => {
        loadContent();
    }, [id]);

    const loadContent = async () => {
        if (!id) return;
        try {
            const data = await contentApi.get(id);
            setContent(data);
            setEditedCaption(data.caption || "");
            setEditedTitle(data.title || "");
        } catch (error) {
            console.error("Failed to load content:", error);
            Alert.alert("Error", "Failed to load content");
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleStateChange = async (newState: string) => {
        if (!content) return;

        Alert.alert(
            "Change Status",
            `Are you sure you want to change status to ${ContentStates[newState as keyof typeof ContentStates]?.label || newState}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        try {
                            const updated = await contentApi.updateState(content.id, newState);
                            setContent(updated);
                            Alert.alert("Success", "Status updated successfully");
                        } catch (error) {
                            Alert.alert("Error", "Failed to update status");
                        }
                    },
                },
            ]
        );
    };

    const handleSave = async () => {
        if (!content) return;
        setSaving(true);
        try {
            // In a real app, this would call an update endpoint
            Alert.alert("Success", "Changes saved successfully");
            setContent({
                ...content,
                title: editedTitle,
                caption: editedCaption,
            });
            setEditMode(false);
        } catch (error) {
            Alert.alert("Error", "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
            </View>
        );
    }

    if (!content) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Content not found</Text>
            </View>
        );
    }

    const stateInfo = ContentStates[content.state as keyof typeof ContentStates] || {
        label: content.state,
        color: "#666",
    };
    const platformInfo = Platforms[content.platform as keyof typeof Platforms];

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <Stack.Screen
                options={{
                    title: content.title || "Content Details",
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() => {
                                if (editMode) {
                                    handleSave();
                                } else {
                                    setEditMode(true);
                                }
                            }}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color={Colors.light.primary} />
                            ) : (
                                <Text style={styles.editButton}>
                                    {editMode ? "Save" : "Edit"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    ),
                }}
            />

            <ScrollView style={styles.scrollView}>
                {/* Header Info */}
                <View style={styles.header}>
                    <View style={styles.platformBadge}>
                        {platformInfo && (
                            <Ionicons
                                name={platformInfo.icon as any}
                                size={20}
                                color={platformInfo.color}
                            />
                        )}
                        <Text style={styles.platformText}>
                            {platformInfo?.name || content.platform}
                        </Text>
                    </View>
                    <View style={[styles.stateBadge, { backgroundColor: stateInfo.color + "20" }]}>
                        <View style={[styles.stateDot, { backgroundColor: stateInfo.color }]} />
                        <Text style={[styles.stateText, { color: stateInfo.color }]}>
                            {stateInfo.label}
                        </Text>
                    </View>
                </View>

                {/* Title */}
                <View style={styles.section}>
                    <Text style={styles.label}>Title</Text>
                    {editMode ? (
                        <TextInput
                            style={styles.input}
                            value={editedTitle}
                            onChangeText={setEditedTitle}
                            placeholder="Enter title..."
                            placeholderTextColor={Colors.light.textSecondary}
                        />
                    ) : (
                        <Text style={styles.value}>
                            {content.title || "No title"}
                        </Text>
                    )}
                </View>

                {/* Caption */}
                <View style={styles.section}>
                    <Text style={styles.label}>Caption</Text>
                    {editMode ? (
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={editedCaption}
                            onChangeText={setEditedCaption}
                            placeholder="Enter caption..."
                            placeholderTextColor={Colors.light.textSecondary}
                            multiline
                            numberOfLines={6}
                            textAlignVertical="top"
                        />
                    ) : (
                        <Text style={styles.value}>
                            {content.caption || "No caption"}
                        </Text>
                    )}
                </View>

                {/* Hashtags */}
                {content.hashtags && content.hashtags.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.label}>Hashtags</Text>
                        <View style={styles.hashtagsContainer}>
                            {content.hashtags.map((tag, index) => (
                                <View key={index} style={styles.hashtag}>
                                    <Text style={styles.hashtagText}>#{tag}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Script */}
                {content.script && (
                    <View style={styles.section}>
                        <Text style={styles.label}>Script</Text>
                        <View style={styles.scriptContainer}>
                            <Text style={styles.scriptText}>{content.script}</Text>
                        </View>
                    </View>
                )}

                {/* Schedule */}
                {content.scheduledAt && (
                    <View style={styles.section}>
                        <View style={styles.scheduleCard}>
                            <Ionicons name="calendar" size={24} color={Colors.light.primary} />
                            <View style={styles.scheduleInfo}>
                                <Text style={styles.scheduleLabel}>Scheduled for</Text>
                                <Text style={styles.scheduleDate}>
                                    {new Date(content.scheduledAt).toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Meta Information */}
                <View style={styles.section}>
                    <Text style={styles.label}>Details</Text>
                    <View style={styles.metaCard}>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Format</Text>
                            <Text style={styles.metaValue}>{content.format}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Created</Text>
                            <Text style={styles.metaValue}>
                                {new Date(content.createdAt).toLocaleDateString()}
                            </Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Updated</Text>
                            <Text style={styles.metaValue}>
                                {new Date(content.updatedAt).toLocaleDateString()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Actions */}
                {!editMode && (
                    <View style={styles.actionsSection}>
                        <Text style={styles.label}>Actions</Text>
                        <View style={styles.actionsGrid}>
                            {content.state === "DRAFT" && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: Colors.light.warning + "20" }]}
                                    onPress={() => handleStateChange("IN_REVIEW")}
                                >
                                    <Ionicons name="send" size={20} color={Colors.light.warning} />
                                    <Text style={[styles.actionText, { color: Colors.light.warning }]}>
                                        Submit for Review
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {content.state === "APPROVED" && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: Colors.light.primary + "20" }]}
                                    onPress={() => handleStateChange("SCHEDULED")}
                                >
                                    <Ionicons name="calendar" size={20} color={Colors.light.primary} />
                                    <Text style={[styles.actionText, { color: Colors.light.primary }]}>
                                        Schedule Post
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {content.state === "SCHEDULED" && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: Colors.light.success + "20" }]}
                                    onPress={() => handleStateChange("PUBLISHED")}
                                >
                                    <Ionicons name="rocket" size={20} color={Colors.light.success} />
                                    <Text style={[styles.actionText, { color: Colors.light.success }]}>
                                        Publish Now
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>

            {editMode && (
                <View style={styles.editFooter}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                            setEditMode(false);
                            setEditedCaption(content.caption || "");
                            setEditedTitle(content.title || "");
                        }}
                    >
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </KeyboardAvoidingView>
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
    errorText: {
        fontSize: 16,
        color: Colors.light.textSecondary,
    },
    scrollView: {
        flex: 1,
    },
    editButton: {
        fontSize: 16,
        color: Colors.light.primary,
        fontWeight: "600",
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
    platformBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    platformText: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.light.text,
    },
    stateBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    stateDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    stateText: {
        fontSize: 14,
        fontWeight: "600",
    },
    section: {
        padding: 16,
        backgroundColor: Colors.light.background,
        marginTop: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.light.textSecondary,
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    value: {
        fontSize: 16,
        color: Colors.light.text,
        lineHeight: 24,
    },
    input: {
        backgroundColor: Colors.light.surface,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: Colors.light.text,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    textArea: {
        minHeight: 120,
    },
    hashtagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    hashtag: {
        backgroundColor: Colors.light.primary + "20",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    hashtagText: {
        fontSize: 14,
        color: Colors.light.primary,
        fontWeight: "500",
    },
    scriptContainer: {
        backgroundColor: Colors.light.surface,
        padding: 16,
        borderRadius: 8,
    },
    scriptText: {
        fontSize: 14,
        color: Colors.light.text,
        lineHeight: 22,
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    scheduleCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        backgroundColor: Colors.light.primary + "10",
        padding: 16,
        borderRadius: 12,
    },
    scheduleInfo: {
        flex: 1,
    },
    scheduleLabel: {
        fontSize: 12,
        color: Colors.light.textSecondary,
    },
    scheduleDate: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.light.text,
        marginTop: 2,
    },
    metaCard: {
        backgroundColor: Colors.light.surface,
        borderRadius: 8,
        padding: 4,
    },
    metaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    metaLabel: {
        fontSize: 14,
        color: Colors.light.textSecondary,
    },
    metaValue: {
        fontSize: 14,
        color: Colors.light.text,
        fontWeight: "500",
    },
    actionsSection: {
        padding: 16,
        backgroundColor: Colors.light.background,
        marginTop: 8,
        marginBottom: 24,
    },
    actionsGrid: {
        gap: 12,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 16,
        borderRadius: 12,
    },
    actionText: {
        fontSize: 16,
        fontWeight: "600",
    },
    editFooter: {
        flexDirection: "row",
        padding: 16,
        gap: 12,
        backgroundColor: Colors.light.background,
        borderTopWidth: 1,
        borderTopColor: Colors.light.border,
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: Colors.light.surface,
        alignItems: "center",
    },
    cancelText: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.light.textSecondary,
    },
    saveButton: {
        flex: 2,
        padding: 16,
        borderRadius: 12,
        backgroundColor: Colors.light.primary,
        alignItems: "center",
    },
    saveText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
    },
});
