import { Stack } from 'expo-router';
import { Colors } from '../../constants/Colors';

export default function ItemLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.dark.background },
            }}
        />
    );
}
