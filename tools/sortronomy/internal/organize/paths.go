package organize

import (
	"math"
	"path/filepath"
	"time"
)

// SessionDate returns the folder date label for a capture timestamp.
//
// When groupSession is false (the default), the frame is filed under its
// literal UTC capture day. When true, the "session date" rollover applies via
// AdjustDate so a night that crosses midnight — plus the next day's flats —
// lands in one dated folder.
func SessionDate(t time.Time, groupSession bool, rolloverHour int) string {
	if t.IsZero() {
		return ""
	}
	if !groupSession {
		return t.Format("2006-01-02")
	}
	return AdjustDate(t, rolloverHour)
}

// AdjustDate applies the "session date" rule: any capture timestamp at or
// after rolloverHour (in UTC, the timezone the FITS DATE-OBS standard
// mandates) is treated as part of the following day's session, so a long
// imaging night lands in one folder. Callers pick the threshold; the
// Python scripts and Sortronomy's default both use 18.
func AdjustDate(t time.Time, rolloverHour int) string {
	if t.IsZero() {
		return ""
	}
	if t.Hour() >= rolloverHour {
		t = t.Add(24 * time.Hour)
	}
	return t.Format("2006-01-02")
}

// RoundFocalUp rounds the focal length up to the next multiple of 5 mm,
// matching the Python behavior.
func RoundFocalUp(mm float64) int {
	if mm <= 0 {
		return 0
	}
	return int(math.Ceil(mm/5.0)) * 5
}

// destPath builds the absolute destination directory for a single frame.
//
// Layout:
//
//	<out>/<camera>[/<focal>]/<target or "_Calibration Frames">/<frameType>[/<date|filter|date - filter>/]
//
// focalDir is included only when groupByFocal is true and focal > 0.
// When groupByDate is true the date (and filter, if set) forms the leaf folder.
// When groupByDate is false only the filter label is used as the leaf; if there
// is no filter either, files land directly in the frameType folder.
func destPath(
	out, camera string,
	focal int,
	groupByFocal bool,
	target, frameType string,
	groupByDate bool,
	date, filterLabel string,
) string {
	parts := []string{out, camera}
	if groupByFocal && focal > 0 {
		parts = append(parts, intStr(focal))
	}
	if target == "" {
		parts = append(parts, "_Calibration Frames")
	} else {
		parts = append(parts, target)
	}
	parts = append(parts, frameType)

	var leaf string
	if groupByDate && date != "" {
		if filterLabel != "" {
			leaf = date + " - " + filterLabel
		} else {
			leaf = date
		}
	} else if filterLabel != "" {
		leaf = filterLabel
	}
	if leaf != "" {
		parts = append(parts, leaf)
	}
	return filepath.Join(parts...)
}

// intStr renders an int without strconv to keep the helper file self-contained.
func intStr(i int) string {
	if i == 0 {
		return "0"
	}
	neg := i < 0
	if neg {
		i = -i
	}
	var buf [20]byte
	pos := len(buf)
	for i > 0 {
		pos--
		buf[pos] = byte('0' + i%10)
		i /= 10
	}
	if neg {
		pos--
		buf[pos] = '-'
	}
	return string(buf[pos:])
}
