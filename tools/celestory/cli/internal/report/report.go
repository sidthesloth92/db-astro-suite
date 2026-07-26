// Package report serializes a Story to the schema-v1 JSON contract.
package report

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"

	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/atomicwrite"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/model"
)

// WriteJSON writes the story as pretty-printed UTF-8 JSON to w. HTML escaping
// is disabled so canonical filter labels (e.g. "Hα") stay readable.
func WriteJSON(w io.Writer, story model.Story) error {
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	enc.SetEscapeHTML(false)
	if err := enc.Encode(story); err != nil {
		return fmt.Errorf("encode story: %w", err)
	}
	return nil
}

// WriteFile atomically replaces path with the story JSON (temp file + rename),
// so an interrupted run never leaves a truncated file and each generation is a
// genuinely new file with a fresh creation time.
func WriteFile(path string, story model.Story) error {
	var buf bytes.Buffer
	if err := WriteJSON(&buf, story); err != nil {
		return err
	}
	if err := atomicwrite.WriteFile(path, buf.Bytes(), 0o644); err != nil {
		return fmt.Errorf("write story: %w", err)
	}
	return nil
}
