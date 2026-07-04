// Package wizard drives sortronomy's top-level flows: the interactive menu
// (Run) that prompts for options and a review before acting, and the
// non-interactive, flag-driven path (RunNonInteractive) used by the --yes flag,
// which executes straight from the supplied options with no prompts.
package wizard

import (
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/charmbracelet/bubbles/key"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"

	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/config"
	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/flats"
	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/organize"
)

const (
	actionOrganize    = "organize"
	actionRenameFlats = "rename-flats"
	actionQuit        = "quit"

	reviewContinue = "continue"
	reviewDryRun   = "dry-run"
	reviewEdit     = "edit"
	reviewCancel   = "cancel"
)

// renameFlatsEnabled gates the "Rename master flats" flow and the top-level
// action menu. Hidden for now — flip to true to restore both.
const renameFlatsEnabled = false

// Run shows the top-level menu and dispatches to the chosen flow. opts holds
// any values pre-filled from CLI flags + persisted config; dryRun reflects the
// --dry-run flag and pre-selects the dry-run choice on the review screen.
func Run(log *slog.Logger, cfg config.Config, opts organize.Options, dryRun bool) error {
	if !renameFlatsEnabled {
		// Only the organize flow is available — skip the action menu and go
		// straight to it.
		return runOrganize(cfg, opts, dryRun, log)
	}

	action := ""
	form := huh.NewForm(
		huh.NewGroup(
			huh.NewSelect[string]().
				Title("What do you want to do?").
				Options(
					huh.NewOption("Organize images by date", actionOrganize),
					huh.NewOption("Rename master flats", actionRenameFlats),
					huh.NewOption("Quit", actionQuit),
				).
				Value(&action),
		),
	)
	if err := form.Run(); err != nil {
		return err
	}

	switch action {
	case actionOrganize:
		return runOrganize(cfg, opts, dryRun, log)
	case actionRenameFlats:
		return runRenameFlats(cfg)
	case actionQuit:
		return nil
	default:
		return fmt.Errorf("unknown action: %q", action)
	}
}

func runOrganize(cfg config.Config, opts organize.Options, dryRun bool, log *slog.Logger) error {
	// opts arrives pre-filled from CLI flags + last-run config. A zero rollover
	// (first-run users, no flag) shows the hardcoded default in the form.
	if opts.SessionRolloverHour == 0 {
		opts.SessionRolloverHour = organize.DefaultSessionRolloverHour
	}

	for {
		tagFilter := opts.TagFilter
		rolloverStr := strconv.Itoa(opts.SessionRolloverHour)
		if err := organizeForm(&opts, &tagFilter, &rolloverStr); err != nil {
			return err
		}
		opts.TagFilter = tagFilter
		if n, err := strconv.Atoi(strings.TrimSpace(rolloverStr)); err == nil {
			opts.SessionRolloverHour = n
		}
		if opts.OutputDir == "" {
			opts.OutputDir = "./output"
		}

		// Default the review selection to dry-run when --dry-run was passed.
		decision := reviewContinue
		if dryRun {
			decision = reviewDryRun
		}
		if err := showOrganizeReview(opts, &decision); err != nil {
			return err
		}
		switch decision {
		case reviewContinue:
			if err := organize.Run(opts, log); err != nil {
				return err
			}
			persistOrganize(cfg, opts) // only after a successful run
			return nil
		case reviewDryRun:
			if err := organize.DryRun(opts, log); err != nil {
				return err
			}
			persistOrganize(cfg, opts)
			return nil
		case reviewEdit:
			continue
		case reviewCancel:
			fmt.Println("Cancelled.")
			return nil
		}
	}
}

// RunNonInteractive executes the organize flow straight from opts with no
// prompts and no review screen — the --yes / -y path. It applies the same
// output default and input validation the wizard does, enforces that a filter
// (when set) has both its folder label and FITS name, then runs the real copy
// or, when dryRun is true, the folders-only dry run.
func RunNonInteractive(log *slog.Logger, cfg config.Config, opts organize.Options, dryRun bool) error {
	if opts.OutputDir == "" {
		opts.OutputDir = "./output"
	}
	if err := validateDir(opts.InputDir); err != nil {
		return &UsageError{Msg: "input directory", Err: err}
	}
	if err := validateFilterOptions(opts); err != nil {
		return err
	}

	var runErr error
	if dryRun {
		runErr = organize.DryRun(opts, log)
	} else {
		runErr = organize.Run(opts, log)
	}
	if runErr != nil {
		return runErr
	}
	persistOrganize(cfg, opts)
	return nil
}

// persistOrganize saves the organize paths, grouping toggles, and rollover hour
// for the next run, preserving the rest of cfg. Filter info is intentionally
// excluded — it's image-set specific and should be re-confirmed each run.
// Best-effort: a save failure never fails the run.
func persistOrganize(cfg config.Config, opts organize.Options) {
	cfg.Organize = config.OrganizeSettings{
		InputDir:            opts.InputDir,
		OutputDir:           opts.OutputDir,
		SessionRolloverHour: opts.SessionRolloverHour,
		GroupByFocal:        opts.GroupByFocal,
		GroupByDate:         opts.GroupByDate,
		GroupByFilter:       opts.GroupByFilter,
		GroupSession:        opts.GroupSession,
	}
	_ = config.Save(cfg)
}

// validateFilterOptions enforces that both the folder label (Type) and the FITS
// filter name (Name) are present once filter mode is engaged. The description
// stays optional. Mirrors the per-field validation in the interactive form.
func validateFilterOptions(opts organize.Options) error {
	if opts.TagFilter && (strings.TrimSpace(opts.Filter.Type) == "" || strings.TrimSpace(opts.Filter.Name) == "") {
		return &UsageError{Msg: "--filter-type and --filter-name are both required when setting a filter"}
	}
	return nil
}

func organizeForm(opts *organize.Options, tagFilter *bool, rolloverHour *string) error {
	form := huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("Input directory").
				Value(&opts.InputDir).
				SuggestionsFunc(dirSuggestions(&opts.InputDir), &opts.InputDir).
				Validate(validateDir),
			huh.NewInput().
				Title("Output directory (blank = ./output)").
				Value(&opts.OutputDir).
				SuggestionsFunc(dirSuggestions(&opts.OutputDir), &opts.OutputDir),
		),
		huh.NewGroup(
			huh.NewConfirm().
				Title("Group by focal length?").
				Description("Groups images into a focal-length subfolder (e.g. 705/). Handy when you use the same camera with telescopes of different focal lengths and want each kept separate.").
				Affirmative("Yes").
				Negative("No").
				Value(&opts.GroupByFocal).
				WithButtonAlignment(lipgloss.Left),
			huh.NewConfirm().
				Title("Group by date?").
				Description("Adds a date folder (e.g. 2025-07-21) under each target. Useful if you shoot the same target across multiple nights and want the nights kept separate. Turn off to collect all frames for a target in one folder regardless of date.").
				Affirmative("Yes").
				Negative("No").
				Value(&opts.GroupByDate).
				WithButtonAlignment(lipgloss.Left),
			huh.NewConfirm().
				Title("Group by filter?").
				Description("Files frames into per-filter subfolders (e.g. Ha/, OIII/). Useful when mixing filters in the same session and you want each kept separate. Turn off to collect all frames for a target together regardless of filter.").
				Affirmative("Yes").
				Negative("No").
				Value(&opts.GroupByFilter).
				WithButtonAlignment(lipgloss.Left),
			huh.NewConfirm().
				Title("Group imaging session?").
				Description("When on, frames captured at or after a cutoff hour roll into the next calendar day's folder — so a night that crosses midnight, plus its morning flats, share one dated folder. The cutoff is matched against each frame's local capture time (read from the filename, falling back to the DATE-LOC then DATE-OBS header). Only applies when grouping by date.").
				Affirmative("Yes").
				Negative("No").
				Value(&opts.GroupSession).
				WithButtonAlignment(lipgloss.Left),
		),
		huh.NewGroup(
			huh.NewInput().
				Title("Session cutoff hour (0–23)").
				Description("Frames captured at or after this hour, in your local time, are filed under the next calendar day. Sortronomy reads that local time from the filename when it can (ASIAIR, N.I.N.A., SharpCap…), otherwise the DATE-LOC header, and only as a last resort the UTC DATE-OBS. The default (18) works well for evening sessions that run past midnight.").
				Value(rolloverHour).
				Validate(validateRolloverHour),
		).WithHideFunc(func() bool { return !opts.GroupSession }),
		huh.NewGroup(
			huh.NewConfirm().
				Title("Set a filter for all images?").
				Description("Pick Yes if using an OSC (one-shot-colour) camera, or if you want to override the filter label for all images in this batch. If No, Sortronomy will autodetect the filter from each file's FITS header.").
				Affirmative("Yes").
				Negative("No").
				Value(tagFilter).
				WithButtonAlignment(lipgloss.Left),
		),
		huh.NewGroup(
			huh.NewInput().
				Title("Filter type (folder label)").
				Description("The label used to name the folder in your organized tree, e.g. Ha, OIII, SII. Keep it short — this is what you'll see when browsing your files.").
				Value(&opts.Filter.Type).
				Validate(validateNonEmpty),
			huh.NewInput().
				Title("Filter name (FITS keyword value)").
				Description("The exact value written into the FITS FILTER keyword of every copied file, e.g. SV220. It is also appended to each filename as _f_<name> so you can tell files apart at a glance.").
				Value(&opts.Filter.Name).
				Validate(validateNonEmpty),
			huh.NewInput().
				Title("Filter description (optional)").
				Description("A human-readable note stored as a comment alongside the FITS FILTER keyword, e.g. Svbony SV220 7nm Ha. Useful for identifying the exact filter model later. Leave blank to skip.").
				Value(&opts.Filter.Description),
		).WithHideFunc(func() bool { return !*tagFilter }),
	).WithKeyMap(pathInputKeyMap())
	return form.Run()
}

// pathInputKeyMap rebinds the Input field's keys so Tab accepts the path
// autocompletion suggestion (shell-style) and Enter advances to the next field.
// huh's default binds Tab to "next field", which validates the half-typed path
// the user is still completing and surfaces a spurious "no such file or
// directory" before they can accept the suggestion (whose default key, ctrl+e,
// is not discoverable). All other field keybindings keep their defaults.
func pathInputKeyMap() *huh.KeyMap {
	km := huh.NewDefaultKeyMap()
	km.Input.AcceptSuggestion = key.NewBinding(key.WithKeys("tab"), key.WithHelp("tab", "complete"))
	km.Input.Next = key.NewBinding(key.WithKeys("enter"), key.WithHelp("enter", "next"))
	return km
}

func showOrganizeReview(opts organize.Options, decision *string) error {
	desc := buildOrganizeReviewText(opts)
	// The caller seeds *decision (Execute, or Dry run when --dry-run was passed)
	// so the Select highlights that option by default.
	return huh.NewForm(
		huh.NewGroup(
			huh.NewSelect[string]().
				Title("Review").
				Description(desc).
				Options(
					huh.NewOption("Execute", reviewContinue),
					huh.NewOption("Dry run — create folders only", reviewDryRun),
					huh.NewOption("Go back and edit", reviewEdit),
					huh.NewOption("Cancel", reviewCancel),
				).
				Value(decision),
		),
	).Run()
}

func buildOrganizeReviewText(opts organize.Options) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Input:            %s\n", opts.InputDir)
	fmt.Fprintf(&b, "Output:           %s\n", opts.OutputDir)
	fmt.Fprintf(&b, "Group by focal:   %s\n", yesNo(opts.GroupByFocal))
	fmt.Fprintf(&b, "Group by date:    %s\n", yesNo(opts.GroupByDate))
	fmt.Fprintf(&b, "Group by filter:  %s\n", yesNo(opts.GroupByFilter))
	if opts.GroupByDate && opts.GroupSession {
		fmt.Fprintf(&b, "Group session:    Yes — rolls at %02d:00\n", opts.SessionRolloverHour)
	} else if opts.GroupByDate {
		fmt.Fprintln(&b, "Group session:    No (filed by literal capture day)")
	} else {
		fmt.Fprintln(&b, "Group session:    N/A (date grouping off)")
	}
	if opts.TagFilter {
		if opts.Filter.Description != "" {
			fmt.Fprintf(&b, "Set filter:       Yes — %s (%s)\n", opts.Filter.Type, opts.Filter.Description)
		} else {
			fmt.Fprintf(&b, "Set filter:       Yes — %s\n", opts.Filter.Type)
		}
	} else {
		fmt.Fprintln(&b, "Set filter:       No")
	}
	return b.String()
}

func runRenameFlats(cfg config.Config) error {
	opts := flats.Options{
		InputDir:  cfg.Flats.InputDir,
		OutputDir: cfg.Flats.OutputDir,
	}

	for {
		if err := flatsForm(&opts); err != nil {
			return err
		}

		decision := reviewContinue
		if err := huh.NewForm(
			huh.NewGroup(
				huh.NewSelect[string]().
					Title("Review").
					Description(fmt.Sprintf(
						"Input:   %s\nOutput:  %s\n\nFlats will be copied with names taken from the substring after the last underscore.",
						opts.InputDir, opts.OutputDir,
					)).
					Options(
						huh.NewOption("Continue", reviewContinue),
						huh.NewOption("Go back and edit", reviewEdit),
						huh.NewOption("Cancel", reviewCancel),
					).
					Value(&decision),
			),
		).Run(); err != nil {
			return err
		}

		switch decision {
		case reviewContinue:
			if err := flats.Run(opts); err != nil {
				return err
			}
			cfg.Flats = config.FlatsPaths{
				InputDir:  opts.InputDir,
				OutputDir: opts.OutputDir,
			}
			_ = config.Save(cfg)
			return nil
		case reviewEdit:
			continue
		case reviewCancel:
			fmt.Println("Cancelled.")
			return nil
		}
	}
}

func flatsForm(opts *flats.Options) error {
	form := huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("Input directory").
				Value(&opts.InputDir).
				Validate(validateDir),
			huh.NewInput().
				Title("Output directory").
				Value(&opts.OutputDir).
				Validate(validateNonEmpty),
		),
	)
	return form.Run()
}

// dirSuggestions returns a huh SuggestionsFunc that lists matching
// subdirectories as the user types a path. Pass &val as both the function
// source and the binding so huh re-evaluates on every keystroke.
//
// ~ is expanded to the user's home directory. Hidden entries (dot-prefixed)
// are omitted. Only directories are listed — input and output are both dirs.
func dirSuggestions(val *string) func() []string {
	return func() []string {
		input := *val

		// Expand ~ prefix.
		if input == "~" || strings.HasPrefix(input, "~/") {
			if home, err := os.UserHomeDir(); err == nil {
				input = home + input[1:]
			}
		}

		var dir, prefix string
		if input == "" || strings.HasSuffix(input, string(filepath.Separator)) {
			if input == "" {
				dir = "."
			} else {
				dir = input
			}
			prefix = ""
		} else {
			dir = filepath.Dir(input)
			prefix = strings.ToLower(filepath.Base(input))
		}

		entries, err := os.ReadDir(dir)
		if err != nil {
			return nil
		}

		var out []string
		for _, e := range entries {
			if !e.IsDir() {
				continue
			}
			name := e.Name()
			if strings.HasPrefix(name, ".") {
				continue
			}
			if prefix != "" && !strings.HasPrefix(strings.ToLower(name), prefix) {
				continue
			}
			out = append(out, filepath.Join(dir, name))
		}
		return out
	}
}

func validateDir(s string) error {
	if s == "" {
		return errors.New("required")
	}
	info, err := os.Stat(s)
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return errors.New("not a directory")
	}
	return nil
}

func validateNonEmpty(s string) error {
	if strings.TrimSpace(s) == "" {
		return errors.New("required")
	}
	return nil
}

// validateRolloverHour accepts "0".."23" only. The 18 default still applies
// when SessionRolloverHour is later seen as 0 inside BuildPlan, but here we
// keep the user's input strict so the persisted value matches what they typed.
func validateRolloverHour(s string) error {
	s = strings.TrimSpace(s)
	if s == "" {
		return errors.New("required (0–23)")
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return errors.New("must be a whole number 0–23")
	}
	if n < 0 || n > 23 {
		return errors.New("must be between 0 and 23")
	}
	return nil
}

func yesNo(b bool) string {
	if b {
		return "Yes"
	}
	return "No"
}
