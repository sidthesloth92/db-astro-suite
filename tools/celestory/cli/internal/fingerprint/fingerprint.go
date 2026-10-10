// Package fingerprint derives a stable, privacy-preserving identity for a
// story's data: a SHA-256 over the normalized target set that deliberately
// ignores volatile metadata (generatedAt, file ordering). Identical data yields
// an identical fingerprint, so regenerating an unchanged library — even after a
// cache clear — does not look like a new upload.
package fingerprint

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
	"sort"
	"strings"

	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/model"
)

// Compute returns the hex SHA-256 of the normalized, stable per-target data:
// each target's designation, rounded total integration seconds, light-frame
// count, and first-light date, sorted so frame ordering cannot affect the hash.
func Compute(story model.Story) string {
	lines := make([]string, 0, len(story.Targets))
	for _, o := range story.Targets {
		lines = append(lines, fmt.Sprintf("%s|%d|%d|%s",
			strings.ToLower(strings.TrimSpace(o.Designation)),
			int64(math.Round(o.TotalIntegrationSeconds)),
			o.LightFrameCount,
			o.FirstLight,
		))
	}
	sort.Strings(lines)
	sum := sha256.Sum256([]byte(strings.Join(lines, "\n")))
	return hex.EncodeToString(sum[:])
}
