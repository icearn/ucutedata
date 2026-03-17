import { View, Text, ScrollView, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, Filter } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { TransactionCard } from '@/components/TransactionCard';
import { useState } from 'react';

export default function TransactionsScreen() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [notificationCount, setNotificationCount] = useState(3);

  const onProfileClick = () => console.log('Profile clicked');
  const onNotificationClick = () => console.log('Notification clicked');
  const onToggleFavorite = (id: string) => console.log('Toggle favorite', id);

  const filters = ["All", "Food", "Transport", "Health", "Shopping", "Utilities"];

  const allTransactions = [
    {
      id: "1",
      title: "Whole Foods Market",
      category: "Food",
      amount: 68.42,
      date: "Dec 4, 2024 - 10:30 AM",
      location: "Downtown",
      image: "receipt",
      isFavorite: true,
    },
    {
      id: "2",
      title: "Uber Ride",
      category: "Transport",
      amount: 24.50,
      date: "Dec 4, 2024 - 9:15 AM",
      location: "From Home",
      isFavorite: false,
    },
    {
      id: "3",
      title: "Fitness First Gym",
      category: "Health",
      amount: 89.99,
      date: "Dec 3, 2024 - 6:00 PM",
      location: "City Center",
      isFavorite: true,
    },
    {
      id: "4",
      title: "Starbucks Coffee",
      category: "Food",
      amount: 12.75,
      date: "Dec 3, 2024 - 2:30 PM",
      location: "Main Street",
      image: "receipt",
      isFavorite: false,
    },
    {
      id: "5",
      title: "Amazon Shopping",
      category: "Shopping",
      amount: 156.30,
      date: "Dec 2, 2024 - 11:00 AM",
      isFavorite: false,
    },
    {
      id: "6",
      title: "Electric Bill",
      category: "Utilities",
      amount: 84.20,
      date: "Dec 1, 2024 - 9:00 AM",
      isFavorite: false,
    },
    {
      id: "7",
      title: "Restaurant Dinner",
      category: "Food",
      amount: 95.80,
      date: "Nov 30, 2024 - 8:00 PM",
      location: "City Plaza",
      isFavorite: true,
    },
    {
      id: "8",
      title: "Metro Card Recharge",
      category: "Transport",
      amount: 50.00,
      date: "Nov 30, 2024 - 7:30 AM",
      isFavorite: false,
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
            <Text className="text-3xl font-bold text-text mb-4">Transactions</Text>
            
            {/* Search Bar */}
            <View className="relative mb-4">
              <View className="absolute left-3 top-3 z-10">
                <Search size={20} color="#64748b" />
              </View>
              <TextInput
                placeholder="Search transactions..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-xl text-text"
                placeholderTextColor="#64748b"
              />
            </View>

            {/* Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 pb-2">
              {filters.map((filter) => (
                <Pressable
                  key={filter}
                  onPress={() => setSelectedFilter(filter.toLowerCase())}
                  className={`px-4 py-2 rounded-full mr-2 ${
                    selectedFilter === filter.toLowerCase()
                      ? "bg-primary"
                      : "bg-white border border-border"
                  }`}
                >
                  <Text className={`${
                    selectedFilter === filter.toLowerCase()
                      ? "text-white"
                      : "text-text-secondary"
                  }`}>
                    {filter}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                className="px-4 py-2 rounded-full bg-white border border-border flex-row items-center gap-2"
              >
                <SlidersHorizontal size={16} color="#0f172a" />
                <Text className="text-text">More</Text>
              </Pressable>
            </ScrollView>
          </View>

          {/* Transaction List */}
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm text-text-secondary">
                {allTransactions.length} transactions found
              </Text>
              <Pressable className="flex-row items-center gap-1">
                <Filter size={16} color="#6366f1" />
                <Text className="text-sm text-primary">Sort</Text>
              </Pressable>
            </View>
            
            {allTransactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
