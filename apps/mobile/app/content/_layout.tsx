import { Stack } from "expo-router";
import { Colors } from "@/constants/config";

export default function ContentLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: Colors.light.background,
                },
                headerTintColor: Colors.light.text,
                headerBackTitle: "Back",
            }}
        />
    );
}
