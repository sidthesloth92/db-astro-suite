// Package cache provides an incremental, on-disk metadata cache so re-scanning
// a large library only re-parses files that changed. Change detection defaults
// to size+mtime (one stat, no bytes read); --verify-hash switches to a
// FITS-header content hash. A parser schema version invalidates stale entries
// after a tool upgrade.
package cache

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/sidthesloth92/db-astro-suite/libs/astrofits"
)

// SchemaVersion is the parser schema. Bump it whenever the metadata extraction
// changes so cached entries from older builds are ignored.
const SchemaVersion = 1

// headerHashBytes is how many leading bytes are hashed in --verify-hash mode.
// FITS headers are multiples of 2880 bytes; 32 KB comfortably covers a primary
// header while staying far cheaper than reading the pixel data.
const headerHashBytes = 32 * 1024

// Entry is one cached file record.
type Entry struct {
	Size        int64              `json:"size"`
	ModTimeNano int64              `json:"mtimeNano"`
	Schema      int                `json:"schema"`
	HeaderHash  string             `json:"headerHash,omitempty"`
	Meta        astrofits.Metadata `json:"meta"`
}

// Cache is a thread-safe incremental metadata cache backed by a JSON file,
// namespaced per scanned root. It satisfies the scan.Cache interface.
type Cache struct {
	path       string
	verifyHash bool
	mu         sync.Mutex
	entries    map[string]Entry
	seen       map[string]struct{}
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
func Open(dir, root string, verifyHash bool) (*Cache, error) {
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
		path:       path,
		verifyHash: verifyHash,
		entries:    map[string]Entry{},
		seen:       map[string]struct{}{},
	}
	if err := c.load(); err != nil {
		return nil, err
	}
	return c, nil
}

// Path returns the cache file location (for --show-cache and run output).
func (c *Cache) Path() string { return c.path }

// Clear drops all loaded entries so every file is re-parsed this run and the
// cache is rewritten fresh. Used by --refresh.
func (c *Cache) Clear() {
	c.mu.Lock()
	c.entries = map[string]Entry{}
	c.mu.Unlock()
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

// Get returns cached metadata when the file at path is unchanged.
func (c *Cache) Get(path string, size int64, mtime time.Time) (astrofits.Metadata, bool) {
	c.mu.Lock()
	e, ok := c.entries[path]
	c.mu.Unlock()
	if !ok || e.Schema != SchemaVersion {
		return astrofits.Metadata{}, false
	}

	unchanged := false
	if c.verifyHash {
		if h, err := headerHash(path); err == nil && h == e.HeaderHash && e.HeaderHash != "" {
			unchanged = true
		}
	} else {
		unchanged = e.Size == size && e.ModTimeNano == mtime.UnixNano()
	}
	if !unchanged {
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
	if c.verifyHash {
		if h, err := headerHash(path); err == nil {
			e.HeaderHash = h
		}
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

// Save prunes entries for files not seen this run and writes the cache to disk.
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
	if err := os.WriteFile(c.path, data, 0o644); err != nil {
		return fmt.Errorf("write cache %s: %w", c.path, err)
	}
	return nil
}

// headerHash hashes the leading bytes of a file (the FITS header region).
func headerHash(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.CopyN(h, f, headerHashBytes); err != nil && !errors.Is(err, io.EOF) {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}
