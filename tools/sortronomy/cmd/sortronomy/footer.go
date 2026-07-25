package main

import (
	"fmt"
	"io"

	"github.com/sidthesloth92/db-astro-suite/libs/cliui"
	"github.com/sidthesloth92/db-astro-suite/libs/redact"
)

// printLogFooter prints the dim one-line pointer shown at the bottom of every
// successful run: where the debug log lives, and how to export a shareable
// report when the output isn't what the user expected. No-op when logPath is
// empty (the log could not be opened this run).
func printLogFooter(w io.Writer, logPath string) {
	if logPath == "" {
		return
	}
	fmt.Fprintln(w, cliui.Dim.Render(fmt.Sprintf(
		"Log: %s · something look off? Run 'sortronomy --report' to save a shareable sortronomy-report.log in this folder.",
		redact.Home(logPath))))
}
