package cache

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/sidthesloth92/db-astro-suite/libs/astrofits"
)

func TestCacheReusesUnchangedAndReparsesChanged(t *testing.T) {
	dir := t.TempDir()
	c, err := Open(dir, dir)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}

	mtime := time.Unix(1_700_000_000, 0)
	meta := astrofits.Metadata{Target: "M31", FrameType: "Light", Exposure: 300}
	c.Put("/x/a.fits", 100, mtime, meta)

	got, ok := c.Get("/x/a.fits", 100, mtime)
	if !ok || got.Target != "M31" {
		t.Fatalf("unchanged file should hit cache; got %+v ok=%v", got, ok)
	}
	if _, ok := c.Get("/x/a.fits", 101, mtime); ok {
		t.Error("changed size should miss")
	}
	if _, ok := c.Get("/x/a.fits", 100, mtime.Add(time.Second)); ok {
		t.Error("changed mtime should miss")
	}
	if _, ok := c.Get("/x/never.fits", 1, mtime); ok {
		t.Error("unknown path should miss")
	}
}

func TestCachePersistsAcrossOpen(t *testing.T) {
	dir := t.TempDir()
	mtime := time.Unix(1_700_000_000, 0)

	c1, err := Open(dir, "/some/root")
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	c1.Put("/some/root/a.fits", 42, mtime, astrofits.Metadata{Target: "M42", Exposure: 120})
	if err := c1.Save(); err != nil {
		t.Fatalf("Save: %v", err)
	}

	c2, err := Open(dir, "/some/root")
	if err != nil {
		t.Fatalf("re-Open: %v", err)
	}
	got, ok := c2.Get("/some/root/a.fits", 42, mtime)
	if !ok || got.Exposure != 120 {
		t.Fatalf("entry should persist across Open; got %+v ok=%v", got, ok)
	}
}

func TestCacheSavePrunesUnseenEntries(t *testing.T) {
	dir := t.TempDir()
	mtime := time.Unix(1_700_000_000, 0)

	c1, _ := Open(dir, "/r")
	c1.Put("/r/keep.fits", 1, mtime, astrofits.Metadata{Target: "Keep"})
	c1.Put("/r/drop.fits", 2, mtime, astrofits.Metadata{Target: "Drop"})
	_ = c1.Save()

	// Re-open; only touch keep.fits, then save → drop.fits should be pruned.
	c2, _ := Open(dir, "/r")
	if _, ok := c2.Get("/r/keep.fits", 1, mtime); !ok {
		t.Fatal("keep.fits should be present")
	}
	_ = c2.Save()

	c3, _ := Open(dir, "/r")
	if _, ok := c3.Get("/r/drop.fits", 2, mtime); ok {
		t.Error("drop.fits should have been pruned (not seen last run)")
	}
	if _, ok := c3.Get("/r/keep.fits", 1, mtime); !ok {
		t.Error("keep.fits should have survived pruning")
	}
}

func TestPurgeRemovesCacheFilesOnly(t *testing.T) {
	dir := t.TempDir()
	mtime := time.Unix(1_700_000_000, 0)

	// Seed two per-root cache files plus a non-json bystander.
	for _, root := range []string{"/root/a", "/root/b"} {
		c, err := Open(dir, root)
		if err != nil {
			t.Fatalf("Open %s: %v", root, err)
		}
		c.Put(root+"/f.fits", 1, mtime, astrofits.Metadata{Target: "T"})
		if err := c.Save(); err != nil {
			t.Fatalf("Save %s: %v", root, err)
		}
	}
	bystander := filepath.Join(dir, "notes.txt")
	if err := os.WriteFile(bystander, []byte("keep me"), 0o644); err != nil {
		t.Fatalf("write bystander: %v", err)
	}

	if err := Purge(dir); err != nil {
		t.Fatalf("Purge: %v", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("ReadDir: %v", err)
	}
	if len(entries) != 1 || entries[0].Name() != "notes.txt" {
		names := make([]string, 0, len(entries))
		for _, e := range entries {
			names = append(names, e.Name())
		}
		t.Fatalf("expected only notes.txt to survive, got %v", names)
	}

	// A purged cache reads back empty.
	c, err := Open(dir, "/root/a")
	if err != nil {
		t.Fatalf("re-Open after purge: %v", err)
	}
	if _, ok := c.Get("/root/a/f.fits", 1, mtime); ok {
		t.Error("purged cache should not return entries")
	}
}

func TestPurgeMissingDirIsNoOp(t *testing.T) {
	missing := filepath.Join(t.TempDir(), "does-not-exist")
	if err := Purge(missing); err != nil {
		t.Fatalf("Purge on a missing dir should be a no-op, got: %v", err)
	}
}
