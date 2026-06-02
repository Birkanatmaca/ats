export function canRegisterPushOnPlatform(platform: string, isDevice: boolean) {
  if (platform === "web") {
    return false;
  }
  return isDevice;
}
