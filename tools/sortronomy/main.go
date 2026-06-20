package main

import (
	"errors"
	"fmt"
	"log/slog"
	"os"
	"runtime"

	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/config"
	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/logger"
	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/wizard"
)

var version = "dev"

// usageText is printed for -h/--help. It describes the tool and the options the
// interactive wizard collects.
const usageText = `sortronomy — organize astrophotography FITS files by camera, target, date, and filter.

Sortronomy walks a folder of .fit files, reads each file's FITS header, and copies them
into a structured tree under an output directory:
camera / focal length / target / Light|Calibration / "date - filter".
Works with any capture software that writes standard FITS headers
(ASIAIR, N.I.N.A., SharpCap, Ekos, SGP, Voyager, APT).

Usage:
  sortronomy                  Launch the interactive wizard
  sortronomy [flags]          Pre-fill the wizard from flags (still shows a review)
  sortronomy [flags] --yes    Run non-interactively — no prompts, no review
  sortronomy -h, --help       Show this help and exit
  sortronomy -v, --version    Print the version and exit

Flags (every wizard option has one):
  --input DIR        Folder of images to organize. Required to run with --yes; must exist.
  --output DIR       Where organized copies are written (blank = ./output).
  --group-focal      Group by the camera's focal length.
  --group-date       Include the capture date as a folder level in the tree. When off, all frames
                     for a target land in one folder regardless of date.
  --group-filter     File frames into per-filter subfolders (e.g. Ha/, OIII/). When off, all
                     frames for a target collect together regardless of filter.
  --group-session    Roll captures at/after the cutoff hour into the next day's session folder.
                     Only applies when --group-date is set.
  --rollover-hour N  Hour (0–23) at which a night's session starts. Frames captured at or after
                     this hour are filed under the next calendar day, so a night that crosses
                     midnight — plus any flats shot the following morning — land in one session
                     folder. Default 18. Only used when --group-session is set.
  --filter-type S    Folder label for the filter, e.g. Ha / OIII.
  --filter-name S    Value written into the FITS FILTER header of every copied file; also appended
                     as _f_<value> before the file extension (e.g. frame_0001_f_SV220.fit).
  --filter-desc S    Comment written alongside the FITS FILTER header. Optional.
  --dry-run          Create the destination folders only — copy no files.
  --yes, -y          Skip all prompts and run straight from the flags + saved config.
  --debug            Verbose debug logging to the log file.

Filter flags (--filter-type, --filter-name, --filter-desc) are for OSC cameras or relabeling a
mono filter slot. When any --filter-* flag is present, Sortronomy writes FILTER = "<name>" (with
--filter-desc as the FITS comment) into each copied file and appends _f_<name> to the filename.
With no --filter-* flag, files are filed under their own existing FITS FILTER header unchanged.
Both --filter-type and --filter-name are required when filter mode is engaged; --filter-desc is
optional. The interactive wizard prompts for these same options and confirms before doing anything.
`

func main() {
	// Persisted defaults are loaded first so they can seed the flag defaults.
	// A missing/corrupt file is non-fatal; the warning is logged once the
	// logger is open below.
	cfg, cfgErr := config.Load()

	args, err := parseArgs(os.Args[1:], cfg)
	if err != nil {
		exitUsage(err)
	}
	if args.Help {
		fmt.Print(usageText)
		return
	}
	if args.Version {
		fmt.Printf("sortronomy %s\n", version)
		return
	}

	level := slog.LevelInfo
	if args.Debug {
		level = slog.LevelDebug
	}

	// Logging is best-effort: if the log file can't be opened, fall back to a
	// discard logger and keep running — debugging support must never block use.
	log, logPath, closeLog, err := logger.Open(version, level)
	if err != nil {
		log, logPath, closeLog = logger.Discard(), "", func() error { return nil }
	}
	defer func() { _ = closeLog() }()
	if cfgErr != nil {
		log.Warn("config load failed; using defaults", "err", cfgErr)
	}
	log.Info("run start", "os", runtime.GOOS, "arch", runtime.GOARCH)

	// The banner is decoration for interactive use; --yes runs may be scripted,
	// so keep their output clean.
	if !args.Yes {
		printBanner()
	}

	var runErr error
	if args.Yes {
		runErr = wizard.RunNonInteractive(log, cfg, args.Options, args.DryRun)
	} else {
		runErr = wizard.Run(log, cfg, args.Options, args.DryRun)
	}
	if runErr != nil {
		// Invalid user input is not a crash — print it plainly, exit with a
		// usage status, and skip the crash report (there's nothing to debug).
		var usageErr *wizard.UsageError
		if errors.As(runErr, &usageErr) {
			exitUsage(runErr)
		}
		log.Error("fatal", "err", runErr)
		fmt.Fprintln(os.Stderr, "sortronomy:", runErr)
		reportError(logPath)
		os.Exit(1)
	}
}

// exitUsage prints a user-input error to stderr with a pointer to --help and
// exits with status 2. Used for bad flags and failed input validation — never
// writes a crash report.
func exitUsage(err error) {
	fmt.Fprintln(os.Stderr, "sortronomy:", err)
	fmt.Fprintln(os.Stderr, "Run 'sortronomy --help' for usage.")
	os.Exit(2)
}

// reportError saves an error report and prints actionable instructions for
// filing a bug. The report is written next to the working directory so the
// user finds it without hunting through the cache; if that fails (read-only
// dir) we fall back to the cache log path. Never fatal itself.
func reportError(logPath string) {
	if logPath == "" {
		return
	}
	const issueURL = "https://github.com/sidthesloth92/db-astro-suite/issues/new"
	if report, err := logger.WriteErrorReport(logPath); err == nil {
		fmt.Fprintf(os.Stderr, "\nAn error report was saved to:\n  %s\n", report)
		fmt.Fprintf(os.Stderr, "\nTo report this issue:\n")
		fmt.Fprintf(os.Stderr, "  1. Open a GitHub issue at %s\n", issueURL)
		fmt.Fprintf(os.Stderr, "  2. Attach the error report file above\n")
		fmt.Fprintf(os.Stderr, "  3. Describe what you were doing when the error occurred\n")
		return
	}
	fmt.Fprintf(os.Stderr, "\nA debug log was saved to:\n  %s\n", logPath)
	fmt.Fprintf(os.Stderr, "\nTo report this issue:\n")
	fmt.Fprintf(os.Stderr, "  1. Open a GitHub issue at %s\n", issueURL)
	fmt.Fprintf(os.Stderr, "  2. Attach the log file above\n")
	fmt.Fprintf(os.Stderr, "  3. Describe what you were doing when the error occurred\n")
}
