import type { NetInfoState } from "@react-native-community/netinfo";

export type ConnectivitySnapshot = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
};

export function readConnectivity(state: NetInfoState): ConnectivitySnapshot {
  return {
    isConnected: Boolean(state.isConnected),
    isInternetReachable: state.isInternetReachable ?? null
  };
}

export function isOnline(snapshot: ConnectivitySnapshot): boolean {
  if (!snapshot.isConnected) return false;
  if (snapshot.isInternetReachable === false) return false;
  return true;
}
