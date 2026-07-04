package astrofits

import (
	"fmt"
	"strings"

	"github.com/astrogo/fitsio"
)

// cardSource resolves header cards across one or more HDUs with synonym
// support. Lookups try every HDU in order (primary first, then extensions)
// and, within each HDU, every synonym in priority order — returning the first
// non-empty hit. This gives the "extension-HDU fallback" (only consult HDU1
// when HDU0 lacks a value) and the "keyword-synonym layer" (programs disagree
// on spellings) the resilience design calls for.
type cardSource struct {
	headers []*fitsio.Header
}

// str returns the first non-empty string value found for any of keys.
func (c cardSource) str(keys ...string) string {
	for _, h := range c.headers {
		for _, k := range keys {
			if v := strings.TrimSpace(stringCard(h, k)); v != "" {
				return v
			}
		}
	}
	return ""
}

// float returns the first parseable float value found for any of keys.
func (c cardSource) float(keys ...string) (float64, bool) {
	for _, h := range c.headers {
		for _, k := range keys {
			if v, ok := floatCard(h, k); ok {
				return v, true
			}
		}
	}
	return 0, false
}

// intval returns the first parseable integer value found for any of keys.
func (c cardSource) intval(keys ...string) (int, bool) {
	if v, ok := c.float(keys...); ok {
		return int(v), true
	}
	return 0, false
}

func stringCard(hdr *fitsio.Header, key string) string {
	c := hdr.Get(key)
	if c == nil || c.Value == nil {
		return ""
	}
	switch v := c.Value.(type) {
	case string:
		return v
	default:
		return fmt.Sprintf("%v", v)
	}
}

func floatCard(hdr *fitsio.Header, key string) (float64, bool) {
	c := hdr.Get(key)
	if c == nil || c.Value == nil {
		return 0, false
	}
	switch v := c.Value.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case string:
		return parseFloat(v)
	}
	return 0, false
}

func parseFloat(s string) (float64, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, false
	}
	var f float64
	if _, err := fmt.Sscanf(s, "%g", &f); err != nil {
		return 0, false
	}
	return f, true
}

