package main

import (
	"errors"
	"flag"
	"io"

	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/config"
	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/organize"
)

// parsedArgs is the result of parsing the command line: the organize options
// the user supplied, plus the meta-flags that steer how the run proceeds.
type parsedArgs struct {
	Options organize.Options
	DryRun  bool // --dry-run: create folders only, copy nothing
	Yes     bool // --yes/-y: run non-interactively, no prompts
	Debug   bool // --debug: verbose logging
	Version bool // -v/--version: print version and exit
	Help    bool // -h/--help: print usage and exit
}

// parseArgs parses CLI flags into organize options + meta-flags. Paths,
// grouping toggles, and the rollover hour default to the values in cfg so an
// unset flag falls back to the user's last run. TagFilter is inferred — true
// when any --filter-* value is supplied — rather than gated by a separate flag.
//
// Completeness of an engaged filter (both label and name) is enforced by the
// caller — the headless runner for --yes, the form for the interactive path —
// not here, so partial flags can still pre-fill the wizard.
func parseArgs(args []string, cfg config.Config) (parsedArgs, error) {
	fs := flag.NewFlagSet("sortronomy", flag.ContinueOnError)
	// We render usage (usageText) and errors ourselves; keep the flag package quiet.
	fs.SetOutput(io.Discard)
	fs.Usage = func() {}

	input := fs.String("input", cfg.Organize.InputDir, "input directory of FITS files")
	output := fs.String("output", cfg.Organize.OutputDir, "output directory (blank = ./output)")
	// Grouping toggles default to the persisted value so the user's last choice
	// is preserved across runs. Pass --flag=false to explicitly turn one off.
	groupFocal := fs.Bool("group-focal", cfg.Organize.GroupByFocal, "group by focal length")
	groupDate := fs.Bool("group-date", cfg.Organize.GroupByDate, "include the capture date as a folder level")
	groupFilter := fs.Bool("group-filter", cfg.Organize.GroupByFilter, "file frames into per-filter subfolders")
	groupSession := fs.Bool("group-session", cfg.Organize.GroupSession, "roll late captures into the next day's session")
	rollover := fs.Int("rollover-hour", cfg.Organize.SessionRolloverHour, "session cutoff hour 0–23 (with --group-session)")
	filterType := fs.String("filter-type", "", "filter folder label, e.g. Ha")
	filterName := fs.String("filter-name", "", "FITS FILTER value, e.g. SV220")
	filterDesc := fs.String("filter-desc", "", "FITS FILTER description (comment)")
	dryRun := fs.Bool("dry-run", false, "create the destination folders only; copy no files")
	debug := fs.Bool("debug", false, "verbose debug logging to the log file")

	var yes, version bool
	fs.BoolVar(&yes, "yes", false, "skip prompts and run non-interactively")
	fs.BoolVar(&yes, "y", false, "shorthand for --yes")
	fs.BoolVar(&version, "version", false, "print the version and exit")
	fs.BoolVar(&version, "v", false, "shorthand for --version")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return parsedArgs{Help: true}, nil
		}
		return parsedArgs{}, err
	}

	tagFilter := *filterType != "" || *filterName != "" || *filterDesc != ""

	return parsedArgs{
		Options: organize.Options{
			InputDir:            *input,
			OutputDir:           *output,
			GroupByFocal:        *groupFocal,
			GroupByDate:         *groupDate,
			GroupByFilter:       *groupFilter,
			GroupSession:        *groupSession,
			SessionRolloverHour: *rollover,
			TagFilter:           tagFilter,
			Filter: organize.FilterTag{
				Type:        *filterType,
				Name:        *filterName,
				Description: *filterDesc,
			},
		},
		DryRun:  *dryRun,
		Yes:     yes,
		Debug:   *debug,
		Version: version,
	}, nil
}
