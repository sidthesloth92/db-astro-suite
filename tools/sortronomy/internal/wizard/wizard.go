// Package wizard renders the interactive top-level menu for sortronomy and
// dispatches to the chosen subcommand.
package wizard

import (
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"

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
	reviewEdit     = "edit"
	reviewCancel   = "cancel"
)

// renameFlatsEnabled gates the "Rename master flats" flow and the top-level
// action menu. Hidden for now — flip to true to restore both.
const renameFlatsEnabled = false

// Run shows the top-level menu and dispatches to the chosen flow.
func Run(log *slog.Logger) error {
	cfg, err := config.Load() // missing/corrupt → zero value; non-fatal
	if err != nil {
		log.Warn("config load failed; using defaults", "err", err)
	}

	if !renameFlatsEnabled {
		// Only the organize flow is available — skip the action menu and go
		// straight to it.
		return runOrganize(cfg, log)
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
		return runOrganize(cfg, log)
	case actionRenameFlats:
		return runRenameFlats(cfg)
	case actionQuit:
		return nil
	default:
		return fmt.Errorf("unknown action: %q", action)
	}
}

func runOrganize(cfg config.Config, log *slog.Logger) error {
	// Pre-fill paths and rollover hour from last run so the user can Enter
	// through unchanged. A zero stored value (or first-run users) gets the
	// hardcoded default.
	rollover := cfg.Organize.SessionRolloverHour
	if rollover == 0 {
		rollover = organize.DefaultSessionRolloverHour
	}
	opts := organize.Options{
		SourceDir:           cfg.Organize.SourceDir,
		OutputDir:           cfg.Organize.OutputDir,
		SessionRolloverHour: rollover,
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

		decision := reviewContinue
		if err := showOrganizeReview(opts, &decision); err != nil {
			return err
		}
		switch decision {
		case reviewContinue:
			if err := organize.Run(opts, log); err != nil {
				return err
			}
			// Persist the paths and rollover hour only after a successful run.
			cfg.Organize = config.OrganizeSettings{
				SourceDir:           opts.SourceDir,
				OutputDir:           opts.OutputDir,
				SessionRolloverHour: opts.SessionRolloverHour,
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

func organizeForm(opts *organize.Options, tagFilter *bool, rolloverHour *string) error {
	form := huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("Source directory").
				Value(&opts.SourceDir).
				Validate(validateDir),
			huh.NewInput().
				Title("Output directory (blank = ./output)").
				Value(&opts.OutputDir),
		),
		huh.NewGroup(
			huh.NewConfirm().
				Title("Group by focal length?").
				Description("Groups pictures by the camera's focal length. Handy when you use the same camera with telescopes of different focal lengths.").
				Affirmative("Yes").
				Negative("No").
				Value(&opts.GroupByFocal).
				WithButtonAlignment(lipgloss.Left),
			huh.NewConfirm().
				Title("Group imaging session?").
				Description("No groups frames by their actual capture day. Yes rolls frames captured after a cutoff hour into the next day's session, so a night crossing midnight (plus its morning flats) share one folder.").
				Affirmative("Yes").
				Negative("No").
				Value(&opts.GroupSession).
				WithButtonAlignment(lipgloss.Left),
			huh.NewConfirm().
				Title("Set the filter for these images?").
				Description("Pick Yes for OSC, or to relabel a mono filter slot.").
				Affirmative("Yes").
				Negative("No").
				Value(tagFilter).
				WithButtonAlignment(lipgloss.Left),
		),
		huh.NewGroup(
			huh.NewInput().
				Title("Session cutoff hour (0–23)").
				Description("Frames captured at or after this hour roll into the next day's session. Helps apply the same flats to images from a previous night's session.").
				Value(rolloverHour).
				Validate(validateRolloverHour),
		).WithHideFunc(func() bool { return !opts.GroupSession }),
		huh.NewGroup(
			huh.NewInput().
				Title("Filter type (folder label, e.g. Ha / OIII)").
				Value(&opts.Filter.Type),
			huh.NewInput().
				Title("Filter name (FITS filter value, e.g. SV220)").
				Value(&opts.Filter.Name),
			huh.NewInput().
				Title("Filter description (FITS filter description)").
				Value(&opts.Filter.Description),
		).WithHideFunc(func() bool { return !*tagFilter }),
	)
	return form.Run()
}

func showOrganizeReview(opts organize.Options, decision *string) error {
	desc := buildOrganizeReviewText(opts)
	*decision = reviewContinue
	return huh.NewForm(
		huh.NewGroup(
			huh.NewSelect[string]().
				Title("Review").
				Description(desc).
				Options(
					huh.NewOption("Execute", reviewContinue),
					huh.NewOption("Go back and edit", reviewEdit),
					huh.NewOption("Cancel", reviewCancel),
				).
				Value(decision),
		),
	).Run()
}

func buildOrganizeReviewText(opts organize.Options) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Source:           %s\n", opts.SourceDir)
	fmt.Fprintf(&b, "Output:           %s\n", opts.OutputDir)
	fmt.Fprintf(&b, "Group by focal:   %s\n", yesNo(opts.GroupByFocal))
	if opts.GroupSession {
		fmt.Fprintf(&b, "Group session:    Yes — rolls at %02d:00\n", opts.SessionRolloverHour)
	} else {
		fmt.Fprintln(&b, "Group session:    No (filed by capture day)")
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
