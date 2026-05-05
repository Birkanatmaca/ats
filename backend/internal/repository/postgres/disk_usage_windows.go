//go:build windows

package postgres

import (
	"fmt"
	"path/filepath"
	"syscall"
	"unsafe"
)

var getDiskFreeSpaceEx = syscall.NewLazyDLL("kernel32.dll").NewProc("GetDiskFreeSpaceExW")

func readDiskUsage(path string) (float64, string) {
	root, err := windowsVolumeRoot(path)
	if err != nil {
		return 0, "Disk bilgisi okunamadi"
	}

	rootPtr, err := syscall.UTF16PtrFromString(root)
	if err != nil {
		return 0, "Disk bilgisi okunamadi"
	}

	var freeBytesAvailable uint64
	var totalBytes uint64
	var totalFreeBytes uint64
	result, _, _ := getDiskFreeSpaceEx.Call(
		uintptr(unsafe.Pointer(rootPtr)),
		uintptr(unsafe.Pointer(&freeBytesAvailable)),
		uintptr(unsafe.Pointer(&totalBytes)),
		uintptr(unsafe.Pointer(&totalFreeBytes)),
	)
	if result == 0 {
		return 0, "Disk bilgisi okunamadi"
	}
	if totalBytes == 0 {
		return 0, "Disk bilgisi okunamadi"
	}

	used := totalBytes - totalFreeBytes
	return roundOne(float64(used) * 100 / float64(totalBytes)), fmt.Sprintf("%.1f GB / %.1f GB", bytesToGB(used), bytesToGB(totalBytes))
}

func windowsVolumeRoot(path string) (string, error) {
	absolutePath, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}

	volume := filepath.VolumeName(absolutePath)
	if volume == "" {
		return absolutePath, nil
	}

	return volume + string(filepath.Separator), nil
}
