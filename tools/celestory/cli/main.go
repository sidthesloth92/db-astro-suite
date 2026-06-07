// Command celestory scans a folder of astrophotography FITS captures and
// emits a per-object integration-timeline + equipment ledger (ledger.json).
// Run with no arguments for an interactive wizard, or pass -input for a
// scriptable run. Upload the resulting ledger.json to the Celestory web app to
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
	input        string
	out          string
	rebuildCache bool
	noCache      bool
	showConfig   bool
	verifyHash   bool
	showVersion  bool
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
	flag.BoolVar(&f.showVersion, "v", false, "print version and exit")
	flag.BoolVar(&f.showVersion, "version", false, "print version and exit")
	flag.Parse()
	return f
}
