package main

import (
	"fmt"
	"io"
	"path/filepath"

	"github.com/sidthesloth92/db-astro-suite/libs/redact"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/logger"
)

// issueURL is where users file bug reports; printed alongside every saved
// report so the file has somewhere to go.
const issueURL = "https://github.com/sidthesloth92/db-astro-suite/issues/new"

// writeShareableReport exports the entire debug log as celestory-report.log
// in the current working directory and prints bug-filing instructions naming
// that file. When the session has no log (discard session), this is a no-op.
func writeShareableReport(w io.Writer, sess *logger.Session) {
	if sess.Path == "" {
		return
	}
	report, err := logger.WriteRunReport(sess.Path)
	if err != nil {
		fmt.Fprintf(w, "celestory: could not write the report: %v\n", err)
		return
	}
	fmt.Fprintf(w, "A shareable report was saved to:\n  %s\n", redact.Home(report))
	printIssueInstructions(w, filepath.Base(report))
}

// printIssueInstructions prints the standard bug-filing steps, naming the file
// the user should attach. Shared by the crash path (celestory-error.log) and
// -report (celestory-report.log).
func printIssueInstructions(w io.Writer, attachName string) {
	fmt.Fprintf(w, "\nTo report an issue:\n")
	fmt.Fprintf(w, "  1. Open a GitHub issue at %s\n", issueURL)
	fmt.Fprintf(w, "  2. Attach the %s file above\n", attachName)
	fmt.Fprintf(w, "  3. Describe what you were doing when the problem occurred\n")
}

// reportError saves the entire log as celestory-error.log in the folder the
// command was run from and prints bug-filing instructions naming that file.
// Falls back to pointing at the cache log when the report can't be written
// (e.g. a read-only directory). Never fatal itself; a discard session (no log
// file) skips it entirely.
func reportError(w io.Writer, sess *logger.Session) {
	if sess.Path == "" {
		return
	}
	if report, err := logger.WriteErrorReport(sess.Path); err == nil {
		fmt.Fprintf(w, "\nAn error report was saved to:\n  %s\n", redact.Home(report))
		printIssueInstructions(w, filepath.Base(report))
		return
	}
	fmt.Fprintf(w, "\nA debug log was saved to:\n  %s\n", redact.Home(sess.Path))
	printIssueInstructions(w, filepath.Base(sess.Path))
}
