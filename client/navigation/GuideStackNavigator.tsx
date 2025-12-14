import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import GuideScreen from "@/screens/GuideScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type GuideStackParamList = {
  Guide: undefined;
};

const Stack = createNativeStackNavigator<GuideStackParamList>();

export default function GuideStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Guide"
        component={GuideScreen}
        options={{
          headerTitle: "Condition Guide",
        }}
      />
    </Stack.Navigator>
  );
}
