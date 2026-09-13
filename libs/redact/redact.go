// Package redact masks user-identifying filesystem paths in strings destined
// for shareable artifacts such as debug logs and error reports.
//
// The contract is deliberately narrow: every occurrence of the user's home
// directory becomes "~", nothing else is altered, and nothing ever leaves the
// machine — masking only makes a file safe for the user to share by choice.
// Paths outside the home directory (e.g. /Volumes/T7) appear as-is.
//
// The package is deliberately dependency-free (standard library only) so any
// tool in the suite can reuse it.
package redact

import (
	"log/slog"
	"os"
	"runtime"
	"strings"
)

// HomeMasker rewrites occurrences of a home directory in strings to "~".
// Immutable after construction; safe for concurrent use.
type HomeMasker struct {
	home    string // native home path, e.g. /Users/jane or C:\Users\Jane
	altHome string // forward-slash variant of a backslashed (Windows) home
	fold    bool   // case-insensitive matching (Windows / macOS filesystems)
}

// NewHomeMasker builds a masker for home. caseInsensitive enables
// case-insensitive matching — pass true on platforms whose default
// filesystems are case-insensitive (Windows, macOS), where a user-typed
// case-variant spelling still resolves to the home directory and must not
// slip through unmasked. A backslashed home is always also matched in its
// forward-slash spelling. An empty home yields a masker that changes nothing.
func NewHomeMasker(home string, caseInsensitive bool) HomeMasker {
	m := HomeMasker{home: strings.TrimRight(home, `/\`), fold: caseInsensitive}
	if strings.Contains(m.home, `\`) {
		m.altHome = strings.ReplaceAll(m.home, `\`, `/`)
	}
	return m
}

// SystemMasker returns a HomeMasker for the current user's home directory,
// matching the platform's default path case-sensitivity (case-insensitive on
// Windows and macOS). ok is false when the home directory cannot be resolved;
// the returned zero masker then changes nothing.
func SystemMasker() (HomeMasker, bool) {
	home, err := os.UserHomeDir()
	if err != nil {
		return HomeMasker{}, false
	}
	fold := runtime.GOOS == "windows" || runtime.GOOS == "darwin"
	return NewHomeMasker(home, fold), true
}

// Mask returns s with every home-directory occurrence replaced by "~". A
// match counts only when the home path stands on its own: it must start the
// string or follow a delimiter (so a clone tree like
// "/Volumes/Clone/Users/jane" is left alone), and it must be followed by a
// path separator or end the path token (so a sibling directory like
// "/Users/jane2" is never mangled by home "/Users/jane"). Occurrences may
// appear anywhere in s — error messages routinely embed paths mid-string.
func (m HomeMasker) Mask(s string) string {
	if m.home == "" || s == "" {
		return s
	}
	s = m.maskOne(s, m.home)
	if m.altHome != "" {
		s = m.maskOne(s, m.altHome)
	}
	return s
}

// ReplaceAttr is a ready-made log/slog HandlerOptions.ReplaceAttr that masks
// the home directory in every record: string values (including the message)
// are masked in place, and error values (e.g. *os.PathError, which embeds
// absolute paths) are stringified and masked. Other kinds pass through
// untouched.
func (m HomeMasker) ReplaceAttr(groups []string, a slog.Attr) slog.Attr {
	v := a.Value.Resolve()
	switch v.Kind() {
	case slog.KindString:
		a.Value = slog.StringValue(m.Mask(v.String()))
	case slog.KindAny:
		if err, ok := v.Any().(error); ok {
			a.Value = slog.StringValue(m.Mask(err.Error()))
		}
	}
	return a
}

// Home returns s with the current user's home-directory prefix replaced by
// "~", for terminal display of paths the user might copy into a bug report.
// Best-effort: s is returned unchanged when the home directory is unknown.
func Home(s string) string {
	m, ok := SystemMasker()
	if !ok {
		return s
	}
	return m.Mask(s)
}

// maskOne replaces boundary-checked occurrences of one home spelling in s.
func (m HomeMasker) maskOne(s, home string) string {
	var b strings.Builder
	i := 0
	for i < len(s) {
		j := m.index(s[i:], home)
		if j < 0 {
			b.WriteString(s[i:])
			return b.String()
		}
		start := i + j
		end := start + len(home)
		if leadBoundary(s, start) && pathBoundary(s, end) {
			b.WriteString(s[i:start])
			b.WriteByte('~')
			i = end
			continue
		}
		// False hit (a longer sibling name, or the home string embedded
		// mid-path in some other tree) — emit through the first byte of the
		// match and keep scanning after it.
		b.WriteString(s[i : start+1])
		i = start + 1
	}
	return b.String()
}

// index finds sub in s, case-insensitively when fold is set. Home paths are
// short, so the folding scan's O(n·m) cost is irrelevant.
func (m HomeMasker) index(s, sub string) int {
	if !m.fold {
		return strings.Index(s, sub)
	}
	for i := 0; i+len(sub) <= len(s); i++ {
		if strings.EqualFold(s[i:i+len(sub)], sub) {
			return i
		}
	}
	return -1
}

// pathBoundary reports whether position i in s ends a path token: end of
// string, a path separator (the match extends into a deeper path), or a
// delimiter that cannot continue a directory name. Letters, digits, and
// filename punctuation mean the match was a sibling prefix (e.g. home
// "/Users/jane" inside "/Users/jane2") and must not be masked.
func pathBoundary(s string, i int) bool {
	if i >= len(s) {
		return true
	}
	switch s[i] {
	case '/', '\\', ' ', '\t', '\n', '\r', '"', '\'', ',', ';', ':', ')', ']', '}', '>':
		return true
	}
	return false
}

// leadBoundary reports whether position i in s starts a path token: start of
// string, or preceded by a delimiter that cannot be part of a path — the '='
// of a key=value attr, whitespace, quotes, or bracketing punctuation. A
// preceding path character (letter, digit, separator, dot…) means the home
// string is embedded inside some other tree (e.g. a backup volume's
// /Volumes/Clone/Users/jane mirror) and must be left exactly as it is.
func leadBoundary(s string, i int) bool {
	if i == 0 {
		return true
	}
	switch s[i-1] {
	case ' ', '\t', '\n', '\r', '"', '\'', '=', ',', ';', ':', '(', '[', '{', '<':
		return true
	}
	return false
}
