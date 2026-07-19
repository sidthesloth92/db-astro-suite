package main

import (
	"errors"

	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/wizard"
)

// Run statuses recorded on the "run end" log line and switched on in run().
const (
	statusOK        = "ok"
	statusError     = "error"
	statusUsage     = "usage"
	statusCancelled = "cancelled"
)

// runOutcome describes how a finished run exits: the process exit code, the
// status recorded on the "run end" log line, and whether a crash report is
// written for the user to attach to a bug.
type runOutcome struct {
	// Code is the process exit code: 0 ok, 1 failure, 2 usage, 130 cancelled.
	Code int
	// Status labels the run's final log record: one of the status constants.
	Status string
	// Report is true when the run should drop sortronomy-error.log into the
	// working directory and print bug-filing instructions.
	Report bool
}

// classifyRunErr maps the top-level error returned by a wizard flow to its
// outcome. A cancelled form is checked first so a Ctrl-C never masquerades as
// a crash or a usage mistake.
func classifyRunErr(err error) runOutcome {
	if err == nil {
		return runOutcome{Code: 0, Status: statusOK}
	}
	if wizard.IsCancelled(err) {
		// 128+SIGINT(2): the conventional "stopped by Ctrl-C" exit code, so
		// scripts can tell a cancel apart from a failure (1) or bad flags (2).
		return runOutcome{Code: 130, Status: statusCancelled}
	}
	var usageErr *wizard.UsageError
	if errors.As(err, &usageErr) {
		return runOutcome{Code: 2, Status: statusUsage}
	}
	return runOutcome{Code: 1, Status: statusError, Report: true}
}
