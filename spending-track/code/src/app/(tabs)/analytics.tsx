import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/Header';
import { useState } from 'react';
import { PieChart, BarChart, LineChart } from "react-native-gifted-charts";

export default function AnalyticsScreen() {
  const [timePeriod, setTimePeriod] = useState("month");
  const [chartType, setChartType] = useState("pie");
  const [notificationCount, setNotificationCount] = useState(3);

  const onProfileClick = () => console.log('Profile clicked');
  const onNotificationClick = () => console.log('Notification clicked');

  const categoryData = [
    { name: "Food", value: 542, color: "#f59e0b" },
    { name: "Transport", value: 324, color: "#3b82f6" },
    { name: "Health", value: 289, color: "#10b981" },
    { name: "Entertainment", value: 198, color: "#ec4899" },
    { name: "Shopping", value: 356, color: "#8b5cf6" },
    { name: "Utilities", value: 245, color: "#06b6d4" },
  ];

  const weeklyData = [
    { label: "Mon", value: 120 },
    { label: "Tue", value: 180 },
    { label: "Wed", value: 95 },
    { label: "Thu", value: 220 },
    { label: "Fri", value: 280 },
    { label: "Sat", value: 340 },
    { label: "Sun", value: 160 },
  ];

  const monthlyTrend = [
    { label: "Jul", value: 1850 },
    { label: "Aug", value: 2100 },
    { label: "Sep", value: 1900 },
    { label: "Oct", value: 2300 },
    { label: "Nov", value: 2150 },
    { label: "Dec", value: 1842 },
  ];

  const totalSpending = categoryData.reduce((acc, item) => acc + item.value, 0);
  const screenWidth = Dimensions.get('window').width;

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
            <Text className="text-3xl font-bold text-text mb-4">Analytics</Text>
            
            {/* Time Period Selector */}
            <View className="flex-row gap-2 mb-4">
              {["week", "month", "year"].map((period) => (
                <Pressable
                  key={period}
                  onPress={() => setTimePeriod(period)}
                  className={`flex-1 py-2 rounded-lg items-center justify-center ${
                    timePeriod === period
                      ? "bg-primary"
                      : "bg-white border border-border"
                  }`}
                >
                  <Text className={`capitalize ${
                    timePeriod === period ? "text-white" : "text-text-secondary"
                  }`}>
                    {period}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Summary Card */}
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              className="rounded-2xl p-6 shadow-lg mb-6"
            >
              <View className="flex-row items-center gap-2 mb-2">
                <TrendingDown size={20} color="white" />
                <Text className="text-white/80">Total Spending</Text>
              </View>
              <Text className="text-white text-3xl font-bold mb-4">${totalSpending.toFixed(2)}</Text>
              <Text className="text-white/90 text-sm">Down 12% from last month</Text>
            </LinearGradient>
          </View>

          {/* Chart Type Selector */}
          <View className="flex-row gap-2 mb-4">
            {[
              { id: "pie", label: "Pie Chart" },
              { id: "bar", label: "Bar Chart" },
              { id: "line", label: "Trend" },
            ].map((type) => (
              <Pressable
                key={type.id}
                onPress={() => setChartType(type.id)}
                className={`px-4 py-2 rounded-lg ${
                  chartType === type.id
                    ? "bg-primary"
                    : "bg-white border border-border"
                }`}
              >
                <Text className={`${
                  chartType === type.id ? "text-white" : "text-text-secondary"
                }`}>
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Charts */}
          <View className="bg-white rounded-2xl p-6 shadow-sm border border-border mb-6 items-center">
            <Text className="text-lg font-semibold mb-4 w-full">
                {chartType === "pie" ? "Spending by Category" : 
                 chartType === "bar" ? "Weekly Spending" : "6-Month Trend"}
            </Text>
            
            {chartType === "pie" && (
              <PieChart
                data={categoryData}
                donut
                showGradient
                sectionAutoFocus
                radius={90}
                innerRadius={60}
                innerCircleColor={'#232B5D'}
                centerLabelComponent={() => {
                  return (
                    <View style={{justifyContent: 'center', alignItems: 'center'}}>
                      <Text
                        style={{fontSize: 22, color: 'white', fontWeight: 'bold'}}>
                        ${totalSpending}
                      </Text>
                    </View>
                  );
                }}
              />
            )}

            {chartType === "bar" && (
              <BarChart
                data={weeklyData}
                barWidth={22}
                noOfSections={3}
                barBorderRadius={4}
                frontColor="#6366f1"
                yAxisThickness={0}
                xAxisThickness={0}
                width={screenWidth - 100}
              />
            )}

            {chartType === "line" && (
              <LineChart
                data={monthlyTrend}
                color="#6366f1"
                thickness={3}
                dataPointsColor="#6366f1"
                width={screenWidth - 80}
                curved
                noOfSections={3}
                yAxisThickness={0}
                xAxisThickness={0}
              />
            )}
          </View>

          {/* Category Breakdown */}
          <View className="bg-white rounded-2xl p-6 shadow-sm border border-border">
            <Text className="text-lg font-semibold mb-4">Category Breakdown</Text>
            <View className="gap-3">
              {categoryData.map((category) => {
                const percentage = (category.value / totalSpending) * 100;
                return (
                  <View key={category.name}>
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center gap-2">
                        <View
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <Text className="text-sm text-text">
                          {category.name}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-3">
                        <Text className="text-sm text-text-secondary">
                          {percentage.toFixed(1)}%
                        </Text>
                        <Text className="text-sm font-semibold text-text">
                          ${category.value}
                        </Text>
                      </View>
                    </View>
                    <View className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{ 
                            width: `${percentage}%`,
                            backgroundColor: category.color 
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
