// Package config reads and writes the per-user persisted defaults for
// sortronomy. Paths, grouping toggles, and the session rollover hour are all
// persisted so the next run starts with the same settings. The per-run filter
// choice is intentionally not persisted — it's image-set specific and should
// be re-confirmed each run — but saved filter presets (FilterPresets) are, so
// the wizard can offer them as reusable choices.
package config

import (
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
)

// Config is the on-disk persisted state.
type Config struct {
	Organize OrganizeSettings `json:"organize,omitempty"`
	Flats    FlatsPaths       `json:"flats,omitempty"`
	// FilterPresets are the saved filter definitions offered by the wizard's
	// filter menu. Absent in configs written by older versions.
	FilterPresets []FilterPreset `json:"filterPresets,omitempty"`
}

// OrganizeSettings holds the persisted options for the organize flow.
// Field JSON tags match the existing on-disk schema so older config files
// that lack newer fields continue to load cleanly (missing bools zero to false).
type OrganizeSettings struct {
	InputDir            string `json:"inputDir,omitempty"`
	OutputDir           string `json:"outputDir,omitempty"`
	SessionRolloverHour int    `json:"sessionRolloverHour,omitempty"`
	GroupByFocal        bool   `json:"groupByFocal,omitempty"`
	GroupByDate         bool   `json:"groupByDate,omitempty"`
	GroupByFilter       bool   `json:"groupByFilter,omitempty"`
	GroupSession        bool   `json:"groupSession,omitempty"`
}

// FlatsPaths holds last-used paths for the rename-master-flats flow.
type FlatsPaths struct {
	InputDir  string `json:"inputDir,omitempty"`
	OutputDir string `json:"outputDir,omitempty"`
}

// configPath returns the absolute path to the sortronomy config file.
// On macOS/Linux this resolves to ~/.config/sortronomy/config.json; on
// Windows it lives under %APPDATA%\sortronomy\config.json.
func configPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "sortronomy", "config.json"), nil
}

// Load reads the config file. A missing file is not an error — Load returns
// a zero-valued Config so first-run users get sensible empty defaults.
func Load() (Config, error) {
	path, err := configPath()
	if err != nil {
		return Config{}, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return Config{}, nil
		}
		return Config{}, err
	}
	var c Config
	if err := json.Unmarshal(data, &c); err != nil {
		// Corrupt file shouldn't crash the wizard — pretend it was empty.
		return Config{}, nil
	}
	return c, nil
}

// Save writes the config to disk, creating the parent directory if needed.
// Atomic-ish: writes to a temp file in the same directory and renames over
// the destination, so a crash mid-write can't truncate the existing file.
func Save(c Config) error {
	path, err := configPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), ".sortronomy-config-*.tmp")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	cleanup := func() { _ = os.Remove(tmpPath) }

	enc := json.NewEncoder(tmp)
	enc.SetIndent("", "  ")
	if err := enc.Encode(c); err != nil {
		tmp.Close()
		cleanup()
		return err
	}
	if err := tmp.Close(); err != nil {
		cleanup()
		return err
	}
	return os.Rename(tmpPath, path)
}
