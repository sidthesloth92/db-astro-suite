// Package report serializes a Ledger to the schema-v1 JSON contract.
package report

import (
	"encoding/json"
	"fmt"
	"io"
	"os"

	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/model"
)

// WriteJSON writes the ledger as pretty-printed UTF-8 JSON to w. HTML escaping
// is disabled so canonical filter labels (e.g. "Hα") stay readable.
func WriteJSON(w io.Writer, ledger model.Ledger) error {
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	enc.SetEscapeHTML(false)
	if err := enc.Encode(ledger); err != nil {
		return fmt.Errorf("encode ledger: %w", err)
	}
	return nil
}

// WriteFile writes the ledger JSON to path (creating/truncating it).
func WriteFile(path string, ledger model.Ledger) error {
	f, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("create %s: %w", path, err)
	}
	defer f.Close()
	return WriteJSON(f, ledger)
}

// Marshal returns the pretty-printed ledger JSON bytes (used to inline the
// ledger into the self-contained HTML report).
func Marshal(ledger model.Ledger) ([]byte, error) {
	b, err := json.MarshalIndent(ledger, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("marshal ledger: %w", err)
	}
	return b, nil
}
