package fingerprint

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/sidthesloth92/db-astro-suite/libs/astrofits"
)

// FrameSchema versions the frame-fingerprint recipe below. Bump it whenever the
// field set or formatting changes so identities from older builds are never
// silently mixed with new ones (the schema is folded into the hash).
const FrameSchema = 1

// weakHashBytes is how many leading bytes of an undated frame are hashed for the
// content fallback. FITS headers are multiples of 2880 bytes; 32 KB comfortably
// covers a primary header without ever reading pixel data.
const weakHashBytes = 32 * 1024

// weakPrefix tags content-derived fallback fingerprints so they can never
// collide with header-derived ones and are recognisable at a glance.
const weakPrefix = "w:"

// FrameFingerprint returns a stable, content- and path-independent identity for a
// single sub-exposure, derived purely from its FITS acquisition headers: the
// sensor, the exact exposure-start instant (DATE-OBS), and the acquisition
// settings (exposure, gain, binning, filter). It deliberately excludes the
// target name, file size, path, and pixel data, so the same photons keep one
// identity no matter how the file is labelled, copied, or re-saved — while the
// sub-second DATE-OBS keeps genuinely distinct exposures apart.
//
// ok is false when DATE-OBS is missing/unparseable: without the exposure instant
// the header alone cannot uniquely identify the sub, and callers fall back to
// WeakFingerprint.
func FrameFingerprint(meta astrofits.Metadata) (fp string, ok bool) {
	if meta.DateObs.IsZero() {
		return "", false
	}
	rawFilter := strings.ToLower(strings.TrimSpace(meta.RawValues["FILTER"]))
	parts := []string{
		strconv.Itoa(FrameSchema),
		astrofits.NormalizeCamera(meta.CameraRaw),
		meta.DateObs.UTC().Format(time.RFC3339Nano),
		strconv.FormatFloat(meta.Exposure, 'f', -1, 64),
		strconv.Itoa(meta.Gain),
		strconv.Itoa(meta.BinningX) + "x" + strconv.Itoa(meta.BinningY),
		rawFilter,
	}
	sum := sha256.Sum256([]byte(strings.Join(parts, "|")))
	return hex.EncodeToString(sum[:]), true
}

// WeakFingerprint is the fallback identity for an undated frame: a SHA-256 over
// the file's leading header bytes (or the whole file when shorter). It is
// content-dependent — a re-saved copy of the same exposure may not match — so
// callers must tag these frames as "weak" identities.
func WeakFingerprint(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", fmt.Errorf("open %s for weak fingerprint: %w", path, err)
	}
	defer func() { _ = f.Close() }()

	h := sha256.New()
	if _, err := io.CopyN(h, f, weakHashBytes); err != nil && !errors.Is(err, io.EOF) {
		return "", fmt.Errorf("hash %s for weak fingerprint: %w", path, err)
	}
	return weakPrefix + hex.EncodeToString(h.Sum(nil)), nil
}
