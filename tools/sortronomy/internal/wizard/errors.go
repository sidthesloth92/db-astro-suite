package wizard

// UsageError marks a failure caused by invalid user input — a missing or
// invalid input directory, or an incomplete filter — rather than a runtime
// fault. The CLI prints these plainly and exits with a usage status, without
// writing a crash report: there is nothing to debug, the input was wrong.
type UsageError struct {
	// Msg is the user-facing description of what was wrong.
	Msg string
	// Err is the optional underlying cause (e.g. the os.Stat error behind an
	// invalid input directory). May be nil.
	Err error
}

// Error renders the message, appending the underlying cause when present.
func (e *UsageError) Error() string {
	if e.Err != nil {
		return e.Msg + ": " + e.Err.Error()
	}
	return e.Msg
}

// Unwrap exposes the underlying cause for errors.Is / errors.As.
func (e *UsageError) Unwrap() error { return e.Err }
