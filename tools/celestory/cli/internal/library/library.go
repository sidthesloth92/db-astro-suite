// Package library is Celestory's cumulative, root-partitioned record of every
// light frame it has indexed, deduped by FrameFP. It lives in the CLI data dir,
// separate from the per-root parse cache, so scanning one disk never forgets
// another: re-scanning a folder reconciles it to its current files while every
// other disk's frames (last seen on another run) stay counted.
//
// Layout (persisted as library.json):
//   - folders: folderAbs -> { fileRel -> frameFP }  (which files a disk holds)
//   - frames:  frameFP -> frameRecord               (the data each frame contributes)
//
// The story is built from Union(), the deduped set across all partitions, not
// from any single scan.
package library

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"time"

	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/aggregate"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/atomicwrite"
)

// frameRecord is the per-frame data the index keeps, keyed by FrameFP. It holds
// everything aggregation needs except the file path, which is tracked per root.
type frameRecord struct {
	Size        int64     `json:"size"`
	WeakID      bool      `json:"weakId,omitempty"`
	TargetID    string    `json:"targetId"`
	DisplayName string    `json:"displayName"`
	Designation string    `json:"designation"`
	Aliases     []string  `json:"aliases,omitempty"`
	Type        *string   `json:"type,omitempty"`
	Category    string    `json:"category"`
	Filter      string    `json:"filter"`
	Camera      string    `json:"camera"`
	Telescope   string    `json:"telescope,omitempty"`
	Focal       float64   `json:"focal,omitempty"`
	FRatio      float64   `json:"fRatio,omitempty"`
	Exposure    float64   `json:"exposure"`
	Date        time.Time `json:"date"`
	SessionTime time.Time `json:"sessionTime,omitzero"`
}

// Index is the cumulative library, loaded from and saved to library.json.
type Index struct {
	path    string
	Folders map[string]map[string]string `json:"folders"` // folderAbs -> fileRel -> frameFP
	Frames  map[string]frameRecord       `json:"frames"`  // frameFP -> frame record
}

// indexFileName is the cumulative index's on-disk name within its directory.
const indexFileName = "library.json"

// DefaultDir returns the OS user-data location for Celestory's library index.
func DefaultDir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("locate user config dir: %w", err)
	}
	return filepath.Join(base, "celestory"), nil
}

// IndexPath returns the cumulative index file location inside dir.
func IndexPath(dir string) string {
	return filepath.Join(dir, indexFileName)
}

// Open loads (or creates) the cumulative index under dir.
func Open(dir string) (*Index, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("create library dir: %w", err)
	}
	idx := &Index{
		path:    IndexPath(dir),
		Folders: map[string]map[string]string{},
		Frames:  map[string]frameRecord{},
	}
	if err := idx.load(); err != nil {
		return nil, err
	}
	return idx, nil
}

// Path returns the index file location.
func (i *Index) Path() string { return i.path }

func (i *Index) load() error {
	data, err := os.ReadFile(i.path)
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("read library %s: %w", i.path, err)
	}
	// A corrupt index is non-fatal — start fresh rather than failing the run.
	if err := json.Unmarshal(data, i); err != nil {
		i.Folders = map[string]map[string]string{}
		i.Frames = map[string]frameRecord{}
	}
	if i.Folders == nil {
		i.Folders = map[string]map[string]string{}
	}
	if i.Frames == nil {
		i.Frames = map[string]frameRecord{}
	}
	return nil
}

// Merge folds a fresh scan of root into the index.
//
// By default the scanned folder is reconciled to exactly its current files: a
// file deleted from the folder is dropped from this partition, so the folder's
// record always mirrors what is on disk. Other folders are never touched, so a
// disconnected disk keeps its frames; a frame deleted here still counts while
// another folder holds the same exposure.
//
// With keepDeleted the legacy append-only behavior applies instead: a vanished
// path is dropped only when its frame still survives elsewhere (a removed
// duplicate copy); a vanished path that is the LAST copy of its frame is KEPT,
// so culling a processed sub never silently un-counts its photons.
func (i *Index) Merge(rootAbs string, lights []aggregate.LightFrame, keepDeleted bool) {
	rootAbs = absOrSelf(rootAbs)
	current := map[string]string{}
	for _, lf := range lights {
		rel := relOrBase(rootAbs, lf.Path)
		current[rel] = lf.FrameFP
		i.Frames[lf.FrameFP] = recordOf(lf)
	}

	switch {
	case !keepDeleted || i.Folders[rootAbs] == nil:
		// Current-state reconcile (the default), or the first scan of this root:
		// the partition is exactly what this scan found.
		i.Folders[rootAbs] = current
	default:
		i.Folders[rootAbs] = i.reconcileAppendOnly(rootAbs, current)
	}
	i.compact()
}

// reconcileAppendOnly returns the new partition for rootAbs: the fresh scan plus
// any vanished paths whose frame would otherwise disappear entirely. Vanished
// paths whose frame survives elsewhere (deleted duplicate copies) are dropped.
func (i *Index) reconcileAppendOnly(rootAbs string, current map[string]string) map[string]string {
	// Frames that stay counted without this root's stale paths: everything in the
	// fresh scan, plus every frame held by any other root.
	surviving := map[string]struct{}{}
	for _, fp := range current {
		surviving[fp] = struct{}{}
	}
	for other, files := range i.Folders {
		if other == rootAbs {
			continue
		}
		for _, fp := range files {
			surviving[fp] = struct{}{}
		}
	}

	merged := make(map[string]string, len(current))
	for rel, fp := range current {
		merged[rel] = fp
	}
	for rel, fp := range i.Folders[rootAbs] {
		if _, stillScanned := current[rel]; stillScanned {
			continue // the fresh scan already represents this path
		}
		if _, safe := surviving[fp]; safe {
			continue // deleted duplicate copy — drop the stale path
		}
		merged[rel] = fp // last copy of this frame — keep it counted
	}
	return merged
}

// Forget drops a whole root partition (a disk you no longer own) and reclaims
// any records no longer referenced. Reports whether the root was present.
func (i *Index) Forget(rootAbs string) bool {
	rootAbs = absOrSelf(rootAbs)
	if _, ok := i.Folders[rootAbs]; !ok {
		return false
	}
	delete(i.Folders, rootAbs)
	i.compact()
	return true
}

// Reset clears the entire index (the "start from scratch" wipe). FITS files are
// never touched; the user rebuilds by re-scanning.
func (i *Index) Reset() {
	i.Folders = map[string]map[string]string{}
	i.Frames = map[string]frameRecord{}
}

// Union returns every indexed frame across all roots as enriched LightFrames.
// Frames are emitted per referencing path (so a sub backed up on two disks
// appears twice and is reported as a duplicate set), but the same physical
// exposure shares one FrameFP, so aggregation counts it exactly once.
func (i *Index) Union() []aggregate.LightFrame {
	out := make([]aggregate.LightFrame, 0, len(i.Frames))
	seen := map[string]struct{}{}
	for rootAbs, files := range i.Folders {
		for rel, fp := range files {
			rec, ok := i.Frames[fp]
			if !ok {
				continue
			}
			// One physical file can be covered by nested roots (e.g. /data and
			// /data/M31); emit each absolute path once so a file is never
			// reported as a duplicate of itself.
			path := filepath.Join(rootAbs, rel)
			if _, dup := seen[path]; dup {
				continue
			}
			seen[path] = struct{}{}
			out = append(out, lightFrom(rec, fp, path))
		}
	}
	return out
}

// Save atomically writes the index to disk (temp file + rename), so a crash
// mid-save can never leave a corrupt library.json — which load() would
// otherwise silently treat as an empty library.
func (i *Index) Save() error {
	data, err := json.Marshal(i)
	if err != nil {
		return fmt.Errorf("marshal library: %w", err)
	}
	if err := atomicwrite.WriteFile(i.path, data, 0o644); err != nil {
		return fmt.Errorf("write library %s: %w", i.path, err)
	}
	return nil
}

// compact drops records no longer referenced by any root partition.
func (i *Index) compact() {
	referenced := map[string]struct{}{}
	for _, files := range i.Folders {
		for _, fp := range files {
			referenced[fp] = struct{}{}
		}
	}
	for fp := range i.Frames {
		if _, ok := referenced[fp]; !ok {
			delete(i.Frames, fp)
		}
	}
}

func recordOf(lf aggregate.LightFrame) frameRecord {
	return frameRecord{
		Size:        lf.Size,
		WeakID:      lf.WeakID,
		TargetID:    lf.TargetID,
		DisplayName: lf.DisplayName,
		Designation: lf.Designation,
		Aliases:     lf.Aliases,
		Type:        lf.Type,
		Category:    lf.Category,
		Filter:      lf.Filter,
		Camera:      lf.Camera,
		Telescope:   lf.Telescope,
		Focal:       lf.Focal,
		FRatio:      lf.FRatio,
		Exposure:    lf.Exposure,
		Date:        lf.Date,
		SessionTime: lf.SessionTime,
	}
}

func lightFrom(rec frameRecord, fp, path string) aggregate.LightFrame {
	// Records written before the session-time chain existed carry no
	// sessionTime; fall back to the raw DATE-OBS so they keep a session date
	// until their root is re-scanned.
	if rec.SessionTime.IsZero() {
		rec.SessionTime = rec.Date
	}
	return aggregate.LightFrame{
		Path:        path,
		Size:        rec.Size,
		FrameFP:     fp,
		WeakID:      rec.WeakID,
		TargetID:    rec.TargetID,
		DisplayName: rec.DisplayName,
		Designation: rec.Designation,
		Aliases:     rec.Aliases,
		Type:        rec.Type,
		Category:    rec.Category,
		Filter:      rec.Filter,
		Camera:      rec.Camera,
		Telescope:   rec.Telescope,
		Focal:       rec.Focal,
		FRatio:      rec.FRatio,
		Exposure:    rec.Exposure,
		Date:        rec.Date,
		SessionTime: rec.SessionTime,
	}
}

// absOrSelf returns the absolute form of p, falling back to p on error so the
// partition key is at least stable within a run.
func absOrSelf(p string) string {
	if abs, err := filepath.Abs(p); err == nil {
		return abs
	}
	return p
}

// relOrBase returns path relative to rootAbs; if that fails (different volume),
// it falls back to a hash of the absolute path so the key stays unique + stable.
func relOrBase(rootAbs, path string) string {
	abs := absOrSelf(path)
	if rel, err := filepath.Rel(rootAbs, abs); err == nil {
		return rel
	}
	sum := sha256.Sum256([]byte(abs))
	return hex.EncodeToString(sum[:8])
}
