// Command celestory scans a folder of astrophotography FITS captures and
// emits a per-target integration timeline + equipment breakdown (celestory.json).
// Run with no arguments for an interactive wizard, or pass -input for a
// scriptable run. Upload the resulting celestory.json to the Celestory web app to
// chart your journey. Read-only: it never modifies the scanned files.
package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"runtime"

	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/config"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/library"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/logger"
)

// version is injected at build time via -ldflags "-X main.version=...".
var version = "dev"

// cliFlags holds the parsed command-line flags.
type cliFlags struct {
	input         string
	out           string
	noCache       bool
	showConfig    bool
	showVersion   bool
	profile       string // configure the profile handle stamped into the story
	profileSet    bool   // whether -profile was passed (distinguishes "" from absent)
	allDuplicates bool   // report duplicates across the whole library, not just the scan
	keepDeleted   bool   // keep frames whose files were deleted from the scanned folder
	fresh         bool   // wipe the cumulative index, then rebuild from this scan
	reset         bool   // wipe the cumulative index and the scan cache, then exit
	forget        string // drop a single root partition from the cumulative index
	assumeYes     bool   // skip the confirmation prompt for destructive operations
	report        bool   // export the debug log as ./celestory-report.log at end of run
	usage         func() // prints the flag usage; used for the missing-input hint
}

func main() {
	f := parseFlags(os.Args[1:])
	if f.showVersion {
		fmt.Println("celestory", version)
		return
	}
	if f.showConfig {
		showConfig(os.Stdout, f)
		return
	}
	os.Exit(run(f))
}

// run executes the selected flow end-to-end and returns the process exit
// code. It is separated from main so the deferred log-file close runs before
// the process exits — main must not defer anything around its os.Exit calls.
func run(f cliFlags) int {
	// Logging is best-effort: if the log file can't be opened, fall back to a
	// discard session and keep running — debugging support must never block use.
	sess, err := logger.Open(version)
	if err != nil {
		sess = logger.DiscardSession()
	}
	defer func() { _ = sess.Close() }()
	log := sess.Logger
	if _, cfgErr := config.Load(); cfgErr != nil {
		log.Warn("config load failed; using defaults", "err", cfgErr)
	}
	log.Info("run start",
		"os", runtime.GOOS,
		"arch", runtime.GOARCH,
		"mode", runMode(f),
		"input", f.input,
		"out", f.out,
		"noCache", f.noCache,
		"allDuplicates", f.allDuplicates,
		"keepDeleted", f.keepDeleted,
		"fresh", f.fresh,
		"yes", f.assumeYes,
		"report", f.report)

	runErr := execute(log, f)
	return finishRun(os.Stdout, os.Stderr, sess, f.report, runErr)
}

// finishRun classifies runErr, writes the run's closing log records, prints
// the end-of-run output (footer, cancellation, error and report files), and
// returns the process exit code. stdout/stderr are injected so the
// status × -report matrix is testable.
func finishRun(stdout, stderr io.Writer, sess *logger.Session, report bool, runErr error) int {
	log := sess.Logger
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
		if report {
			writeShareableReport(stdout, sess)
		} else {
			printLogFooter(stdout, sess.Path)
		}
	case statusCancelled:
		fmt.Fprintln(stdout, "Cancelled.")
		if report {
			writeShareableReport(stdout, sess)
		}
	case statusUsage:
		fmt.Fprintln(stderr, "celestory: "+runErr.Error())
		if report {
			writeShareableReport(stderr, sess)
		}
	default: // statusError
		fmt.Fprintln(stderr, "celestory: "+runErr.Error())
		if report {
			writeShareableReport(stderr, sess)
		} else {
			reportError(stderr, sess)
		}
	}
	return outcome.Code
}

// runMode labels what this invocation is for on the "run start" log record.
// The wizard's confirmed choices are logged separately once collected.
func runMode(f cliFlags) string {
	switch {
	case f.reset:
		return "reset"
	case f.forget != "":
		return "forget"
	case f.profileSet && f.input == "":
		return "profile"
	case f.input == "":
		return "wizard"
	default:
		return "flags"
	}
}

func parseFlags(args []string) cliFlags {
	var f cliFlags
	fs := flag.NewFlagSet("celestory", flag.ExitOnError)
	fs.StringVar(&f.input, "input", "", "folder of FITS captures to scan (omit to launch the wizard)")
	fs.StringVar(&f.out, "out", "", "output directory or .json file (default: current directory)")
	fs.BoolVar(&f.noCache, "no-cache", false, "do not read or write the scan cache")
	fs.BoolVar(&f.showConfig, "config", false, "print the output, cache, and config locations, then exit")
	fs.StringVar(&f.profile, "profile", "", "set your Celestory username (pre-fills publishing; stable owner anchor)")
	fs.BoolVar(&f.allDuplicates, "all-duplicates", false, "report duplicates across your whole library, not just the scanned folder")
	fs.BoolVar(&f.keepDeleted, "keep-deleted", false, "keep frames whose files were deleted from the scanned folder (don't un-count culled subs)")
	fs.BoolVar(&f.fresh, "fresh", false, "wipe the cumulative library index, then rebuild from this scan")
	fs.BoolVar(&f.reset, "reset", false, "wipe the cumulative library index and the scan cache, then exit (FITS files are untouched)")
	fs.StringVar(&f.forget, "forget", "", "drop a folder you no longer own from the cumulative library index")
	fs.BoolVar(&f.assumeYes, "yes", false, "skip the confirmation prompt for -reset / -fresh / -forget")
	fs.BoolVar(&f.report, "report", false, "save the entire debug log as ./celestory-report.log when this run finishes, whether it succeeds, fails, or is cancelled")
	fs.BoolVar(&f.showVersion, "v", false, "print version and exit")
	fs.BoolVar(&f.showVersion, "version", false, "print version and exit")
	fs.Usage = func() {
		fmt.Fprintln(fs.Output(), "Usage of celestory:")
		fs.PrintDefaults()
		fmt.Fprintln(fs.Output(), `
Every run appends a debug log in your OS cache directory. Paths under your home
directory are masked as ~ in it; paths outside your home (e.g. on external
drives) appear as-is, so glance over a report before sharing if that matters to
you. If a run fails, that run's full log is saved as celestory-error.log in the
folder you ran the command from.`)
	}
	// ExitOnError: a bad flag prints the error + usage and exits 2 inside Parse.
	_ = fs.Parse(args)
	f.profileSet = wasFlagPassed(fs, "profile")
	f.usage = fs.Usage
	return f
}

// wasFlagPassed reports whether the named flag was explicitly set on the command
// line (so an empty -profile "" can clear a saved handle, distinct from absent).
func wasFlagPassed(fs *flag.FlagSet, name string) bool {
	found := false
	fs.Visit(func(fl *flag.Flag) {
		if fl.Name == name {
			found = true
		}
	})
	return found
}

// showConfig prints where celestory reads and writes its files, including the
// debug log a tester would be asked to share. Log-free by design: it is a pure
// read-only info query that must never create or rotate the log file.
func showConfig(w io.Writer, f cliFlags) {
	cfgPath, _ := config.Path()
	out := f.out
	if out == "" {
		cwd, _ := os.Getwd()
		out = cwd + "  (current directory — override with -out)"
	}
	fmt.Fprintln(w, "Output location:", out)
	fmt.Fprintln(w, "Cache directory:", resolveCacheDir())
	fmt.Fprintln(w, "History index:  ", library.IndexPath(libraryDir()))
	fmt.Fprintln(w, "Config file:    ", cfgPath)
	if logPath, err := logger.DefaultLogPath(); err == nil {
		fmt.Fprintln(w, "Log file:       ", logPath)
	}
}
