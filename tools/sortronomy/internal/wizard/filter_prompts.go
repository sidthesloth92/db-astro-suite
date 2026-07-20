package wizard

import (
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/charmbracelet/huh"

	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/config"
	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/fits"
	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/organize"
)

const (
	menuChoosePreset = "choose-preset"
	menuAddPreset    = "add-preset"
	menuDeletePreset = "delete-preset"

	// presetChoiceBack is the sentinel value for the "Back" entry in the
	// Choose/Delete preset sub-lists, whose other options are slice indices.
	presetChoiceBack = -1
)

// resolveFilter runs the interactive filter-preset flow after the user answers
// Yes to the filter gate: a fixed menu offering to choose a saved filter, add
// a new one (persisted immediately and used for this run), or delete one
// (returning to the menu). draft carries any partially flag-supplied filter
// values to pre-fill the add form. Returns the possibly updated config and the
// filter to apply this run.
func resolveFilter(log *slog.Logger, cfg config.Config, draft organize.FilterTag) (config.Config, organize.FilterTag, error) {
	for {
		choice := menuChoosePreset
		form := huh.NewForm(
			huh.NewGroup(
				huh.NewSelect[string]().
					Title("Filter for this batch").
					Description(fmt.Sprintf("%d saved filter(s).", len(cfg.FilterPresets))).
					Options(
						huh.NewOption("Choose a saved filter", menuChoosePreset),
						huh.NewOption("Add a new filter", menuAddPreset),
						huh.NewOption("Delete a filter", menuDeletePreset),
					).
					Value(&choice),
			),
		)
		if err := form.Run(); err != nil {
			return cfg, draft, err
		}

		switch choice {
		case menuChoosePreset:
			preset, ok, err := choosePresetPrompt(cfg.FilterPresets)
			if err != nil {
				return cfg, draft, err
			}
			if ok {
				log.Info("filter preset selected", "name", preset.Name, "type", preset.Type)
				return cfg, filterTagFromPreset(preset), nil
			}
			// Back — re-show the menu.
		case menuAddPreset:
			return createFilterPreset(log, cfg, draft)
		case menuDeletePreset:
			var err error
			cfg, err = deleteFilterPresetPrompt(log, cfg)
			if err != nil {
				return cfg, draft, err
			}
			// Deleted or backed out — re-show the menu either way.
		}
	}
}

// createFilterPreset asks the three filter questions (name first — it doubles
// as the preset's identity), saves the new preset to config immediately, and
// returns it as the filter for the current run.
func createFilterPreset(log *slog.Logger, cfg config.Config, draft organize.FilterTag) (config.Config, organize.FilterTag, error) {
	tag := draft
	form := huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("Filter name (FITS keyword value)").
				Description("The exact value written into the FITS FILTER keyword of every copied file, e.g. SV220. It is appended to each filename as _f_<name>, and it is also the name this filter is saved and listed under in the saved-filter menu.").
				Value(&tag.Name).
				Validate(filterNameValidator(cfg.FilterPresets)),
			huh.NewInput().
				Title("Filter type (folder label)").
				Description("The label used to name the folder in your organized tree, e.g. Ha, OIII, SII. Keep it short — this is what you'll see when browsing your files.").
				Value(&tag.Type).
				Validate(validateNonEmpty),
			huh.NewInput().
				Title("Filter description (optional)").
				Description(fmt.Sprintf("A human-readable note stored in the FITS FILTDESC keyword of every copied file, e.g. Svbony SV220 7nm Ha. Useful for identifying the exact filter model later. Up to %d characters. Leave blank to skip.", fits.MaxFilterDescLen)).
				Value(&tag.Description).
				Validate(validateFilterDescription),
		),
	)
	if err := form.Run(); err != nil {
		return cfg, draft, err
	}

	preset := config.FilterPreset{
		Name:        strings.TrimSpace(tag.Name),
		Type:        strings.TrimSpace(tag.Type),
		Description: strings.TrimSpace(tag.Description),
	}
	cfg.FilterPresets = config.AddFilterPreset(cfg.FilterPresets, preset)
	log.Info("filter preset created", "name", preset.Name, "type", preset.Type)
	saveFilterPresets(log, cfg)
	return cfg, filterTagFromPreset(preset), nil
}

// choosePresetPrompt asks which saved preset to use. It returns the chosen
// preset and true, or false when the user picks Back (or no presets exist —
// the list then only offers Back).
func choosePresetPrompt(presets []config.FilterPreset) (config.FilterPreset, bool, error) {
	choice := defaultPresetChoice(presets)
	form := huh.NewForm(
		huh.NewGroup(
			huh.NewSelect[int]().
				Title("Choose a saved filter").
				Description(presetListDescription(presets)).
				Options(presetSelectOptions(presets)...).
				Value(&choice),
		),
	)
	if err := form.Run(); err != nil {
		return config.FilterPreset{}, false, err
	}
	if choice == presetChoiceBack {
		return config.FilterPreset{}, false, nil
	}
	return presets[choice], true, nil
}

// deleteFilterPresetPrompt asks which saved preset to delete, confirms, and
// persists the removal immediately. Backing out at either step returns the
// config unchanged.
func deleteFilterPresetPrompt(log *slog.Logger, cfg config.Config) (config.Config, error) {
	choice := defaultPresetChoice(cfg.FilterPresets)
	form := huh.NewForm(
		huh.NewGroup(
			huh.NewSelect[int]().
				Title("Delete a filter").
				Description(presetListDescription(cfg.FilterPresets)).
				Options(presetSelectOptions(cfg.FilterPresets)...).
				Value(&choice),
		),
	)
	if err := form.Run(); err != nil {
		return cfg, err
	}
	if choice == presetChoiceBack {
		return cfg, nil
	}

	preset := cfg.FilterPresets[choice]
	confirmed := false
	confirm := huh.NewForm(
		huh.NewGroup(
			huh.NewConfirm().
				Title(fmt.Sprintf("Delete filter %q?", preset.Name)).
				Description("This only removes the saved entry from the menu — no image files are touched. This cannot be undone.").
				Affirmative("Delete").
				Negative("Keep").
				Value(&confirmed),
		),
	)
	if err := confirm.Run(); err != nil {
		return cfg, err
	}
	if !confirmed {
		return cfg, nil
	}

	cfg.FilterPresets = config.RemoveFilterPreset(cfg.FilterPresets, preset.Name)
	log.Info("filter preset deleted", "name", preset.Name)
	saveFilterPresets(log, cfg)
	return cfg, nil
}

// saveFilterPresets persists cfg after a preset change. Best-effort like
// persistOrganize: a failure is reported but never aborts the flow — the
// current run still gets its filter.
func saveFilterPresets(log *slog.Logger, cfg config.Config) {
	if err := config.Save(cfg); err != nil {
		log.Warn("saving filter presets failed", "err", err)
		fmt.Fprintf(os.Stderr, "sortronomy: warning: could not save filter presets: %v\n", err)
	}
}

// defaultPresetChoice is the initially highlighted sub-list entry: the first
// preset when any exist (the common case is picking one), otherwise Back.
func defaultPresetChoice(presets []config.FilterPreset) int {
	if len(presets) == 0 {
		return presetChoiceBack
	}
	return 0
}

// presetSelectOptions builds the Choose/Delete sub-list options: one entry per
// preset (valued by slice index) followed by a Back entry.
func presetSelectOptions(presets []config.FilterPreset) []huh.Option[int] {
	opts := make([]huh.Option[int], 0, len(presets)+1)
	for i, p := range presets {
		opts = append(opts, huh.NewOption(presetOptionLabel(p), i))
	}
	return append(opts, huh.NewOption("Back", presetChoiceBack))
}

// presetListDescription summarises the sub-list state, pointing first-time
// users at the Add flow when nothing is saved yet.
func presetListDescription(presets []config.FilterPreset) string {
	if len(presets) == 0 {
		return "No saved filter presets yet — go back and pick \"Add a new filter\"."
	}
	return fmt.Sprintf("%d saved filter(s).", len(presets))
}

// presetOptionLabel renders a preset menu entry, e.g. "SV220 — Ha (Svbony
// SV220 7nm Ha)"; the description part is omitted when empty.
func presetOptionLabel(p config.FilterPreset) string {
	if p.Description == "" {
		return fmt.Sprintf("%s — %s", p.Name, p.Type)
	}
	return fmt.Sprintf("%s — %s (%s)", p.Name, p.Type, p.Description)
}

// filterNameValidator returns an input validator that rejects blank names,
// names the FITS FILTER card cannot hold (too long, quotes, non-ASCII), and
// names already used by a saved preset (case-insensitive).
func filterNameValidator(presets []config.FilterPreset) func(string) error {
	return func(s string) error {
		if strings.TrimSpace(s) == "" {
			return errors.New("required")
		}
		if err := fits.ValidateFilterName(strings.TrimSpace(s)); err != nil {
			return err
		}
		if _, exists := config.FindFilterPreset(presets, s); exists {
			return errors.New("a filter with this name is already saved")
		}
		return nil
	}
}

// validateFilterDescription rejects descriptions the FITS FILTDESC card cannot
// hold on a single 80-char card (too long, quotes, non-ASCII). Blank passes —
// the description is optional.
func validateFilterDescription(s string) error {
	return fits.ValidateFilterDescription(strings.TrimSpace(s))
}

// filterTagFromPreset maps a stored preset to the organize-layer filter values.
func filterTagFromPreset(p config.FilterPreset) organize.FilterTag {
	return organize.FilterTag{
		Name:        p.Name,
		Type:        p.Type,
		Description: p.Description,
	}
}

// filterSuppliedByFlags reports whether opts arrived with a complete filter
// (folder label and FITS name both set) from the CLI flags — in that case the
// interactive preset menu is skipped and the flag values are used as-is.
func filterSuppliedByFlags(opts organize.Options) bool {
	return strings.TrimSpace(opts.Filter.Type) != "" && strings.TrimSpace(opts.Filter.Name) != ""
}
