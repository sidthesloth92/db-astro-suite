package astrofits

import (
	"strconv"
	"strings"
)

// celestialCoords resolves a frame's pointing as J2000 RA/Dec in decimal
// degrees, preferring the explicit acquisition keywords OBJCTRA/OBJCTDEC
// (sexagesimal; RA in hours, Dec in degrees), then the WCS plate-solve keywords
// CRVAL1/CRVAL2 (decimal degrees), then a bare RA/DEC pair. It returns
// ok=false when no usable, in-range pair is present so callers can fall back.
func celestialCoords(src cardSource) (ra, dec float64, ok bool) {
	// 1. OBJCTRA (hours) + OBJCTDEC (degrees) — the common capture convention.
	if rs, ds := src.str("OBJCTRA"), src.str("OBJCTDEC"); rs != "" && ds != "" {
		if rh, ok1 := parseSexagesimal(rs); ok1 {
			if dd, ok2 := parseSexagesimal(ds); ok2 {
				return normalizeRA(rh * 15), clampDec(dd), true
			}
		}
	}
	// 2. WCS CRVAL1/CRVAL2 — decimal degrees (plate-solved files).
	if r, ok1 := src.float("CRVAL1"); ok1 {
		if d, ok2 := src.float("CRVAL2"); ok2 {
			return normalizeRA(r), clampDec(d), true
		}
	}
	// 3. Bare RA/DEC — Dec in degrees; RA in hours when sexagesimal or a small
	// decimal (≤24), else already in degrees.
	if rs, ds := src.str("RA"), src.str("DEC"); rs != "" && ds != "" {
		if dd, ok2 := parseSexagesimal(ds); ok2 {
			if rv, ok1 := parseSexagesimal(rs); ok1 {
				if isSexagesimal(rs) || rv <= 24 {
					rv *= 15
				}
				return normalizeRA(rv), clampDec(dd), true
			}
		}
	}
	return 0, 0, false
}

// parseSexagesimal parses "20 58 47.0", "20:58:47", "+44 20 12", or a plain
// decimal ("314.7") into a single value in its native unit (hours or degrees,
// per the caller). The result of a sexagesimal value carries the sign of the
// leading field.
func parseSexagesimal(s string) (float64, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, false
	}
	sign := 1.0
	switch s[0] {
	case '+':
		s = s[1:]
	case '-':
		sign = -1
		s = s[1:]
	}
	fields := strings.FieldsFunc(s, func(r rune) bool {
		return r == ':' || r == ' ' || r == '\t'
	})
	if len(fields) == 0 {
		return 0, false
	}
	var val, div float64 = 0, 1
	for i, f := range fields {
		n, err := strconv.ParseFloat(f, 64)
		if err != nil {
			return 0, false
		}
		if i == 0 {
			val = n
		} else {
			div *= 60
			val += n / div
		}
	}
	return sign * val, true
}

// isSexagesimal reports whether s holds a multi-field sexagesimal value
// (separated by ':' or whitespace) rather than a single decimal number.
func isSexagesimal(s string) bool {
	s = strings.TrimSpace(s)
	if !strings.ContainsAny(s, ": \t") {
		return false
	}
	return len(strings.Fields(strings.ReplaceAll(s, ":", " "))) > 1
}

// normalizeRA wraps a right ascension into [0, 360) degrees.
func normalizeRA(deg float64) float64 {
	deg -= 360 * float64(int(deg/360))
	if deg < 0 {
		deg += 360
	}
	return deg
}

// clampDec constrains a declination to [-90, 90] degrees.
func clampDec(deg float64) float64 {
	if deg > 90 {
		return 90
	}
	if deg < -90 {
		return -90
	}
	return deg
}
