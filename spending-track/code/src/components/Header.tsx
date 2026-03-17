import { View, Text, Pressable } from 'react-native';
import { Bell, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface HeaderProps {
  onProfileClick: () => void;
  onNotificationClick: () => void;
  notificationCount?: number;
}

export function Header({ onProfileClick, onNotificationClick, notificationCount = 0 }: HeaderProps) {
  return (
    <View className="flex-row items-center justify-end gap-2 pt-6 pb-4 px-4">
      <Pressable
        onPress={onNotificationClick}
        className="relative w-10 h-10 rounded-full bg-white border border-border items-center justify-center shadow-sm"
      >
        <Bell size={20} color="#0f172a" />
        {notificationCount > 0 && (
          <View className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full items-center justify-center">
            <Text className="text-white text-xs">
              {notificationCount > 9 ? "9+" : notificationCount}
            </Text>
          </View>
        )}
      </Pressable>
      
      <Pressable
        onPress={onProfileClick}
        className="w-10 h-10 rounded-full shadow-sm overflow-hidden"
      >
        <LinearGradient
          colors={['#6366f1', '#4f46e5']}
          className="w-full h-full items-center justify-center"
        >
          <User size={20} color="white" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}
