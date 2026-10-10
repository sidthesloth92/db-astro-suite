package main

import (
	"context"
	"errors"
)

// Run statuses recorded on the "run end" log line and switched on in run().
const (
	statusOK        = "ok"
	statusError     = "error"
	statusUsage     = "usage"
	statusCancelled = "cancelled"
)

// errCancelled marks a run the user deliberately stopped: a wizard abort
// (Esc / Ctrl-C) or a declined destructive confirmation. A mid-scan Ctrl-C
// surfaces as context.Canceled instead; classifyRunErr treats both the same.
var errCancelled = errors.New("cancelled")

// usageError marks an invalid invocation (missing input, refused unattended
// destructive op). Printed plainly with exit 2 — never paired with a crash
// report; the input just needs fixing.
type usageError struct {
	msg string
}

// Error returns the user-facing message.
func (e *usageError) Error() string { return e.msg }

// runOutcome describes how a finished run exits: the process exit code, the
// status recorded on the "run end" log line, and whether a crash report is
// written for the user to attach to a bug.
type runOutcome struct {
	// Code is the process exit code: 0 ok, 1 failure, 2 usage, 130 cancelled.
	Code int
	// Status labels the run's final log record: one of the status constants.
	Status string
	// Report is true when the run should drop celestory-error.log into the
	// working directory and print bug-filing instructions.
	Report bool
}

// classifyRunErr maps the top-level error returned by execute to its outcome.
// Cancellation is checked first so a Ctrl-C never masquerades as a crash or a
// usage mistake.
func classifyRunErr(err error) runOutcome {
	if err == nil {
		return runOutcome{Code: 0, Status: statusOK}
	}
	if errors.Is(err, errCancelled) || errors.Is(err, context.Canceled) {
		// 128+SIGINT(2): the conventional "stopped by Ctrl-C" exit code, so
		// scripts can tell a cancel apart from a failure (1) or bad flags (2).
		return runOutcome{Code: 130, Status: statusCancelled}
	}
	var usageErr *usageError
	if errors.As(err, &usageErr) {
		return runOutcome{Code: 2, Status: statusUsage}
	}
	return runOutcome{Code: 1, Status: statusError, Report: true}
}
