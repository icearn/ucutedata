import { View, Text, TextInput, Pressable, Image } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { signIn } from '@/lib/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    // Mock login delay
    setTimeout(async () => {
      await signIn();
      setLoading(false);
      router.replace('/(tabs)');
    }, 1000);
  };

  return (
    <SafeAreaView className="flex-1 bg-white p-6 justify-center">
      <View className="items-center mb-10">
        <Text className="text-3xl font-bold text-primary mb-2">Spending Track</Text>
        <Text className="text-text-secondary">Track your expenses intelligently</Text>
      </View>

      <View className="gap-4">
        <View>
          <Text className="text-sm font-semibold text-text mb-2">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="hello@example.com"
            className="bg-gray-50 p-4 rounded-xl border border-border text-text"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
          />
        </View>

        <View>
          <Text className="text-sm font-semibold text-text mb-2">Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            className="bg-gray-50 p-4 rounded-xl border border-border text-text"
            placeholderTextColor="#94a3b8"
            secureTextEntry
          />
        </View>

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          className={`bg-primary p-4 rounded-xl items-center shadow-sm mt-4 ${loading ? 'opacity-70' : ''}`}
        >
          <Text className="text-white font-bold text-lg">
            {loading ? "Signing in..." : "Sign In"}
          </Text>
        </Pressable>

        <Pressable className="items-center mt-4">
            <Text className="text-text-secondary">
                New user? <Text className="text-primary font-bold">Create an account</Text>
            </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
