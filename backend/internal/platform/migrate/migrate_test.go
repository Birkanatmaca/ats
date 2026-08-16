package migrate

import (
	"io/fs"
	"sort"
	"testing"

	"ots/backend/migrations"
)

func TestEmbeddedMigrationsAreOrdered(t *testing.T) {
	files, err := fs.Glob(migrations.FS, "*.sql")
	if err != nil {
		t.Fatal(err)
	}
	if len(files) == 0 {
		t.Fatal("expected embedded sql migrations")
	}
	sort.Strings(files)
	if files[0] != "000001_initial_schema.sql" {
		t.Fatalf("first migration = %s", files[0])
	}
}
