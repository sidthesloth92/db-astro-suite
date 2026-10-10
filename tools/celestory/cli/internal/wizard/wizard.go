// Package wizard presents the no-argument interactive flow so a non-technical
// user can run Celestory without learning any flags. It collects the source
// folder, the output folder, and the cache location, all pre-filled with
// sensible defaults.
package wizard

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/charmbracelet/huh"
)

// Choices are the inputs collected from the user.
type Choices struct {
	SourceDir string
	OutputDir string
	ProfileID string
}

// Run shows the interactive form pre-filled with defaults. The returned bool is
// false when the user aborts (e.g. Esc / Ctrl+C).
func Run(defaults Choices) (Choices, bool, error) {
	c := defaults
	form := huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("Which folder are your images in?").
				Description("Celestory scans it (and every sub-folder) for FITS files. Tab completes folder names.").
				Value(&c.SourceDir).
				SuggestionsFunc(func() []string { return dirSuggestions(c.SourceDir) }, &c.SourceDir).
				Validate(validateExistingDir),
			huh.NewInput().
				Title("Where should I save celestory.json?").
				Description("celestory.json is written here — upload it to the Celestory web app to visualise.").
				Value(&c.OutputDir).
				SuggestionsFunc(func() []string { return dirSuggestions(c.OutputDir) }, &c.OutputDir).
				Validate(validateExistingDir),
			huh.NewInput().
				Title("Your Celestory username (optional)").
				Description("Enter your username if you've already created one online by publishing. If not, leave it blank.").
				Value(&c.ProfileID),
		),
	).WithKeyMap(completionKeyMap())
	if err := form.Run(); err != nil {
		if err == huh.ErrUserAborted {
			return Choices{}, false, nil
		}
		return Choices{}, false, fmt.Errorf("wizard: %w", err)
	}
	c.SourceDir = strings.TrimSpace(c.SourceDir)
	c.OutputDir = strings.TrimSpace(c.OutputDir)
	c.ProfileID = strings.TrimSpace(c.ProfileID)
	return c, true, nil
}

// completionKeyMap rebinds the input keymap so Tab completes the folder
// suggestion (instead of advancing the field, which would validate a
// half-typed path and show a confusing error). Enter advances/submits.
func completionKeyMap() *huh.KeyMap {
	km := huh.NewDefaultKeyMap()
	km.Input.AcceptSuggestion.SetKeys("tab", "ctrl+e")
	km.Input.AcceptSuggestion.SetHelp("tab", "complete")
	km.Input.AcceptSuggestion.SetEnabled(true)
	km.Input.Next.SetKeys("enter")
	km.Input.Next.SetHelp("enter", "next")
	return km
}

// dirSuggestions returns sub-folder paths for autocomplete, based on what the
// user has typed so far. huh matches these against the current input as a
// prefix, so they are full paths with a trailing separator (allowing the user
// to keep pressing Tab to descend). Hidden folders are omitted.
func dirSuggestions(current string) []string {
	current = strings.TrimSpace(current)

	var base string
	switch {
	case current == "":
		if wd, err := os.Getwd(); err == nil {
			base = wd
		} else {
			return nil
		}
	case strings.HasSuffix(current, string(os.PathSeparator)):
		base = current
	default:
		base = filepath.Dir(current)
	}

	entries, err := os.ReadDir(base)
	if err != nil {
		return nil
	}
	suggestions := make([]string, 0, len(entries))
	for _, e := range entries {
		if !e.IsDir() || strings.HasPrefix(e.Name(), ".") {
			continue
		}
		suggestions = append(suggestions, filepath.Join(base, e.Name())+string(os.PathSeparator))
	}
	return suggestions
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
