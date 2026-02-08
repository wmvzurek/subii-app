// app/_layout.tsx
import React from 'react';
import { NavigationIndependentTree, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Home from '../src/screens/Home';
import Payments from '../src/screens/Payments';
import Report from '../src/screens/Report';

const Stack = createStackNavigator();

export default function RootLayout() {
  // 🔧 TS w RN v7 czasem wymusza dziwne propsy (`id`). Rzutujemy na any i po sprawie.
  const Navigator = Stack.Navigator as unknown as React.ComponentType<any>;
  const Screen = Stack.Screen as unknown as React.ComponentType<any>;

  return (
    <NavigationIndependentTree>
      <NavigationContainer>
        <Navigator screenOptions={{ headerShown: true }}>
          <Screen name="Home" component={Home} options={{ title: 'Subii' }} />
          <Screen name="Payments" component={Payments} options={{ title: 'Płatności' }} />
          <Screen name="Report" component={Report} options={{ title: 'Raport' }} />
        </Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}
