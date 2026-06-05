// Package model holds the Celestory domain types that are marshaled to the
// schema-v1 JSON contract the web UI consumes. One concept per file.
package model

// Ledger is the root document Celestory emits.
type Ledger struct {
	SchemaVersion int              `json:"schemaVersion"`
	GeneratedAt   string           `json:"generatedAt"`
	Tool          ToolInfo         `json:"tool"`
	Summary       Summary          `json:"summary"`
	Equipment     []EquipmentItem  `json:"equipment"`
	Objects       []ObjectTimeline `json:"objects"`
	Duplicates    []DuplicateSet   `json:"duplicates"`
	Skipped       []SkippedEntry   `json:"skipped"`
}

// ToolInfo records which tool/version produced the ledger.
type ToolInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// Summary is the top-level rollup powering the hero band and filter chips.
type Summary struct {
	TotalIntegrationSeconds float64         `json:"totalIntegrationSeconds"`
	ObjectCount             int             `json:"objectCount"`
	NightCount              int             `json:"nightCount"`
	LightFrameCount         int             `json:"lightFrameCount"`
	FirstLight              string          `json:"firstLight"`
	LatestSession           string          `json:"latestSession"`
	DuplicateFileCount      int             `json:"duplicateFileCount"`
	DuplicateWastedBytes    int64           `json:"duplicateWastedBytes"`
	Filters                 []FilterTotal   `json:"filters"`
	ByCategory              []CategoryStat  `json:"byCategory"`
	Activity                []ActivityEntry `json:"activity"`
}

// CategoryStat is the per-category breakdown (Galaxy, Nebula, …).
type CategoryStat struct {
	Category           string  `json:"category"`
	ObjectCount        int     `json:"objectCount"`
	IntegrationSeconds float64 `json:"integrationSeconds"`
	LightFrameCount    int     `json:"lightFrameCount"`
}

// ActivityEntry is one night of activity across all objects (global timeline).
type ActivityEntry struct {
	Date               string   `json:"date"`
	IntegrationSeconds float64  `json:"integrationSeconds"`
	LightFrameCount    int      `json:"lightFrameCount"`
	ObjectIds          []string `json:"objectIds"`
}

// DuplicateSet is one set of identical subs found at multiple paths.
type DuplicateSet struct {
	Designation string   `json:"designation"`
	DateObs     string   `json:"dateObs"`
	SizeBytes   int64    `json:"sizeBytes"`
	Paths       []string `json:"paths"`
}

// SkippedEntry records a file that could not be parsed, with the reason.
type SkippedEntry struct {
	Path   string `json:"path"`
	Reason string `json:"reason"`
}
