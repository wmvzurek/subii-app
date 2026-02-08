import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

type Props = { navigation: any };

export default function Home({ navigation }: Props) {
  return (
    <View style={{ flex:1, padding:20, justifyContent:'center', gap:12, backgroundColor:'#f7f7f7' }}>
      <Text style={{ fontSize:24, fontWeight:'800', marginBottom:8 }}>Subii – start</Text>

      <TouchableOpacity
        onPress={() => navigation.navigate('Payments')}
        style={{ padding:16, backgroundColor:'#eee', borderRadius:12 }}
      >
        <Text>💳 Płatności (symulacja)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Report')}
        style={{ padding:16, backgroundColor:'#eee', borderRadius:12 }}
      >
        <Text>📊 Raport miesięczny</Text>
      </TouchableOpacity>
    </View>
  );
}
