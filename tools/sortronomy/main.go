package main

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"

	"github.com/sidthesloth92/db-astro-suite/libs/redact"
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
  --rollover-hour N  Local-time hour (0–23) at which a night's session starts. Frames captured at
                     or after this hour are filed under the next calendar day, so a night that
                     crosses midnight — plus any flats shot the following morning — land in one
                     session folder. The local capture time is read from the filename when possible
                     (ASIAIR, N.I.N.A., SharpCap…), else the DATE-LOC header, else the UTC DATE-OBS.
                     Default 18. Only used when --group-session is set.
  --filter-type S    Folder label for the filter, e.g. Ha / OIII.
  --filter-name S    Value written into the FITS FILTER header of every copied file; also appended
                     as _f_<value> before the file extension (e.g. frame_0001_f_SV220.fit).
  --filter-desc S    Comment written alongside the FITS FILTER header. Optional.
  --dry-run          Create the destination folders only — copy no files.
  --yes, -y          Skip all prompts and run straight from the flags + saved config.
  --report           Also save the entire debug log as ./sortronomy-report.log when this run
                     finishes, whether it succeeds, fails, or is cancelled.

Filter flags (--filter-type, --filter-name, --filter-desc) are for OSC cameras or relabeling a
mono filter slot. When any --filter-* flag is present, Sortronomy writes FILTER = "<name>" (with
--filter-desc as the FITS comment) into each copied file and appends _f_<name> to the filename.
With no --filter-* flag, files are filed under their own existing FITS FILTER header unchanged.
Both --filter-type and --filter-name are required when filter mode is engaged; --filter-desc is
optional. The interactive wizard prompts for these same options and confirms before doing anything.

Every run appends a debug log in your OS cache directory. Paths under your home directory are
masked as ~ in it; paths outside your home (e.g. on external drives) appear as-is, so glance
over a report before sharing if that matters to you. If a run fails, that run's full log is
saved as sortronomy-error.log in the folder you ran the command from.
`

func main() {
	// Persisted defaults are loaded first so they can seed the flag defaults.
	// A missing/corrupt file is non-fatal; the warning is logged once the
	// logger is open below.
	cfg, cfgErr := config.Load()

	args, err := parseArgs(os.Args[1:], cfg)
	if err != nil {
		printUsageError(os.Stderr, err)
		os.Exit(2)
	}
	if args.Help {
		fmt.Print(usageText)
		return
	}
	if args.Version {
		fmt.Printf("sortronomy %s\n", version)
		return
	}

	os.Exit(run(args, cfg, cfgErr))
}

// run executes the selected flow end-to-end and returns the process exit
// code. It is separated from main so the deferred log-file close runs before
// the process exits — main must not defer anything around its os.Exit calls.
func run(args parsedArgs, cfg config.Config, cfgErr error) int {
	// Logging is best-effort: if the log file can't be opened, fall back to a
	// discard session and keep running — debugging support must never block use.
	sess, err := logger.Open(version)
	if err != nil {
		sess = logger.DiscardSession()
	}
	defer func() { _ = sess.Close() }()
	log := sess.Logger
	if cfgErr != nil {
		log.Warn("config load failed; using defaults", "err", cfgErr)
	}
	// The values here are the wizard's seed (flags + saved config); the final
	// confirmed options are logged by the organize engine as "scan start".
	log.Info("run start",
		"os", runtime.GOOS,
		"arch", runtime.GOARCH,
		"interactive", !args.Yes,
		"dryRun", args.DryRun,
		"input", args.Options.InputDir,
		"output", args.Options.OutputDir)

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

	outcome := classifyRunErr(runErr)
	if runErr != nil {
		if outcome.Report {
			log.Error("fatal", "err", runErr)
		} else {
			log.Warn("run stopped", "status", outcome.Status, "err", runErr)
		}
	}
	// Always the run's final record, so every log section closes unambiguously.
	log.Info("run end", "status", outcome.Status)

	switch outcome.Status {
	case statusOK:
		if args.Report {
			writeShareableReport(os.Stdout, sess)
		} else {
			printLogFooter(os.Stdout, sess.Path)
		}
	case statusCancelled:
		fmt.Println("Cancelled.")
		if args.Report {
			writeShareableReport(os.Stdout, sess)
		}
	case statusUsage:
		printUsageError(os.Stderr, runErr)
		if args.Report {
			writeShareableReport(os.Stderr, sess)
		}
	default: // statusError
		fmt.Fprintln(os.Stderr, "sortronomy:", runErr)
		if args.Report {
			writeShareableReport(os.Stderr, sess)
		} else {
			reportError(sess)
		}
	}
	return outcome.Code
}

// printUsageError prints a user-input error to stderr-style writer w with a
// pointer to --help. Used for bad flags and failed input validation — never
// paired with a crash report; the input just needs fixing.
func printUsageError(w io.Writer, err error) {
	fmt.Fprintln(w, "sortronomy:", err)
	fmt.Fprintln(w, "Run 'sortronomy --help' for usage.")
}

// reportError saves the entire log as sortronomy-error.log in the folder the
// command was run from and prints bug-filing instructions naming that file.
// Falls back to pointing at the cache log when the report can't be written
// (e.g. a read-only directory). Never fatal itself; a discard session (no log
// file) skips it entirely.
func reportError(sess *logger.Session) {
	if sess.Path == "" {
		return
	}
	if report, err := logger.WriteErrorReport(sess.Path); err == nil {
		fmt.Fprintf(os.Stderr, "\nAn error report was saved to:\n  %s\n", redact.Home(report))
		printIssueInstructions(os.Stderr, filepath.Base(report))
		return
	}
	fmt.Fprintf(os.Stderr, "\nA debug log was saved to:\n  %s\n", redact.Home(sess.Path))
	printIssueInstructions(os.Stderr, filepath.Base(sess.Path))
}
