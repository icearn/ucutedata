import { View, Text, Pressable } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: number;
  color?: string;
}

export function StatCard({ icon: Icon, label, value, change, color = "#6366f1" }: StatCardProps) {
  return (
    <Pressable className="bg-white rounded-xl p-4 shadow-sm border border-border flex-1 h-full active:bg-gray-50">
      <View className="flex-row items-start justify-between mb-3">
        <View
          className="w-10 h-10 rounded-lg items-center justify-center bg-opacity-10"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={20} color={color} />
        </View>
        {change !== undefined && (
          <View
            className={`px-2 py-1 rounded-full ${
              change >= 0
                ? "bg-green-50"
                : "bg-red-50"
            }`}
          >
            <Text className={`text-xs font-medium ${
               change >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              {change >= 0 ? "+" : ""}
              {change}%
            </Text>
          </View>
        )}
      </View>
      <Text className="text-xs text-text-secondary mb-1 font-medium">{label}</Text>
      <Text className="font-bold text-xl text-text">{value}</Text>
    </Pressable>
  );
}
