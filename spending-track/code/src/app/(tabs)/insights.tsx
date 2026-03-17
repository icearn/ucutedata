import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, TrendingUp, Heart, AlertCircle, Percent } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/Header';
import { useState } from 'react';

export default function InsightsScreen() {
  const [notificationCount, setNotificationCount] = useState(3);

  const onProfileClick = () => console.log('Profile clicked');
  const onNotificationClick = () => console.log('Notification clicked');

  const insights = [
    {
      id: "1",
      type: "spending",
      icon: TrendingUp,
      title: "Smart Saving Opportunity",
      description: "You spent 23% more on food this month. Consider meal prepping to save $120/month.",
      color: "#f59e0b",
      priority: "high",
    },
    {
      id: "2",
      type: "health",
      icon: Heart,
      title: "Healthy Choices Detected",
      description: "Great job! Your health-related expenses increased by 15%, showing commitment to wellness.",
      color: "#10b981",
      priority: "medium",
    },
    {
      id: "3",
      type: "deal",
      icon: Percent,
      title: "Deal Alert: Fitness First",
      description: "Your favorite gym has a 20% off annual membership promotion ending this week.",
      color: "#6366f1",
      priority: "high",
    },
    {
      id: "4",
      type: "pattern",
      icon: AlertCircle,
      title: "Spending Pattern Alert",
      description: "You tend to overspend on weekends. Average weekend spending is 40% higher.",
      color: "#ef4444",
      priority: "medium",
    },
  ];

  const favoriteShops = [
    {
      id: "1",
      name: "Whole Foods Market",
      category: "Groceries",
      visits: 24,
      totalSpent: 1642.50,
      avgSpent: 68.44,
      image: "https://images.unsplash.com/photo-1651352650142-385087834d9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwZm9vZCUyMHNhbGFkfGVufDF8fHx8MTc2NDg0Mzc1MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
    {
      id: "2",
      name: "Starbucks Coffee",
      category: "Coffee & Cafes",
      visits: 42,
      totalSpent: 536.40,
      avgSpent: 12.77,
      image: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2ZmZWUlMjBzaG9wJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzY0NzI2NDUyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
    {
      id: "3",
      name: "Fitness First Gym",
      category: "Health & Fitness",
      visits: 18,
      totalSpent: 1619.82,
      avgSpent: 89.99,
      image: "https://images.unsplash.com/photo-1651352650142-385087834d9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwZm9vZCUyMHNhbGFkfGVufDF8fHx8MTc2NDg0Mzc1MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    },
  ];

  const recommendations = [
    {
      id: "1",
      title: "Group Fitness Classes",
      description: "Join group fitness classes at your gym - 30% discount for 3-month packages",
      savings: 89.99,
      validUntil: "Dec 15, 2024",
    },
    {
      id: "2",
      title: "Meal Delivery Service",
      description: "HelloFresh offering 50% off first 3 boxes - healthy meals delivered",
      savings: 120.00,
      validUntil: "Dec 10, 2024",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        <Header 
          onProfileClick={onProfileClick} 
          onNotificationClick={onNotificationClick}
          notificationCount={notificationCount}
        />
        
        <View className="px-4">
          <View className="pb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Sparkles size={24} color="#6366f1" />
              <Text className="text-3xl font-bold text-text">AI Insights</Text>
            </View>
            <Text className="text-text-secondary">
              Personalized recommendations based on your spending patterns
            </Text>
          </View>

          {/* Key Insights */}
          <View className="mb-6">
            <Text className="text-lg font-semibold mb-3 text-text">Key Insights</Text>
            <View className="gap-3">
              {insights.map((insight) => {
                const Icon = insight.icon;
                return (
                  <View
                    key={insight.id}
                    className="bg-white rounded-xl p-4 shadow-sm border border-border"
                  >
                    <View className="flex-row gap-3">
                      <View
                        className="w-10 h-10 rounded-lg items-center justify-center"
                        style={{ backgroundColor: `${insight.color}15` }}
                      >
                        <Icon size={20} color={insight.color} />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-start justify-between mb-1">
                          <Text className="text-sm font-semibold text-text">{insight.title}</Text>
                          {insight.priority === "high" && (
                            <View className="px-2 py-1 bg-red-50 rounded-full">
                              <Text className="text-xs text-red-600">Priority</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-sm text-text-secondary">{insight.description}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Favorite Shops */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-text">Favorite Shops</Text>
              <Pressable>
                <Text className="text-primary text-sm">View All</Text>
              </Pressable>
            </View>
            <View className="gap-3">
              {favoriteShops.map((shop) => (
                <View
                  key={shop.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm border border-border"
                >
                  <View className="flex-row gap-3 p-4">
                    <View className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        source={{ uri: shop.image }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold mb-1 text-text" numberOfLines={1}>{shop.name}</Text>
                      <Text className="text-xs text-text-secondary mb-2">
                        {shop.category}
                      </Text>
                      <View className="flex-row items-center gap-3">
                        <Text className="text-xs text-text-secondary">
                          {shop.visits} visits
                        </Text>
                        <Text className="text-xs text-text-secondary">
                          Avg: ${shop.avgSpent.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end justify-between">
                      <Text className="font-bold text-text">
                        ${shop.totalSpent.toFixed(2)}
                      </Text>
                      <Pressable>
                        <Text className="text-primary text-xs">Details</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Smart Recommendations */}
          <View className="mb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <Sparkles size={20} color="#f59e0b" />
              <Text className="text-lg font-semibold text-text">Smart Deals for You</Text>
            </View>
            <View className="gap-3">
              {recommendations.map((rec) => (
                <LinearGradient
                  key={rec.id}
                  colors={['#f59e0b', '#ea580c']}
                  className="rounded-xl p-4 shadow-lg"
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <Text className="text-white font-semibold">{rec.title}</Text>
                    <View className="px-2 py-1 bg-white/20 rounded-full">
                      <Text className="text-xs text-white">Save ${rec.savings}</Text>
                    </View>
                  </View>
                  <Text className="text-white/90 text-sm mb-3">{rec.description}</Text>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white/80 text-xs">Valid until {rec.validUntil}</Text>
                    <Pressable className="px-4 py-2 bg-white rounded-lg">
                      <Text className="text-accent text-sm font-semibold">Learn More</Text>
                    </Pressable>
                  </View>
                </LinearGradient>
              ))}
            </View>
          </View>

          {/* Health Insights */}
          <LinearGradient
            colors={['#10b981', '#16a34a']}
            className="rounded-2xl p-6 shadow-lg"
          >
            <View className="flex-row items-center gap-2 mb-3">
              <Heart size={24} color="white" />
              <Text className="text-white text-lg font-semibold">Health & Wellness Score</Text>
            </View>
            <View className="flex-row items-end gap-4 mb-3">
              <Text className="text-white text-3xl font-bold">82/100</Text>
              <Text className="text-white/80 mb-1">↑ 5 pts this month</Text>
            </View>
            <Text className="text-white/90 text-sm mb-4">
              Your healthy food purchases increased by 18% and gym visits are consistent. Keep it up!
            </Text>
            <Pressable className="w-full py-3 bg-white/20 rounded-xl border border-white/30 items-center">
              <Text className="text-white font-semibold">View Detailed Report</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
