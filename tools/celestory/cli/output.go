package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const jsonFileName = "celestory.json"

// resolveOutputs decides where celestory.json is written. An empty out means the
// current working directory; a ".json" path names the file directly; anything
// else is treated as a directory.
func resolveOutputs(out string) (jsonPath string, err error) {
	out = strings.TrimSpace(out)
	if out == "" {
		cwd, e := os.Getwd()
		if e != nil {
			return "", fmt.Errorf("determine working directory: %w", e)
		}
		return filepath.Join(cwd, jsonFileName), nil
	}
	if strings.EqualFold(filepath.Ext(out), ".json") {
		return out, nil
	}
	if err := os.MkdirAll(out, 0o755); err != nil {
		return "", fmt.Errorf("create output dir %s: %w", out, err)
	}
	return filepath.Join(out, jsonFileName), nil
}
