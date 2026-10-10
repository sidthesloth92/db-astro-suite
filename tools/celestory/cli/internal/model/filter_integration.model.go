package model

// FilterIntegration is per-filter integration within a target or a session.
type FilterIntegration struct {
	Name    string  `json:"name"`
	Seconds float64 `json:"seconds"`
	Frames  int     `json:"frames"`
}

// FilterTotal is a filter total at the summary level (no frame count).
type FilterTotal struct {
	Name    string  `json:"name"`
	Seconds float64 `json:"seconds"`
}
