// Command celestory scans a folder of astrophotography FITS captures and
// emits a per-object integration timeline + equipment breakdown (celestory.json).
// Run with no arguments for an interactive wizard, or pass -input for a
// scriptable run. Upload the resulting celestory.json to the Celestory web app to
// chart your journey. Read-only: it never modifies the scanned files.
package main

import (
	"flag"
	"fmt"
	"os"
)

// version is injected at build time via -ldflags "-X main.version=...".
var version = "dev"

// cliFlags holds the parsed command-line flags.
type cliFlags struct {
	input         string
	out           string
	rebuildCache  bool
	noCache       bool
	showConfig    bool
	verifyHash    bool
	showVersion   bool
	profile       string // configure the profile handle stamped into the story
	profileSet    bool   // whether -profile was passed (distinguishes "" from absent)
	allDuplicates bool   // report duplicates across the whole library, not just the scan
	keepDeleted   bool   // keep frames whose files were deleted from the scanned folder
	fresh         bool   // wipe the cumulative index, then rebuild from this scan
	reset         bool   // wipe the cumulative index and exit
	forget        string // drop a single root partition from the cumulative index
	assumeYes     bool   // skip the confirmation prompt for destructive operations
}

func main() {
	f := parseFlags()
	if f.showVersion {
		fmt.Println("celestory", version)
		return
	}
	if err := run(f); err != nil {
		fmt.Fprintln(os.Stderr, "celestory: "+err.Error())
		os.Exit(1)
	}
}

func parseFlags() cliFlags {
	var f cliFlags
	flag.StringVar(&f.input, "input", "", "folder of FITS captures to scan (omit to launch the wizard)")
	flag.StringVar(&f.out, "out", "", "output directory or .json file (default: current directory)")
	flag.BoolVar(&f.rebuildCache, "rebuild-cache", false, "ignore the cache and re-parse every file, then rebuild it")
	flag.BoolVar(&f.noCache, "no-cache", false, "do not read or write the scan cache")
	flag.BoolVar(&f.showConfig, "config", false, "print the output, cache, and config locations, then exit")
	flag.BoolVar(&f.verifyHash, "verify-hash", false, "detect changes by FITS-header hash instead of size+mtime")
	flag.StringVar(&f.profile, "profile", "", "set your Celestory username (pre-fills publishing; stable owner anchor)")
	flag.BoolVar(&f.allDuplicates, "all-duplicates", false, "report duplicates across your whole library, not just the scanned folder")
	flag.BoolVar(&f.keepDeleted, "keep-deleted", false, "keep frames whose files were deleted from the scanned folder (don't un-count culled subs)")
	flag.BoolVar(&f.fresh, "fresh", false, "wipe the cumulative library index, then rebuild from this scan")
	flag.BoolVar(&f.reset, "reset", false, "wipe the cumulative library index and exit (FITS files are untouched)")
	flag.StringVar(&f.forget, "forget", "", "drop a folder you no longer own from the cumulative library index")
	flag.BoolVar(&f.assumeYes, "yes", false, "skip the confirmation prompt for -reset / -fresh / -forget")
	flag.BoolVar(&f.showVersion, "v", false, "print version and exit")
	flag.BoolVar(&f.showVersion, "version", false, "print version and exit")
	flag.Parse()
	f.profileSet = wasFlagPassed("profile")
	return f
}

// wasFlagPassed reports whether the named flag was explicitly set on the command
// line (so an empty -profile "" can clear a saved handle, distinct from absent).
func wasFlagPassed(name string) bool {
	found := false
	flag.Visit(func(fl *flag.Flag) {
		if fl.Name == name {
			found = true
		}
	})
	return found
}
