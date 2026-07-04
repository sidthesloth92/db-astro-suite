// Package cache provides an incremental, on-disk metadata cache so re-scanning
// a large library only re-parses files that changed. Change detection is
// size+mtime (one stat, no bytes read) — sufficient for write-once capture
// files. A parser schema version invalidates stale entries after a tool
// upgrade, and -reset purges the cache entirely alongside the library index.
package cache

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/sidthesloth92/db-astro-suite/libs/astrofits"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/atomicwrite"
)

// SchemaVersion is the parser schema. Bump it whenever the metadata extraction
// changes so cached entries from older builds are ignored.
//
// v2: Metadata gained StackCount (stacked-master detection); older entries must
// be re-parsed so masters are correctly excluded from integration.
//
// v3: Metadata gained DateLoc (local capture time for session grouping); older
// entries would silently fall back to UTC DATE-OBS session dates.
const SchemaVersion = 3

// Entry is one cached file record.
type Entry struct {
	Size        int64              `json:"size"`
	ModTimeNano int64              `json:"mtimeNano"`
	Schema      int                `json:"schema"`
	Meta        astrofits.Metadata `json:"meta"`
}

// Cache is a thread-safe incremental metadata cache backed by a JSON file,
// namespaced per scanned root. It satisfies the scan.Cache interface.
type Cache struct {
	path    string
	mu      sync.Mutex
	entries map[string]Entry
	seen    map[string]struct{}
}

// DefaultDir returns the OS user-cache location for Celestory.
func DefaultDir() (string, error) {
	base, err := os.UserCacheDir()
	if err != nil {
		return "", fmt.Errorf("locate user cache dir: %w", err)
	}
	return filepath.Join(base, "celestory"), nil
}

// Open loads (or creates) the cache file for root inside dir. The file is
// namespaced by a hash of the absolute root so different folders never collide.
func Open(dir, root string) (*Cache, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("create cache dir: %w", err)
	}
	abs, err := filepath.Abs(root)
	if err != nil {
		abs = root
	}
	sum := sha256.Sum256([]byte(abs))
	path := filepath.Join(dir, hex.EncodeToString(sum[:8])+".json")

	c := &Cache{
		path:    path,
		entries: map[string]Entry{},
		seen:    map[string]struct{}{},
	}
	if err := c.load(); err != nil {
		return nil, err
	}
	return c, nil
}

// Path returns the cache file location (for -config and run output).
func (c *Cache) Path() string { return c.path }

// Purge removes every per-root cache file inside dir, leaving the directory
// itself (and any non-cache files) intact. A missing directory is a no-op.
// Used by -reset so a clean slate clears the scan cache alongside the library.
func Purge(dir string) error {
	entries, err := os.ReadDir(dir)
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("read cache dir %s: %w", dir, err)
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		if err := os.Remove(filepath.Join(dir, e.Name())); err != nil {
			return fmt.Errorf("remove cache file %s: %w", e.Name(), err)
		}
	}
	return nil
}

func (c *Cache) load() error {
	data, err := os.ReadFile(c.path)
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("read cache %s: %w", c.path, err)
	}
	if err := json.Unmarshal(data, &c.entries); err != nil {
		// A corrupt cache is non-fatal — start fresh rather than failing a scan.
		c.entries = map[string]Entry{}
	}
	return nil
}

// Get returns cached metadata when the file at path is unchanged (same size
// and modification time as when it was parsed).
func (c *Cache) Get(path string, size int64, mtime time.Time) (astrofits.Metadata, bool) {
	c.mu.Lock()
	e, ok := c.entries[path]
	c.mu.Unlock()
	if !ok || e.Schema != SchemaVersion {
		return astrofits.Metadata{}, false
	}
	if e.Size != size || e.ModTimeNano != mtime.UnixNano() {
		return astrofits.Metadata{}, false
	}

	c.markSeen(path)
	return e.Meta, true
}

// Put records freshly parsed metadata for the file at path.
func (c *Cache) Put(path string, size int64, mtime time.Time, meta astrofits.Metadata) {
	e := Entry{
		Size:        size,
		ModTimeNano: mtime.UnixNano(),
		Schema:      SchemaVersion,
		Meta:        meta,
	}
	c.mu.Lock()
	c.entries[path] = e
	c.seen[path] = struct{}{}
	c.mu.Unlock()
}

func (c *Cache) markSeen(path string) {
	c.mu.Lock()
	c.seen[path] = struct{}{}
	c.mu.Unlock()
}

// Save prunes entries for files not seen this run and atomically writes the
// cache to disk (temp file + rename, so an interrupted run never leaves a
// corrupt cache file).
func (c *Cache) Save() error {
	c.mu.Lock()
	for p := range c.entries {
		if _, ok := c.seen[p]; !ok {
			delete(c.entries, p)
		}
	}
	data, err := json.Marshal(c.entries)
	c.mu.Unlock()
	if err != nil {
		return fmt.Errorf("marshal cache: %w", err)
	}
	if err := atomicwrite.WriteFile(c.path, data, 0o644); err != nil {
		return fmt.Errorf("write cache %s: %w", c.path, err)
	}
	return nil
}
