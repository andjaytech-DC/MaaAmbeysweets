import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StoreProvider } from "@/lib/store";
import { theme } from "@/lib/api";

export default function Root() {
  return (
    <StoreProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: theme.ink }, headerTintColor: "#fff", contentStyle: { backgroundColor: theme.paper } }}>
        <Stack.Screen name="index" options={{ title: "Maa Ambey Sweets" }} />
        <Stack.Screen name="product/[id]" options={{ title: "Sweet" }} />
        <Stack.Screen name="cart" options={{ title: "Your cart" }} />
        <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
        <Stack.Screen name="track" options={{ title: "Track order" }} />
        <Stack.Screen name="hampers" options={{ title: "Gift boxes" }} />
        <Stack.Screen name="account" options={{ title: "Your account" }} />
        <Stack.Screen name="login" options={{ title: "Log in" }} />
      </Stack>
    </StoreProvider>
  );
}
