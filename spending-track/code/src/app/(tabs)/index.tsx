import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Scan, TrendingDown, TrendingUp, Wallet, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/Header';
import { StatCard } from '@/components/StatCard';
import { TransactionCard } from '@/components/TransactionCard';
import { useState, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { getTransactions, Transaction, toggleFavorite } from '@/db/transactions';

export default function HomeScreen() {
  const [notificationCount, setNotificationCount] = useState(3);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  const fetchTransactions = async () => {
    const data = await getTransactions();
    setRecentTransactions(data.slice(0, 5)); // Show only recent 5
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [])
  );

  const onProfileClick = () => console.log('Profile clicked');
  const onNotificationClick = () => console.log('Notification clicked');
  
  const handleToggleFavorite = async (id: string) => {
    const tx = recentTransactions.find(t => t.id === id);
    if (tx) {
      await toggleFavorite(id, !tx.isFavorite);
      fetchTransactions();
    }
  };

  const onAddReceipt = () => {
    router.push('/add-transaction');
  };

  const hasData = recentTransactions.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}>
        <Header 
          onProfileClick={onProfileClick} 
          onNotificationClick={onNotificationClick}
          notificationCount={notificationCount}
        />
        
        <View className="px-4 flex-1">
          {/* Header */}
          <View className="pb-4">
            <Text className="text-text-secondary mb-1">Good morning,</Text>
            <Text className="text-3xl font-bold text-text mb-4">Alex Johnson</Text>
            
            {hasData ? (
               <LinearGradient
                colors={['#6366f1', '#4f46e5']}
                className="rounded-2xl p-6 shadow-lg"
              >
                <Text className="text-white/80 mb-2">Total Balance</Text>
                <Text className="text-white text-3xl font-bold mb-4">$4,283.50</Text>
                <View className="flex-row items-center justify-between pt-4 border-t border-white/20">
                  <View>
                    <Text className="text-white/70 text-xs mb-1">This Month</Text>
                    <Text className="text-white font-semibold">$1,842.30</Text>
                  </View>
                  <View>
                    <Text className="text-white/70 text-xs mb-1">Last Month</Text>
                    <Text className="text-white font-semibold">$2,441.20</Text>
                  </View>
                </View>
              </LinearGradient>
            ) : (
               <View className="bg-primary rounded-2xl p-6 shadow-lg items-center justify-center py-10">
                 <Text className="text-white text-xl font-bold mb-2">Welcome!</Text>
                 <Text className="text-white/80 text-center">Start tracking your expenses by adding your first receipt.</Text>
               </View>
            )}
          </View>

          {/* Quick Actions */}
          <View className="mb-6 flex-row gap-3">
            <Pressable
              onPress={onAddReceipt}
              className="flex-1 bg-primary rounded-xl py-4 px-4 flex-row items-center justify-center gap-2 shadow-md"
            >
              <Plus size={20} color="white" />
              <Text className="text-white font-semibold">Add Receipt</Text>
            </Pressable>
            <Pressable
              className="bg-white border border-border rounded-xl py-4 px-4 items-center justify-center shadow-sm"
            >
              <Scan size={20} color="#0f172a" />
            </Pressable>
          </View>

          {hasData ? (
            <>
              {/* Stats Grid */}
              <View className="mb-6 gap-3">
                <View className="flex-row gap-3">
                    <StatCard
                    icon={TrendingDown}
                    label="Expenses"
                    value="$1,842"
                    change={-12}
                    color="#ef4444"
                    />
                    <StatCard
                    icon={TrendingUp}
                    label="Savings"
                    value="$2,441"
                    change={18}
                    color="#10b981"
                    />
                </View>
                <View className="flex-row gap-3">
                    <StatCard
                    icon={Wallet}
                    label="Transactions"
                    value={recentTransactions.length.toString()}
                    color="#f59e0b"
                    />
                    <StatCard
                    icon={Calendar}
                    label="This Week"
                    value="$428"
                    color="#6366f1"
                    />
                </View>
              </View>

              {/* Recent Transactions */}
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-lg font-bold text-text">Recent Transactions</Text>
                  <Pressable>
                    <Text className="text-primary text-sm">See All</Text>
                  </Pressable>
                </View>
                <View>
                  {recentTransactions.map((transaction) => (
                    <TransactionCard
                      key={transaction.id}
                      transaction={transaction}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </View>
              </View>
            </>
          ) : (
             <View className="flex-1 items-center justify-center mt-10 opacity-50">
                <Wallet size={64} color="#cbd5e1" />
                <Text className="text-text-secondary mt-4">No transactions yet</Text>
             </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
