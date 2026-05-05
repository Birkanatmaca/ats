//go:build !windows

package postgres

import (
	"fmt"
	"syscall"
)

func readDiskUsage(path string) (float64, string) {
	var stat syscall.Statfs_t
	if err := syscall.Statfs(path, &stat); err != nil {
		return 0, "Disk bilgisi okunamadi"
	}

	total := stat.Blocks * uint64(stat.Bsize)
	free := stat.Bavail * uint64(stat.Bsize)
	if total == 0 {
		return 0, "Disk bilgisi okunamadi"
	}

	used := total - free
	return roundOne(float64(used) * 100 / float64(total)), fmt.Sprintf("%.1f GB / %.1f GB", bytesToGB(used), bytesToGB(total))
}
