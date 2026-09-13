package main

import (
	"fmt"
	"io"
	"path/filepath"

	"github.com/sidthesloth92/db-astro-suite/libs/redact"
	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/logger"
)

// issueURL is where users file bug reports; printed alongside every saved
// report so the file has somewhere to go.
const issueURL = "https://github.com/sidthesloth92/db-astro-suite/issues/new"

// writeShareableReport exports the entire debug log as sortronomy-report.log
// in the current working directory and prints bug-filing instructions naming
// that file. When the session has no log (discard session), this is a no-op.
func writeShareableReport(w io.Writer, sess *logger.Session) {
	if sess.Path == "" {
		return
	}
	report, err := logger.WriteRunReport(sess.Path)
	if err != nil {
		fmt.Fprintf(w, "sortronomy: could not write the report: %v\n", err)
		return
	}
	fmt.Fprintf(w, "A shareable report was saved to:\n  %s\n", redact.Home(report))
	printIssueInstructions(w, filepath.Base(report))
}

// printIssueInstructions prints the standard bug-filing steps, naming the file
// the user should attach. Shared by the crash path (sortronomy-error.log) and
// --report (sortronomy-report.log).
func printIssueInstructions(w io.Writer, attachName string) {
	fmt.Fprintf(w, "\nTo report an issue:\n")
	fmt.Fprintf(w, "  1. Open a GitHub issue at %s\n", issueURL)
	fmt.Fprintf(w, "  2. Attach the %s file above\n", attachName)
	fmt.Fprintf(w, "  3. Describe what you were doing when the problem occurred\n")
}
