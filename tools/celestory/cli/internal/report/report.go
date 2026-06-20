// Package report serializes a Story to the schema-v1 JSON contract.
package report

import (
	"encoding/json"
	"fmt"
	"io"
	"os"

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

// WriteFile writes the story JSON to path (creating/truncating it).
func WriteFile(path string, story model.Story) error {
	f, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("create %s: %w", path, err)
	}
	defer f.Close()
	return WriteJSON(f, story)
}
