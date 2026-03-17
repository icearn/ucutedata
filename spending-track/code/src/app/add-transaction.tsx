import { View, Text, TextInput, Pressable, ScrollView, Platform, Image, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Camera, X, Image as ImageIcon, Sparkles, Scan } from 'lucide-react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { addTransaction } from '@/db/transactions';
import { analyzeReceipt } from '@/lib/ocr';

export default function AddTransactionScreen() {
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Food');
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const categories = ["Food", "Transport", "Health", "Entertainment", "Shopping", "Utilities", "Other"];

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "Camera access is needed to take photos.");
        return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setAnalyzing(true);
    try {
        const data = await analyzeReceipt(image);
        setTitle(data.title);
        setAmount(data.amount.toString());
        setCategory(data.category);
    } catch (e) {
        Alert.alert("Error", "Failed to analyze receipt.");
    } finally {
        setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!amount || !title) return;
    
    await addTransaction({
      title,
      amount: parseFloat(amount),
      category,
      date: new Date().toLocaleString(),
      location: 'Manual Entry', // Placeholder
    });
    
    router.back();
  };

  return (
    <View className="flex-1 bg-background p-4">
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      
      {/* Amount Input */}
      <View className="items-center mb-8 mt-4">
        <Text className="text-text-secondary mb-2">Amount</Text>
        <View className="flex-row items-center">
          <Text className="text-4xl font-bold text-text mr-1">$</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="numeric"
            className="text-5xl font-bold text-text min-w-[100px] text-center"
            placeholderTextColor="#cbd5e1"
            autoFocus
          />
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Title Input */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-text mb-2">Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What is this for?"
            className="bg-white p-4 rounded-xl border border-border text-lg text-text"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Category Selection */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-text mb-2">Category</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full border ${
                  category === cat
                    ? "bg-primary border-primary"
                    : "bg-white border-border"
                }`}
              >
                <Text className={category === cat ? "text-white" : "text-text"}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* OCR / Scan Receipt */}
        <View className="mb-6">
            <Text className="text-sm font-semibold text-text mb-2">Receipt</Text>
            
            {!image ? (
                <View className="flex-row gap-3">
                    <Pressable 
                        onPress={takePhoto}
                        className="flex-1 p-4 bg-white border border-dashed border-primary rounded-xl items-center justify-center gap-2 active:bg-gray-50"
                    >
                        <Scan size={24} color="#6366f1" />
                        <Text className="text-primary font-semibold">Camera</Text>
                    </Pressable>
                    <Pressable 
                        onPress={pickImage}
                        className="flex-1 p-4 bg-white border border-dashed border-border rounded-xl items-center justify-center gap-2 active:bg-gray-50"
                    >
                        <ImageIcon size={24} color="#64748b" />
                        <Text className="text-text-secondary font-semibold">Gallery</Text>
                    </Pressable>
                </View>
            ) : (
                <View>
                    <Image source={{ uri: image }} className="w-full h-48 rounded-xl mb-3" resizeMode="cover" />
                    <View className="flex-row gap-2">
                        <Pressable 
                            onPress={handleAnalyze}
                            disabled={analyzing}
                            className="flex-1 bg-primary p-3 rounded-lg flex-row items-center justify-center gap-2"
                        >
                            {analyzing ? <ActivityIndicator color="white" /> : <Sparkles size={20} color="white" />}
                            <Text className="text-white font-semibold">{analyzing ? "Scanning..." : "Scan & Fill"}</Text>
                        </Pressable>
                        <Pressable 
                            onPress={() => setImage(null)}
                            className="bg-white border border-border p-3 rounded-lg"
                        >
                             <X size={20} color="#ef4444" />
                        </Pressable>
                    </View>
                </View>
            )}
        </View>

      </ScrollView>

      {/* Action Buttons */}
      <View className="gap-3 mb-4">
        <Pressable
          onPress={handleSave}
          className="bg-primary p-4 rounded-xl items-center shadow-sm"
        >
          <Text className="text-white font-bold text-lg">Save Transaction</Text>
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          className="bg-white border border-border p-4 rounded-xl items-center"
        >
          <Text className="text-text font-semibold">Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}
