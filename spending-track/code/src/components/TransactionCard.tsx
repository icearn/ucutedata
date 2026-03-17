import { View, Text, Pressable } from 'react-native';
import { Star, MapPin, Image as ImageIcon } from 'lucide-react-native';

interface Transaction {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  location?: string;
  image?: string;
  isFavorite?: boolean;
}

interface TransactionCardProps {
  transaction: Transaction;
  onToggleFavorite?: (id: string) => void;
}

export function TransactionCard({ transaction, onToggleFavorite }: TransactionCardProps) {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      food: "#f59e0b",
      transport: "#3b82f6",
      health: "#10b981",
      entertainment: "#ec4899",
      shopping: "#8b5cf6",
      utilities: "#06b6d4",
    };
    return colors[category.toLowerCase()] || "#6b7280";
  };

  const categoryColor = getCategoryColor(transaction.category);

  return (
    <View className="bg-white rounded-xl p-4 shadow-sm border border-border mb-3 flex-row justify-between">
      <View className="flex-row items-start flex-1 gap-3">
        {transaction.image && (
          <View className="w-12 h-12 rounded-lg bg-gray-100 items-center justify-center overflow-hidden">
             <ImageIcon size={20} color="#9ca3af" />
          </View>
        )}
        <View className="flex-1">
          <Text className="font-semibold text-text mb-1" numberOfLines={1}>
            {transaction.title}
          </Text>
          <View className="flex-row items-center gap-2 mb-2 flex-wrap">
            <View
              className="px-2 py-1 rounded-full"
              style={{
                backgroundColor: `${categoryColor}20`,
              }}
            >
              <Text className="text-xs" style={{ color: categoryColor }}>{transaction.category}</Text>
            </View>
            {transaction.location && (
              <View className="flex-row items-center gap-1">
                <MapPin size={12} color="#64748b" />
                <Text className="text-xs text-text-secondary" numberOfLines={1}>{transaction.location}</Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-text-secondary">
            {transaction.date}
          </Text>
        </View>
      </View>
      <View className="items-end gap-2 ml-3">
        <Text className="font-bold text-text">
          ${transaction.amount.toFixed(2)}
        </Text>
        {onToggleFavorite && (
          <Pressable
            onPress={() => onToggleFavorite(transaction.id)}
            className="p-1"
          >
            <Star
              size={16}
              color={transaction.isFavorite ? "#f59e0b" : "#d1d5db"}
              fill={transaction.isFavorite ? "#f59e0b" : "transparent"}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}
