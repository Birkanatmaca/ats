import NetInfo from "@react-native-community/netinfo";
import { readConnectivity, type ConnectivitySnapshot } from "./connectivityState";

export type { ConnectivitySnapshot } from "./connectivityState";
export { isOnline, readConnectivity } from "./connectivityState";

export function subscribeConnectivity(onChange: (snapshot: ConnectivitySnapshot) => void): () => void {
  return NetInfo.addEventListener((state) => onChange(readConnectivity(state)));
}

export async function fetchConnectivity(): Promise<ConnectivitySnapshot> {
  const state = await NetInfo.fetch();
  return readConnectivity(state);
}
