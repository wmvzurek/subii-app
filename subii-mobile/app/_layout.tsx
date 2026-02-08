import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#000",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "Home",
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="login" 
        options={{ 
          title: "Logowanie",
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="register" 
        options={{ title: "Rejestracja" }} 
      />
      <Stack.Screen 
        name="subscriptions-manage" 
        options={{ title: "Moje subskrypcje" }} 
      />
      <Stack.Screen 
        name="subscriptions-add" 
        options={{ title: "Dodaj subskrypcję" }} 
      />
      <Stack.Screen 
        name="payments" 
        options={{ title: "Płatności" }} 
      />
      <Stack.Screen 
        name="report" 
        options={{ title: "Raport" }} 
      />
      <Stack.Screen 
        name="search" 
        options={{ title: "Wyszukiwarka" }} 
      />
    </Stack>
  );
}