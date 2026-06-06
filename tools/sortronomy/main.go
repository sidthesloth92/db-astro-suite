package main

import (
	"fmt"
	"log/slog"
	"os"
	"runtime"

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
  sortronomy                Launch the interactive wizard
  sortronomy --debug        Launch with verbose debug logging to the log file
  sortronomy -h, --help     Show this help and exit
  sortronomy -v, --version  Print the version and exit

The wizard prompts for:
  Source directory       Folder of images to organize (required, must exist).
  Output directory       Where organized copies are written (blank = ./output).
  Group by focal length  Groups pictures by the camera's focal length. Handy when you use
                         the same camera with telescopes of different focal lengths.
  Group imaging session  OFF by default — groups frames by their actual capture day.
                         When ON, groups frames captured after a cutoff hour into the next
                         day's session, so a night that crosses midnight (plus its morning
                         flats) share one dated folder. You choose the cutoff hour
                         (default 18). Helps when you want to apply the same flats to
                         images from a previous night's session.
  Set filter             Add or override the FITS FILTER header on copied files — useful for
                         OSC cameras or to set your own filter. You provide a type
                         (e.g. Ha / OIII, used as the folder label), plus the FITS filter
                         value and description. The FITS filter value is also appended as
                         _f_<value> to each copied filename.
`

func main() {
	level := slog.LevelInfo
	for _, arg := range os.Args[1:] {
		switch arg {
		case "-h", "--help":
			fmt.Print(usageText)
			return
		case "-v", "--version":
			fmt.Printf("sortronomy %s\n", version)
			return
		case "--debug":
			level = slog.LevelDebug
		}
	}

	// Logging is best-effort: if the log file can't be opened, fall back to a
	// discard logger and keep running — debugging support must never block use.
	log, logPath, closeLog, err := logger.Open(version, level)
	if err != nil {
		log, logPath, closeLog = logger.Discard(), "", func() error { return nil }
	}
	defer func() { _ = closeLog() }()
	log.Info("run start", "os", runtime.GOOS, "arch", runtime.GOARCH)

	printBanner()
	if err := wizard.Run(log); err != nil {
		log.Error("fatal", "err", err)
		fmt.Fprintln(os.Stderr, "sortronomy:", err)
		reportError(logPath)
		os.Exit(1)
	}
}

// reportError tells the user where to find the log after a failure. It drops a
// copy of the log's tail into the current working directory (so they don't have
// to hunt through the cache dir) and prints that path; if that can't be written
// — e.g. a read-only working directory — it falls back to pointing at the
// canonical cache log. A best-effort convenience; never fatal itself.
func reportError(logPath string) {
	if logPath == "" {
		return
	}
	if report, err := logger.WriteErrorReport(logPath); err == nil {
		fmt.Fprintf(os.Stderr,
			"An error report was saved to %s — please include it when reporting an issue.\n",
			report)
		return
	}
	fmt.Fprintf(os.Stderr,
		"A debug log was saved to %s — please include it when reporting an issue.\n",
		logPath)
}
