import { Link } from 'expo-router';
import { View, Text, Pressable } from 'react-native';

export default function Home() {
  return (
    <View style={{ flex:1, padding:20, justifyContent:'center', gap:10 }}>
      <Text style={{ fontSize:22, fontWeight:'700', marginBottom:8 }}>Subii – start</Text>

      <Link href="/payments" asChild>
        <Pressable style={{ padding:14, backgroundColor:'#eee', borderRadius:10 }}>
          <Text>💳 Płatności (symulacja)</Text>
        </Pressable>
      </Link>

      <Link href="/report" asChild>
        <Pressable style={{ padding:14, backgroundColor:'#eee', borderRadius:10 }}>
          <Text>📊 Raport miesięczny</Text>
        </Pressable>
      </Link>
    </View>
  );
}
