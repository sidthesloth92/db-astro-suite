package capturetime

import "time"

// SessionDate returns the folder date label ("2006-01-02") for a capture time.
//
// When groupSession is false the frame is filed under its literal capture day.
// When true the observing-night rollover applies via AdjustDate, so a night that
// crosses midnight — plus the next morning's flats — lands in one dated folder.
// A zero time returns "".
func SessionDate(t time.Time, groupSession bool, rolloverHour int) string {
	if t.IsZero() {
		return ""
	}
	if !groupSession {
		return t.Format("2006-01-02")
	}
	return AdjustDate(t, rolloverHour)
}

// AdjustDate applies the observing-night rule: a capture at or after rolloverHour
// is treated as part of the following day's session, so a long imaging night
// lands in one folder. The hour is read in whatever zone t carries — pass a
// LOCAL capture time so the cutoff matches the observer's wall clock. A zero
// time returns "".
func AdjustDate(t time.Time, rolloverHour int) string {
	if t.IsZero() {
		return ""
	}
	if t.Hour() >= rolloverHour {
		t = t.Add(24 * time.Hour)
	}
	return t.Format("2006-01-02")
}
