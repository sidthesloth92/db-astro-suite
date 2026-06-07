// Package wizard presents the no-argument interactive flow so a non-technical
// user can run Celestory without learning any flags. It collects the source
// folder, the output folder, and the cache location, all pre-filled with
// sensible defaults.
package wizard

import (
	"fmt"
	"os"
	"strings"

	"github.com/charmbracelet/huh"
)

// Choices are the inputs collected from the user.
type Choices struct {
	SourceDir string
	OutputDir string
	CacheDir  string
}

// Run shows the interactive form pre-filled with defaults. The returned bool is
// false when the user aborts (e.g. Esc / Ctrl+C).
func Run(defaults Choices) (Choices, bool, error) {
	c := defaults
	form := huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("Which folder are your images in?").
				Description("Celestory scans it (and every sub-folder) for FITS files.").
				Value(&c.SourceDir).
				Validate(validateExistingDir),
			huh.NewInput().
				Title("Where should I save ledger.json?").
				Description("ledger.json is written here — upload it to the Celestory web app to visualise.").
				Value(&c.OutputDir).
				Validate(validateExistingDir),
			huh.NewInput().
				Title("Where should the scan cache live?").
				Description("Speeds up future runs. Press enter to accept the default.").
				Value(&c.CacheDir),
		),
	)
	if err := form.Run(); err != nil {
		if err == huh.ErrUserAborted {
			return Choices{}, false, nil
		}
		return Choices{}, false, fmt.Errorf("wizard: %w", err)
	}
	c.SourceDir = strings.TrimSpace(c.SourceDir)
	c.OutputDir = strings.TrimSpace(c.OutputDir)
	c.CacheDir = strings.TrimSpace(c.CacheDir)
	return c, true, nil
}

func validateExistingDir(s string) error {
	s = strings.TrimSpace(s)
	if s == "" {
		return fmt.Errorf("please enter a folder path")
	}
	info, err := os.Stat(s)
	if err != nil {
		return fmt.Errorf("can't open that folder")
	}
	if !info.IsDir() {
		return fmt.Errorf("that's a file, not a folder")
	}
	return nil
}
