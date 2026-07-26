// Package config persists small user preferences (the chosen cache location and
// a stable per-install id) under the OS user-config directory.
package config

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"

	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/atomicwrite"
)

// Config holds Celestory's persisted preferences.
type Config struct {
	CacheDir string `json:"cacheDir"`
	// LastInputDir is the folder scanned on the previous run, used to pre-fill the
	// wizard so the user doesn't retype it each time.
	LastInputDir string `json:"lastInputDir,omitempty"`
	// LastOutputDir is where celestory.json was written on the previous run, used
	// to pre-fill the wizard's output question.
	LastOutputDir string `json:"lastOutputDir,omitempty"`
	// InstallID is a stable random identity created on first run. It lives in the
	// config dir (not the cache), so clearing the cache does not reset it. It is
	// used only for privacy-preserving, deduped attempt counting on the web app.
	InstallID string `json:"installId"`
	// ProfileID is the optional handle the user configured via `--profile`. It is
	// just an identifier (never a password): it pre-fills the publish form and
	// acts as a stable owner anchor across machines. Empty until set.
	ProfileID string `json:"profileId,omitempty"`
}

// SetProfileID persists the configured profile handle, preserving other prefs.
func SetProfileID(handle string) error {
	c, err := Load()
	if err != nil {
		return err
	}
	c.ProfileID = handle
	return Save(c)
}

// Dir returns the Celestory config directory (e.g. ~/.config/celestory).
func Dir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("locate user config dir: %w", err)
	}
	return filepath.Join(base, "celestory"), nil
}

// Path returns the config file path.
func Path() (string, error) {
	dir, err := Dir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "config.json"), nil
}

// Load reads the persisted config. A missing file is not an error — it returns
// a zero Config so first runs behave like "no preference yet".
func Load() (Config, error) {
	path, err := Path()
	if err != nil {
		return Config{}, err
	}
	data, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return Config{}, nil
	}
	if err != nil {
		return Config{}, fmt.Errorf("read config %s: %w", path, err)
	}
	var c Config
	if err := json.Unmarshal(data, &c); err != nil {
		return Config{}, fmt.Errorf("parse config %s: %w", path, err)
	}
	return c, nil
}

// EnsureInstallID returns the persisted install id, creating and saving a fresh
// random one on first use. Existing preferences (e.g. the cache dir) are
// preserved. The id survives cache clears because it lives in the config file.
func EnsureInstallID() (string, error) {
	c, err := Load()
	if err != nil {
		return "", err
	}
	if c.InstallID != "" {
		return c.InstallID, nil
	}
	id, err := newInstallID()
	if err != nil {
		return "", err
	}
	c.InstallID = id
	if err := Save(c); err != nil {
		return "", err
	}
	return id, nil
}

// newInstallID returns a 128-bit random, hex-encoded identifier.
func newInstallID() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", fmt.Errorf("generate install id: %w", err)
	}
	return hex.EncodeToString(b[:]), nil
}

// Save atomically writes the config (temp file + rename), creating the
// directory if needed — the InstallID must never be lost to a partial write.
func Save(c Config) error {
	dir, err := Dir()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("create config dir: %w", err)
	}
	path := filepath.Join(dir, "config.json")
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal config: %w", err)
	}
	if err := atomicwrite.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("write config %s: %w", path, err)
	}
	return nil
}
