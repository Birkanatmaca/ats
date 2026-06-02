import * as ImagePicker from "expo-image-picker";
import { Alert, Linking, Platform } from "react-native";

const MAX_AVATAR_LENGTH = 300_000;

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
  base64: true
};

function showPermissionAlert(permission: ImagePicker.PermissionResponse, message: string) {
  if (!permission.granted && !permission.canAskAgain && Platform.OS !== "web") {
    Alert.alert("İzin gerekli", message, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Ayarları aç", onPress: () => void Linking.openSettings() }
    ]);
    return;
  }

  Alert.alert("İzin gerekli", message);
}

function assetToDataUrl(asset: ImagePicker.ImagePickerAsset): string | null {
  const mime = asset.mimeType ?? "image/jpeg";

  if (asset.base64) {
    const dataUrl = `data:${mime};base64,${asset.base64}`;
    if (dataUrl.length > MAX_AVATAR_LENGTH) {
      Alert.alert("Görsel çok büyük", "Daha küçük bir fotoğraf seçin (en fazla ~900 KB).");
      return null;
    }
    return dataUrl;
  }

  return asset.uri ?? null;
}

function processPickerResult(result: ImagePicker.ImagePickerResult): string | null {
  if (result.canceled || !result.assets?.[0]) return null;
  return assetToDataUrl(result.assets[0]);
}

export async function pickProfileAvatarFromLibrary(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    showPermissionAlert(permission, "Profil fotoğrafı seçmek için galeri erişimine izin verin.");
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  return processPickerResult(result);
}

export async function pickProfileAvatarFromCamera(): Promise<string | null> {
  if (Platform.OS === "web") {
    Alert.alert("Kamera kullanılamıyor", "Web sürümünde galeriden fotoğraf seçebilirsiniz.");
    return null;
  }

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    showPermissionAlert(permission, "Profil fotoğrafı çekmek için kamera erişimine izin verin.");
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    ...PICKER_OPTIONS,
    cameraType: ImagePicker.CameraType.front
  });
  return processPickerResult(result);
}
